// PDF Generator — produces professionally formatted PDFs using pdfkit
// Works on both Lambda and local environments

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

  // Use html-pdf-node locally (Puppeteer-based, best quality)
  if (shouldRenderAsHtml && !isLambda) {
    try {
      const htmlPdf = require('html-pdf-node');
      const pdfBuffer = await htmlPdf.generatePdf(
        { content: buildHtmlPage(content) },
        { format: 'A4', margin: { top: '25mm', right: '25mm', bottom: '25mm', left: '25mm' }, printBackground: true }
      );
      return pdfBuffer;
    } catch (err) {
      console.warn('html-pdf-node failed, falling back to pdfkit:', err.message);
    }
  }

  // On Lambda: use pdfkit with rich formatting
  const plainText = shouldRenderAsHtml ? stripHtml(content) : content;
  return generateWithPdfkit(plainText);
}

/**
 * Strip HTML tags and decode basic entities to plain text.
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
 * Build a full HTML page for local pdf rendering.
 */
function buildHtmlPage(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; padding: 40px; }
    p { margin: 0 0 12pt 0; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    ul, ol { margin: 0 0 12pt 20pt; }
    li { margin-bottom: 6pt; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

/**
 * Parse plain text into structured letter segments for rich pdfkit rendering.
 * Detects: title (ALL CAPS line), date, salutation, body paragraphs, closing, signature.
 */
function parseLetterSegments(text) {
  const lines = text.split('\n');
  const segments = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      segments.push({ type: 'spacer' });
      i++;
      continue;
    }

    // ALL CAPS title (e.g. "TRANSFER REQUEST LETTER FROM ONE BRANCH TO ANOTHER")
    if (line === line.toUpperCase() && line.length > 10 && /[A-Z]/.test(line)) {
      segments.push({ type: 'title', text: line });
      i++;
      continue;
    }

    // Date line (starts with digits or common date formats)
    if (/^\d{4}-\d{2}-\d{2}|^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|^(January|February|March|April|May|June|July|August|September|October|November|December)/i.test(line)) {
      segments.push({ type: 'date', text: line });
      i++;
      continue;
    }

    // Salutation (Dear ...)
    if (/^Dear\s/i.test(line)) {
      segments.push({ type: 'salutation', text: line });
      i++;
      continue;
    }

    // Closing (Regards, Sincerely, etc.)
    if (/^(Regards|Sincerely|Yours|Best|Respectfully|Thank you)[,.]?$/i.test(line)) {
      segments.push({ type: 'closing', text: line });
      i++;
      continue;
    }

    // Signature placeholder
    if (/^\[.*signature.*\]$/i.test(line)) {
      segments.push({ type: 'signature', text: line });
      i++;
      continue;
    }

    // Regular paragraph
    segments.push({ type: 'paragraph', text: line });
    i++;
  }

  return segments;
}

/**
 * Generate a professionally formatted PDF using pdfkit.
 * Handles bold titles, proper spacing, and letter structure.
 */
function generateWithPdfkit(text) {
  const PDFDocument = require('pdfkit');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const segments = parseLetterSegments(text);
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    segments.forEach((seg) => {
      switch (seg.type) {
        case 'title':
          doc
            .font('Helvetica-Bold')
            .fontSize(13)
            .text(seg.text, { width: pageWidth, align: 'left' })
            .moveDown(1);
          break;

        case 'date':
          doc
            .font('Helvetica')
            .fontSize(11)
            .text(seg.text, { width: pageWidth })
            .moveDown(0.5);
          break;

        case 'salutation':
          doc
            .font('Helvetica')
            .fontSize(11)
            .text(seg.text, { width: pageWidth })
            .moveDown(0.5);
          break;

        case 'paragraph':
          doc
            .font('Helvetica')
            .fontSize(11)
            .text(seg.text, { width: pageWidth, align: 'justify', lineGap: 2 })
            .moveDown(0.8);
          break;

        case 'closing':
          doc
            .font('Helvetica')
            .fontSize(11)
            .text(seg.text, { width: pageWidth })
            .moveDown(2);
          break;

        case 'signature':
          doc
            .font('Helvetica')
            .fontSize(11)
            .text(seg.text, { width: pageWidth })
            .moveDown(1.5);
          break;

        case 'spacer':
          doc.moveDown(0.3);
          break;

        default:
          doc
            .font('Helvetica')
            .fontSize(11)
            .text(seg.text, { width: pageWidth })
            .moveDown(0.5);
      }
    });

    doc.end();
  });
}

module.exports = { generate };
