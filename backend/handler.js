// AWS Lambda handler — routes all API requests

const registry = require('./registry');
const templateEngine = require('./templateEngine');
const llmClient = require('./llmClient');
const pdfGenerator = require('./pdfGenerator');
const storage = require('./storage');
const mammoth = require('mammoth');

// ── Helpers ───────────────────────────────────────────────────────────────────

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    ...extra,
  };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

// ── Route: GET /letter-types ──────────────────────────────────────────────────

function listLetterTypes() {
  const letterTypes = registry.getAll().map(({ id, displayName, fields }) => ({
    id, displayName, fields,
  }));
  return jsonResponse(200, { letterTypes });
}

// ── Route: POST /generate ─────────────────────────────────────────────────────

async function generateLetter(body) {
  const { letterTypeId, fields = {} } = body || {};

  if (!letterTypeId) {
    return jsonResponse(400, { error: 'Missing required parameter: letterTypeId' });
  }

  const letterType = registry.getById(letterTypeId);
  if (!letterType) {
    return jsonResponse(400, { error: `Unknown letter type: ${letterTypeId}` });
  }

  const missingFields = letterType.fields
    .filter((f) => f.required && (!fields[f.key] || !String(fields[f.key]).trim()))
    .map((f) => f.key);

  if (missingFields.length > 0) {
    return jsonResponse(400, { error: `Missing required fields: ${missingFields.join(', ')}` });
  }

  const renderResult = templateEngine.render(letterType.template, fields);
  if (!renderResult.ok) {
    return jsonResponse(400, { error: `Unresolved placeholders: ${renderResult.missingKeys.join(', ')}` });
  }

  const rawText = renderResult.text;
  const enhanced = await llmClient.enhance(rawText);
  const llmEnhanced = enhanced !== null;
  const letterText = llmEnhanced ? enhanced : rawText;

  const pdfBuffer = await pdfGenerator.generate(letterText, false);
  await storage.save(letterTypeId, letterText, pdfBuffer);

  return jsonResponse(200, { letterText, llmEnhanced });
}

// ── Route: POST /download-pdf ─────────────────────────────────────────────────

async function downloadPdf(body) {
  const { letterText, isHtml = false } = body || {};

  if (!letterText) {
    return jsonResponse(400, { error: 'Missing required parameter: letterText' });
  }

  const pdfBuffer = await pdfGenerator.generate(letterText, isHtml);

  // Return as base64 inside JSON — avoids API Gateway binary encoding issues
  return {
    statusCode: 200,
    headers: corsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      pdf: pdfBuffer.toString('base64'),
      filename: 'letter.pdf',
    }),
  };
}

// ── Route: POST /analyze-docx ─────────────────────────────────────────────────

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
  return parts.filter((p) => p.length > 4);
}

async function analyzeDocx(event) {
  // API Gateway may lowercase headers
  const headers = event.headers || {};
  const contentType = headers['content-type'] || headers['Content-Type'] || '';

  // Extract boundary — handle quoted and unquoted forms
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
  if (!boundaryMatch) {
    console.error('Missing boundary. Content-Type:', contentType);
    return jsonResponse(400, { error: 'Missing multipart boundary. Received Content-Type: ' + contentType });
  }

  const boundaryStr = boundaryMatch[1] || boundaryMatch[2];

  // API Gateway always base64-encodes binary bodies when binaryMediaTypes is set
  let rawBuffer;
  if (event.isBase64Encoded) {
    rawBuffer = Buffer.from(event.body, 'base64');
  } else {
    rawBuffer = Buffer.from(event.body || '', 'binary');
  }

  console.log('Body length:', rawBuffer.length, 'isBase64Encoded:', event.isBase64Encoded, 'boundary:', boundaryStr);

  const boundary = Buffer.from('--' + boundaryStr);
  const parts = splitBuffer(rawBuffer, boundary);

  let docxBuffer = null;
  for (const part of parts) {
    const headerEnd = indexOfSeq(part, Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;
    const headerStr = part.slice(0, headerEnd).toString('utf8');
    if (!headerStr.includes('filename=')) continue;
    // Strip trailing \r\n from part
    const content = part.slice(headerEnd + 4);
    docxBuffer = content.slice(0, content.length - 2);
    break;
  }

  if (!docxBuffer || docxBuffer.length === 0) {
    console.error('No docx found. Parts count:', parts.length);
    return jsonResponse(400, { error: 'No .docx file found in upload. Parts found: ' + parts.length });
  }

  console.log('docxBuffer size:', docxBuffer.length);

  let extractedText;
  try {
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    extractedText = result.value.trim();
  } catch (err) {
    return jsonResponse(400, { error: 'Failed to read .docx file: ' + err.message });
  }

  if (!extractedText) {
    return jsonResponse(400, { error: 'The uploaded document appears to be empty' });
  }

  const fields = await detectFields(extractedText);
  return jsonResponse(200, { extractedText, fields });
}

// ── Route: POST /enhance-docx ─────────────────────────────────────────────────

async function enhanceDocx(body) {
  const { extractedText, fields } = body || {};
  if (!extractedText) {
    return jsonResponse(400, { error: 'Missing extractedText' });
  }

  const enhanced = await enhanceWithFields(extractedText, fields || {});
  const letterText = enhanced || extractedText;
  const llmEnhanced = enhanced !== null;
  const isHtml = llmEnhanced;

  return jsonResponse(200, { letterText, llmEnhanced, isHtml });
}

// ── AI helpers ────────────────────────────────────────────────────────────────

async function callLLM(systemPrompt, userPrompt) {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  if (['none', 'off', 'disabled'].includes(provider)) return null;

  if (provider === 'groq') {
    return (await callGroq(systemPrompt, userPrompt)) ?? (await callGemini(systemPrompt, userPrompt));
  }
  return (await callGemini(systemPrompt, userPrompt)) ?? (await callGroq(systemPrompt, userPrompt));
}

async function callGemini(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    console.error('Gemini error:', err.message);
    return null;
  }
}

async function callGroq(systemPrompt, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('Groq error:', err.message);
    return null;
  }
}

async function detectFields(letterText) {
  const result = await callLLM(
    `You are a document analyzer. Identify all placeholder tokens in this letter template that need to be filled in by the user.

Placeholders are typically written as [PLACEHOLDER NAME] or [YOUR SOMETHING] or similar bracket-style tokens.

Return ONLY a JSON array with no explanation:
[{ "key": "snake_case_key", "label": "Human Readable Label", "required": true }]

Map each placeholder to a key and label. Examples:
- [DATE] → { "key": "date", "label": "Date", "required": true }
- [RECIPIENT NAME] → { "key": "recipient_name", "label": "Recipient Name", "required": true }
- [YOUR COMPANY NAME] → { "key": "company_name", "label": "Company Name", "required": true }
- [AREA/PLACE] → { "key": "area_place", "label": "Area / Place", "required": true }
- [REASON] → { "key": "reason", "label": "Reason for Transfer", "required": true }
- [YOUR EMAIL ID] → { "key": "email", "label": "Email Address", "required": true }
- [YOUR PHONE NUMBER] → { "key": "phone", "label": "Phone Number", "required": true }
- [YOUR SIGNATURE] → { "key": "signature", "label": "Your Signature", "required": false }
- [YOUR NAME] → { "key": "your_name", "label": "Your Name", "required": true }`,
    `Letter template:\n${letterText}`
  );
  if (!result) return [];
  try {
    const match = result.match(/\[[\s\S]*?\]/g);
    // Find the JSON array specifically (not the bracket placeholders)
    const jsonMatch = result.match(/\[\s*\{[\s\S]*\}\s*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return [];
  }
}

async function enhanceWithFields(letterText, fields) {
  const fieldLines = Object.entries(fields).map(([k, v]) => `- ${k}: ${v}`).join('\n');
  return callLLM(
    `You are a document assistant. Your ONLY job is to fill in the placeholder values in the letter template.

STRICT RULES:
- Do NOT rewrite, rephrase, or change ANY part of the letter
- Do NOT add or remove any sentences, paragraphs, or words
- ONLY replace the placeholder tokens (e.g. [DATE], [RECIPIENT NAME], [YOUR COMPANY NAME], [AREA/PLACE], [REASON], [YOUR EMAIL ID], [YOUR PHONE NUMBER], [YOUR SIGNATURE], [YOUR NAME]) with the user-provided values
- Keep ALL original formatting, punctuation, capitalization, and structure exactly as-is
- If a placeholder has no matching user value, leave it as-is
- Return the complete letter with ONLY the placeholders replaced — nothing else changed`,
    `User-provided values:\n${fieldLines || '(none provided)'}\n\nLetter template (fill placeholders only):\n${letterText}`
  );
}

// ── Lambda entry point ────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const method = (event.httpMethod || event.requestContext?.http?.method || '').toUpperCase();
  const path = event.path || event.rawPath || '';

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    if (method === 'GET' && path === '/letter-types') return listLetterTypes();
    if (method === 'POST' && path === '/generate') return await generateLetter(parseBody(event));
    if (method === 'POST' && path === '/download-pdf') return await downloadPdf(parseBody(event));
    if (method === 'POST' && path === '/analyze-docx') return await analyzeDocx(event);
    if (method === 'POST' && path === '/enhance-docx') return await enhanceDocx(parseBody(event));

    return jsonResponse(404, { error: `Route not found: ${method} ${path}` });
  } catch (err) {
    console.error('Unhandled error:', err);
    return jsonResponse(500, { error: err.message || 'Internal server error' });
  }
};

// Named exports for local server and tests
module.exports.listLetterTypes = listLetterTypes;
module.exports.generateLetter = generateLetter;
module.exports.downloadPdf = downloadPdf;
