// AWS Lambda handler — routes all API requests

const fs           = require('fs');
const registry     = require('./registry');
const pdfGenerator = require('./pdfGenerator');
const storage      = require('./storage');
const docxProc     = require('./docxProcessor');
const mammoth      = require('mammoth');

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FIELD_LENGTH = 2000;
const MAX_TEXT_LENGTH  = 50000;

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

function sanitize(value) {
  if (typeof value !== 'string') return String(value ?? '');
  return value.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim();
}

function validateFields(fields) {
  const sanitized = {};
  const errors = [];
  for (const [key, value] of Object.entries(fields)) {
    const clean = sanitize(value);
    if (clean.length > MAX_FIELD_LENGTH) {
      errors.push(`Field "${key}" exceeds ${MAX_FIELD_LENGTH} characters.`);
    } else {
      sanitized[key] = clean;
    }
  }
  return { ok: errors.length === 0, fields: sanitized, errors };
}

// ── Multipart parser ──────────────────────────────────────────────────────────

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

function extractDocxFromMultipart(event) {
  const headers     = event.headers || {};
  const contentType = headers['content-type'] || headers['Content-Type'] || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
  if (!boundaryMatch) return { error: 'Missing multipart boundary' };

  const boundaryStr = boundaryMatch[1] || boundaryMatch[2];
  const rawBuffer   = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64')
    : Buffer.from(event.body || '', 'binary');

  const boundary = Buffer.from('--' + boundaryStr);
  const parts    = splitBuffer(rawBuffer, boundary);

  for (const part of parts) {
    const headerEnd = indexOfSeq(part, Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;
    const headerStr = part.slice(0, headerEnd).toString('utf8');
    if (!headerStr.includes('filename=')) continue;
    const content = part.slice(headerEnd + 4);
    return { buffer: content.slice(0, content.length - 2) };
  }
  return { error: 'No .docx file found in upload' };
}

// ── Route: GET /letter-types ──────────────────────────────────────────────────

function listLetterTypes() {
  const letterTypes = registry.getAll().map(({ id, displayName, fields }) => ({
    id, displayName, fields,
  }));
  return jsonResponse(200, { letterTypes });
}

// ── Route: GET /letters ───────────────────────────────────────────────────────

async function listLetters() {
  try {
    const letters = await storage.list();
    return jsonResponse(200, { letters: letters || [] });
  } catch (err) {
    console.error('listLetters error:', err.message);
    return jsonResponse(200, { letters: [] });
  }
}

// ── Route: POST /generate ─────────────────────────────────────────────────────
// Fills the .docx template with user fields using docxtemplater (no AI rewriting).
// Returns: { letterText, docx (base64), llmEnhanced: false }

async function generateLetter(body) {
  const { letterTypeId, fields = {} } = body || {};

  if (!letterTypeId) {
    return jsonResponse(400, { error: 'Missing required parameter: letterTypeId' });
  }

  const letterType = registry.getById(letterTypeId);
  if (!letterType) {
    return jsonResponse(400, { error: `Unknown letter type: "${letterTypeId}"` });
  }

  // Validate required fields
  const validation = validateFields(fields);
  if (!validation.ok) {
    return jsonResponse(400, { error: validation.errors.join(' ') });
  }
  const sanitizedFields = validation.fields;

  const missingFields = letterType.fields
    .filter((f) => f.required && (!sanitizedFields[f.key] || !sanitizedFields[f.key].trim()))
    .map((f) => f.label);

  if (missingFields.length > 0) {
    return jsonResponse(400, {
      error: `Please fill in the following required fields: ${missingFields.join(', ')}.`,
    });
  }

  // Check if .docx template file exists
  const docxPath = letterType.docxFile;
  console.log(`[generate] Looking for template at: ${docxPath}`);
  console.log(`[generate] File exists: ${fs.existsSync(docxPath)}`);

  if (!docxPath || !fs.existsSync(docxPath)) {
    // List what's actually in the templates/docx dir for debugging
    try {
      const docxDir = require('path').join(__dirname, 'templates', 'docx');
      const files = fs.existsSync(docxDir) ? fs.readdirSync(docxDir) : [];
      console.error(`[generate] docx dir contents: ${JSON.stringify(files)}`);
    } catch (e) { /* ignore */ }

    return jsonResponse(503, {
      error: `Template file not found for "${letterType.displayName}". Expected: ${docxPath}`,
    });
  }

  // Fill the .docx template — preserves ALL formatting, fonts, layout
  let filledDocxBuffer;
  try {
    filledDocxBuffer = docxProc.fillDocx(letterType.docxFile, sanitizedFields);
  } catch (err) {
    console.error('docxtemplater error:', err.message);
    return jsonResponse(500, { error: 'Failed to fill template: ' + err.message });
  }

  // Extract plain text for preview and storage
  const letterText = await docxProc.extractText(filledDocxBuffer);

  // Save to storage
  try {
    const pdfBuffer = await pdfGenerator.generate(letterText, false);
    await storage.save(letterTypeId, letterText, pdfBuffer);
  } catch (err) {
    console.error('Storage save error (non-fatal):', err.message);
  }

  return jsonResponse(200, {
    letterText,
    docx: filledDocxBuffer.toString('base64'),
    llmEnhanced: false,
  });
}

// ── Route: POST /download-pdf ─────────────────────────────────────────────────

async function downloadPdf(body) {
  const { letterText, isHtml = false } = body || {};

  if (!letterText) {
    return jsonResponse(400, { error: 'Missing required parameter: letterText' });
  }
  if (letterText.length > MAX_TEXT_LENGTH) {
    return jsonResponse(400, { error: `Letter text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.` });
  }

  const pdfBuffer = await pdfGenerator.generate(letterText, isHtml);
  return jsonResponse(200, { pdf: pdfBuffer.toString('base64'), filename: 'letter.pdf' });
}

// ── Route: POST /download-docx ────────────────────────────────────────────────
// Re-generates the filled .docx on demand (for the download button)

async function downloadDocx(body) {
  const { letterTypeId, fields = {} } = body || {};

  if (!letterTypeId) {
    return jsonResponse(400, { error: 'Missing letterTypeId' });
  }

  const letterType = registry.getById(letterTypeId);
  if (!letterType || !letterType.docxFile || !fs.existsSync(letterType.docxFile)) {
    return jsonResponse(404, { error: 'Template file not found' });
  }

  const validation = validateFields(fields);
  const sanitizedFields = validation.fields;

  try {
    const filledDocx = docxProc.fillDocx(letterType.docxFile, sanitizedFields);
    return jsonResponse(200, {
      docx: filledDocx.toString('base64'),
      filename: `${letterTypeId}.docx`,
    });
  } catch (err) {
    return jsonResponse(500, { error: 'Failed to generate .docx: ' + err.message });
  }
}

// ── Route: POST /edit-letter ──────────────────────────────────────────────────

async function editLetter(body) {
  const { letterText, instruction } = body || {};

  if (!letterText) return jsonResponse(400, { error: 'Missing required parameter: letterText' });
  if (!instruction || !instruction.trim()) {
    return jsonResponse(400, { error: 'Missing required parameter: instruction' });
  }
  if (letterText.length > MAX_TEXT_LENGTH) {
    return jsonResponse(400, { error: `Letter text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.` });
  }
  if (instruction.length > 500) {
    return jsonResponse(400, { error: 'Instruction exceeds 500 characters.' });
  }

  const cleanInstruction = sanitize(instruction);
  const edited = await callLLM(
    `You are a professional business writing expert. Edit the letter below according to the user's instruction.
Rules:
- Apply ONLY the requested change
- Keep all original facts, names, dates, and details intact
- Maintain proper business letter formatting
- Return ONLY the edited letter text, no commentary`,
    `Instruction: ${cleanInstruction}\n\nLetter:\n${letterText}`
  );

  if (!edited) {
    return jsonResponse(503, { error: 'AI editing is currently unavailable. Please try again.' });
  }

  return jsonResponse(200, { letterText: edited });
}

// ── Route: POST /analyze-docx ─────────────────────────────────────────────────
// AI detects placeholder fields ONLY — does NOT rewrite or change any content.
// Returns: { docxBase64, fields[] }

async function analyzeDocx(event) {
  const extracted = extractDocxFromMultipart(event);
  if (extracted.error) {
    return jsonResponse(400, { error: extracted.error });
  }

  const docxBuffer = extracted.buffer;
  if (!docxBuffer || docxBuffer.length === 0) {
    return jsonResponse(400, { error: 'No .docx file found in upload.' });
  }

  // Extract plain text for AI field detection
  let plainText;
  try {
    plainText = await docxProc.extractText(docxBuffer);
  } catch (err) {
    return jsonResponse(400, { error: 'Failed to read .docx file: ' + err.message });
  }

  if (!plainText) {
    return jsonResponse(400, { error: 'The uploaded document appears to be empty.' });
  }

  // Also scan for existing {placeholder} tokens in the docx XML
  const existingPlaceholders = docxProc.extractPlaceholders(docxBuffer);

  // AI detects what information needs to be filled in
  const fields = await detectFields(plainText, existingPlaceholders);

  // Return the original docx as base64 so frontend can send it back for filling
  return jsonResponse(200, {
    docxBase64: docxBuffer.toString('base64'),
    plainText,
    fields,
  });
}

// ── Route: POST /fill-docx ────────────────────────────────────────────────────
// Takes the original .docx (base64) + user-filled fields.
// Fills placeholders using docxtemplater — ZERO AI rewriting, preserves all formatting.

async function fillDocx(body) {
  const { docxBase64, fields = {} } = body || {};

  if (!docxBase64) return jsonResponse(400, { error: 'Missing docxBase64 — please re-upload your document.' });

  const docxBuffer = Buffer.from(docxBase64, 'base64');
  const validation = validateFields(fields);
  const sanitizedFields = validation.fields;

  let filledDocxBuffer;
  try {
    filledDocxBuffer = docxProc.fillDocx(docxBuffer, sanitizedFields);
  } catch (err) {
    console.error('fillDocx error:', err.message);
    return jsonResponse(500, { error: 'Failed to fill document: ' + err.message });
  }

  const letterText = await docxProc.extractText(filledDocxBuffer);

  return jsonResponse(200, {
    letterText,
    docx: filledDocxBuffer.toString('base64'),
    llmEnhanced: false,
  });
}

// ── Route: POST /enhance-docx (legacy — kept for backward compat) ─────────────
// If docxBase64 is present, use fill-docx pipeline.
// If only extractedText is present (old flow), do a simple text substitution.

async function enhanceDocx(body) {
  const { docxBase64, extractedText, fields = {} } = body || {};

  // New flow — has the original docx
  if (docxBase64) {
    return fillDocx(body);
  }

  // Legacy fallback — no docx, just plain text substitution (no AI rewriting)
  if (!extractedText) return jsonResponse(400, { error: 'Missing extractedText or docxBase64' });

  const validation = validateFields(fields);
  const sanitizedFields = validation.fields;

  // Simple find-and-replace on the plain text — no AI
  let letterText = extractedText;
  for (const [key, value] of Object.entries(sanitizedFields)) {
    const patterns = [
      new RegExp(`\\{${key}\\}`, 'gi'),
      new RegExp(`\\[${key.replace(/_/g, '[_ ]')}\\]`, 'gi'),
    ];
    patterns.forEach(p => { letterText = letterText.replace(p, value); });
  }

  return jsonResponse(200, { letterText, llmEnhanced: false, isHtml: false });
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

/**
 * AI detects what fields need to be filled in the document.
 * If the docx already has {placeholder} tokens, use those directly.
 * Otherwise ask AI to identify what info is needed.
 */
async function detectFields(plainText, existingPlaceholders = []) {
  // If the docx already has {placeholder} tokens, convert them to field definitions
  if (existingPlaceholders.length > 0) {
    return existingPlaceholders.map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      required: true,
    }));
  }

  // Otherwise ask AI to identify what information needs to be filled in
  const result = await callLLM(
    `You are a document analyzer. Read this letter template and identify all the information that needs to be filled in by the user.
Look for: names, dates, organizations, positions, contact info, descriptions, and any other variable information.
DO NOT suggest changing the letter content or structure.
Return ONLY a JSON array, no explanation:
[{ "key": "snake_case_key", "label": "Human Readable Label", "required": true }]`,
    `Letter content:\n${plainText}`
  );

  if (!result) return [];
  try {
    const jsonMatch = result.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return [];
  }
}

// ── Lambda entry point ────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const method   = (event.httpMethod || event.requestContext?.http?.method || '').toUpperCase();
  const reqPath  = event.path || event.rawPath || '';

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    if (method === 'GET'  && reqPath === '/letter-types')   return listLetterTypes();
    if (method === 'GET'  && reqPath === '/letters')         return await listLetters();
    if (method === 'POST' && reqPath === '/generate')        return await generateLetter(parseBody(event));
    if (method === 'POST' && reqPath === '/download-pdf')    return await downloadPdf(parseBody(event));
    if (method === 'POST' && reqPath === '/download-docx')   return await downloadDocx(parseBody(event));
    if (method === 'POST' && reqPath === '/edit-letter')     return await editLetter(parseBody(event));
    if (method === 'POST' && reqPath === '/analyze-docx')    return await analyzeDocx(event);
    if (method === 'POST' && reqPath === '/fill-docx')       return await fillDocx(parseBody(event));
    if (method === 'POST' && reqPath === '/enhance-docx')    return await enhanceDocx(parseBody(event));

    return jsonResponse(404, { error: `Route not found: ${method} ${reqPath}` });
  } catch (err) {
    console.error('Unhandled error:', err);
    return jsonResponse(500, { error: err.message || 'Internal server error' });
  }
};

module.exports.listLetterTypes = listLetterTypes;
module.exports.generateLetter  = generateLetter;
module.exports.downloadPdf     = downloadPdf;
