// Storage — saves Markdown and PDF files
// Uses /tmp in Lambda (only writable directory), or STORAGE_PATH env var locally

const fs = require('fs');
const path = require('path');

/**
 * Save a generated letter as both .md and .pdf files.
 * @param {string} letterTypeId
 * @param {string} text
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ mdPath: string, pdfPath: string }>}
 */
async function save(letterTypeId, text, pdfBuffer) {
  // Lambda only allows writes to /tmp; fall back to STORAGE_PATH or ./storage locally
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const storagePath = isLambda
    ? '/tmp/storage'
    : (process.env.STORAGE_PATH || path.join(__dirname, 'storage'));

  fs.mkdirSync(storagePath, { recursive: true });

  const base = `${letterTypeId}_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const mdPath = path.join(storagePath, `${base}.md`);
  const pdfPath = path.join(storagePath, `${base}.pdf`);

  await fs.promises.writeFile(mdPath, text, 'utf8');
  await fs.promises.writeFile(pdfPath, pdfBuffer);

  return { mdPath, pdfPath };
}

module.exports = { save };
