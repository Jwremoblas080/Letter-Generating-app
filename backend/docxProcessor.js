// docxProcessor.js — fills .docx templates using docxtemplater (preserves all formatting)
// Supports output as .docx buffer or PDF buffer

const fs      = require('fs');
const path    = require('path');
const PizZip  = require('pizzip');
const Docxtemplater = require('docxtemplater');

/**
 * Fill a .docx template file with field values.
 * Placeholders in the .docx must be written as {placeholder_name} (single curly braces).
 * Returns the filled .docx as a Buffer.
 *
 * @param {Buffer|string} templateSource - Buffer of .docx file OR path to .docx file
 * @param {Record<string, string>} fields - Key/value pairs to substitute
 * @returns {Buffer} filled .docx buffer
 */
function fillDocx(templateSource, fields) {
  const content = Buffer.isBuffer(templateSource)
    ? templateSource
    : fs.readFileSync(templateSource);

  const zip  = new PizZip(content);
  const doc  = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Don't throw on missing tags — leave them blank
    nullGetter() { return ''; },
  });

  doc.render(fields);

  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * Extract plain text from a .docx buffer (for AI field detection).
 * Uses mammoth — does NOT modify the document.
 *
 * @param {Buffer} docxBuffer
 * @returns {Promise<string>} plain text content
 */
async function extractText(docxBuffer) {
  const mammoth = require('mammoth');
  const result  = await mammoth.extractRawText({ buffer: docxBuffer });
  return result.value.trim();
}

/**
 * Extract placeholder keys from a .docx template.
 * Scans for {key} tokens in the raw XML.
 *
 * @param {Buffer|string} templateSource
 * @returns {string[]} array of placeholder keys found
 */
function extractPlaceholders(templateSource) {
  const content = Buffer.isBuffer(templateSource)
    ? templateSource
    : fs.readFileSync(templateSource);

  const zip = new PizZip(content);
  // Read the main document XML
  const xml = zip.files['word/document.xml']
    ? zip.files['word/document.xml'].asText()
    : '';

  // Match {placeholder} tokens (single curly braces, docxtemplater style)
  const matches = xml.match(/\{([^{}]+)\}/g) || [];
  const keys = [...new Set(matches.map(m => m.slice(1, -1).trim()))];
  return keys.filter(k => /^[a-zA-Z_][a-zA-Z0-9_ ]*$/.test(k));
}

/**
 * Convert a filled .docx buffer to PDF using LibreOffice (if available) or pdfkit fallback.
 * On Lambda, falls back to pdfkit plain-text rendering.
 *
 * @param {Buffer} docxBuffer
 * @param {string} plainText - fallback plain text for pdfkit
 * @returns {Promise<Buffer>} PDF buffer
 */
async function docxToPdf(docxBuffer, plainText) {
  // Try LibreOffice conversion (works locally if installed)
  try {
    const { execSync } = require('child_process');
    const os   = require('os');
    const tmp  = os.tmpdir();
    const inFile  = path.join(tmp, `letter_${Date.now()}.docx`);
    const outFile = path.join(tmp, `letter_${Date.now()}.pdf`);

    fs.writeFileSync(inFile, docxBuffer);
    execSync(`libreoffice --headless --convert-to pdf --outdir "${tmp}" "${inFile}"`, { timeout: 30000 });

    const pdfPath = inFile.replace('.docx', '.pdf');
    if (fs.existsSync(pdfPath)) {
      const pdf = fs.readFileSync(pdfPath);
      fs.unlinkSync(inFile);
      fs.unlinkSync(pdfPath);
      return pdf;
    }
  } catch {
    // LibreOffice not available — fall through to pdfkit
  }

  // Fallback: pdfkit plain text rendering
  const pdfGenerator = require('./pdfGenerator');
  return pdfGenerator.generate(plainText, false);
}

module.exports = { fillDocx, extractText, extractPlaceholders, docxToPdf };
