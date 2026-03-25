// Local development server — wraps the Lambda handler in a plain Node.js HTTP server
// and serves the frontend static files.
// Usage: node backend/server.js

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const { listLetterTypes, generateLetter, downloadPdf } = require('./handler');

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
};

// ── Multipart helpers ─────────────────────────────────────────────────────────

function indexOfSeq(buf, seq, offset = 0) {
  outer: for (let i = offset; i <= buf.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (buf[i + j] !== seq[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function splitBuffer(buf, delimiter) {
  const parts = [];
  let start = 0;
  let idx;
  while ((idx = indexOfSeq(buf, delimiter, start)) !== -1) {
    parts.push(buf.slice(start, idx));
    start = idx + delimiter.length;
  }
  parts.push(buf.slice(start));
  return parts.filter(p => p.length > 4);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Route: POST /analyze-docx — extract text + detect required fields ─────────

async function handleAnalyzeDocx(req, res) {
  const rawBuffer = await readBody(req);

  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Missing multipart boundary' }));
  }

  const boundary = Buffer.from('--' + boundaryMatch[1].trim());
  const parts = splitBuffer(rawBuffer, boundary);

  let docxBuffer = null;
  for (const part of parts) {
    const headerEnd = indexOfSeq(part, Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;
    const headerStr = part.slice(0, headerEnd).toString();
    if (!headerStr.includes('filename=')) continue;
    docxBuffer = part.slice(headerEnd + 4, part.length - 2);
    break;
  }

  if (!docxBuffer) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'No .docx file found in upload' }));
  }

  let extractedText;
  try {
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    extractedText = result.value.trim();
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to read .docx file: ' + err.message }));
  }

  if (!extractedText) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'The uploaded document appears to be empty' }));
  }

  // Ask Gemini to identify what fields the user needs to fill in
  const fields = await detectFields(extractedText);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ extractedText, fields }));
}

// ── Route: POST /enhance-docx — fill fields into template + polish ────────────

async function handleEnhanceDocx(req, res) {
  const rawBuffer = await readBody(req);
  let body = {};
  try { body = JSON.parse(rawBuffer.toString()); } catch { /* ignore */ }

  const { extractedText, fields } = body;
  if (!extractedText) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Missing extractedText' }));
  }

  const enhanced = await enhanceWithFields(extractedText, fields || {});
  const letterText = enhanced || extractedText;
  const llmEnhanced = enhanced !== null;
  const isHtml = llmEnhanced; // enhanced output is HTML; fallback is plain text

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ letterText, llmEnhanced, isHtml }));
}

// ── Gemini helpers ────────────────────────────────────────────────────────────

// ── Gemini/Groq helpers ──────────────────────────────────────────────────────

async function callLLM(systemPrompt, userPrompt) {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  
  // No AI mode - return null
  if (provider === 'none' || provider === 'off' || provider === 'disabled') {
    console.log('AI enhancement disabled for docx flow');
    return null;
  }
  
  // Try primary provider
  if (provider === 'groq') {
    const result = await callGroq(systemPrompt, userPrompt);
    if (result) return result;
    // Fallback to Gemini
    return await callGemini(systemPrompt, userPrompt);
  } else {
    const result = await callGemini(systemPrompt, userPrompt);
    if (result) return result;
    // Fallback to Groq
    return await callGroq(systemPrompt, userPrompt);
  }
}

async function callGemini(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }]
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    console.error('Gemini error:', err.message);
    return null;
  }
}

async function callGroq(systemPrompt, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('Groq error:', err.message);
    return null;
  }
}

async function detectFields(letterText) {
  const systemPrompt = `Analyze this letter template and identify all the important pieces of information that a user needs to provide or fill in (such as names, dates, organizations, descriptions, etc.).

Return ONLY a JSON array of objects with this exact shape, no explanation:
[{ "key": "snake_case_key", "label": "Human Readable Label", "required": true }]`;

  const userPrompt = `Letter:\n${letterText}`;
  
  const result = await callLLM(systemPrompt, userPrompt);
  if (!result) return [];
  
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (err) {
    console.error('detectFields parse error:', err.message);
    return [];
  }
}

async function enhanceWithFields(letterText, fields) {
  const fieldLines = Object.entries(fields)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const systemPrompt = `You are a professional business writing expert. Using the letter template and the user-provided information below, produce a complete, polished, professional letter.

Rules:
- Incorporate ALL the user-provided information naturally into the letter
- Use formal business letter tone
- Keep all existing content from the template that is still relevant
- Preserve formatting: use <strong> for important terms, names, dates, and headings
- Return the letter as clean HTML using only: <p>, <strong>, <em>, <br>, <ul>, <li>
- Do NOT include <html>, <head>, <body>, or any wrapper tags
- Return ONLY the HTML letter content, no commentary`;

  const userPrompt = `User-provided information:\n${fieldLines || '(none provided)'}\n\nLetter template:\n${letterText}`;
  
  return await callLLM(systemPrompt, userPrompt);
}

// ── Route: JSON API routes ────────────────────────────────────────────────────

async function serveApi(req, res) {
  if (req.method === 'POST' && req.url === '/analyze-docx') {
    return handleAnalyzeDocx(req, res);
  }
  if (req.method === 'POST' && req.url === '/enhance-docx') {
    return handleEnhanceDocx(req, res);
  }

  let body = {};
  if (req.method === 'POST') {
    const raw = await readBody(req);
    try { body = JSON.parse(raw.toString() || '{}'); } catch { /* ignore */ }
  }

  let result;
  if (req.method === 'GET' && req.url === '/letter-types') {
    result = listLetterTypes();
  } else if (req.method === 'POST' && req.url === '/generate') {
    result = await generateLetter(body);
  } else if (req.method === 'POST' && req.url === '/download-pdf') {
    result = await downloadPdf(body);
  } else {
    result = { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };
  }

  const headers = result.headers || { 'Content-Type': 'application/json' };
  res.writeHead(result.statusCode, headers);
  if (result.isBase64Encoded) {
    res.end(Buffer.from(result.body, 'base64'));
  } else {
    res.end(result.body);
  }
}

// ── Static file server ────────────────────────────────────────────────────────

function serveStatic(req, res) {
  const filePath = path.join(FRONTEND_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

// ── Main server ───────────────────────────────────────────────────────────────

const API_ROUTES = ['/letter-types', '/generate', '/download-pdf', '/analyze-docx', '/enhance-docx'];

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (API_ROUTES.some(p => req.url === p)) {
    try { await serveApi(req, res); }
    catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Letter Generator running at http://localhost:${PORT}`);
});
