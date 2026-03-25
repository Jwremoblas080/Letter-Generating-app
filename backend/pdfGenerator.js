// PDF Generator — converts letter text/HTML to PDF
// Uses pdfkit for plain text (Lambda-safe, no Puppeteer needed)
// Uses html-pdf-node only when running locally (Puppeteer not available on Lambda free tier)

/**
 * Generate a PDF buffer from letter text or HTML.
 * @param {string} content - Plain text or HTML content
 * @param {boolean} isHtml - Whether content is HTML (default: false)
 * @returns {Promise<Buffer>}
 */
async function generate(content, isHtml = false) {
  const hasHtmlTags = /<[^>]+>/.test(content);
  const shouldRenderAsHtml = isHtml || hasHtmlTags;
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  // On Lambda, always use pdfkit (Puppeteer not available)
  // Locally, use html-pdf-node for HTML content to preserve formatting
  if (shouldRenderAsHtml && !isLambda) {
    try {
      const htmlPdf = require('html-pdf-node');
      const html = buildHtmlPage(content);
      const options = {
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
      };
      const pdfBuffer = await htmlPdf.generatePdf({ content: html }, options);
      return pdfBuffer;
    } catch (err) {
      console.warn('html-pdf-node failed, falling back to pdfkit:', err.message);
    }
  }

  // pdfkit fallback — strip HTML tags for clean plain text output
  const plainText = shouldRenderAsHtml ? stripHtml(content) : content;
  return generateWithPdfkit(plainText);
}

/**
 * Strip HTML tags and decode basic entities.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Build a full HTML page for pdf rendering.
 * @param {string} content
 * @returns {string}
 */
function buildHtmlPage(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      max-width: 650px;
      margin: 0 auto;
      padding: 40px;
    }
    p { margin: 0 0 12pt 0; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    ul, ol { margin: 0 0 12pt 20pt; padding: 0; }
    li { margin-bottom: 6pt; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

/**
 * Generate PDF using pdfkit (Lambda-safe).
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
function generateWithPdfkit(text) {
  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 72 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.font('Times-Roman').fontSize(12).text(text, { lineBreak: true });
    doc.end();
  });
}

module.exports = { generate };
