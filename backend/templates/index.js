// Template Registry — built-in letter templates
// .docx files are embedded as base64 buffers so they always exist in the Lambda bundle.
// Placeholders in the .docx files use {placeholder_name} syntax (single curly braces).

const fs = require('fs');
const path = require('path');

// Load embedded docx buffers — falls back to reading from disk if available
function loadDocx(filename, base64Fallback) {
  const filePath = path.join(__dirname, 'docx', filename);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  if (base64Fallback) {
    return Buffer.from(base64Fallback, 'base64');
  }
  return null;
}

// Load base64 data (embedded at build time)
let b64 = {};
const b64Path = path.join(__dirname, 'docx-base64.json');
if (fs.existsSync(b64Path)) {
  try { b64 = JSON.parse(fs.readFileSync(b64Path, 'utf8')); } catch { }
}

/** @type {import('../registry').LetterTypeDefinition[]} */
const templates = [
  {
    id: 'event-hosting-request',
    displayName: 'Event Hosting Request',
    get docxBuffer() { return loadDocx('Event-Hosting-Request.docx', b64.event); },
    fields: [
      { key: 'institution_name', label: 'Institution Name', required: true },
      { key: 'facility_name', label: 'Facility Name', required: true },
      { key: 'event_name', label: 'Event Name', required: true },
      { key: 'event_description', label: 'Event Description', required: true },
      { key: 'event_date', label: 'Event Date', required: true },
      { key: 'date_today', label: 'Date Today', required: true },

      { key: 'event_time', label: 'Event Time', required: true },
      { key: 'expected_participants', label: 'Expected Participants', required: true },
      { key: 'organizer_name', label: 'Organizer Name', required: true },
      { key: 'organization_name', label: 'Organization Name', required: true },
      { key: 'contact_info', label: 'Contact Info', required: true },
      { key: 'additional_requests', label: 'Additional Requests', required: false },
    ],
  },
  {
    id: 'support-request-letter',
    displayName: 'Support Request Letter',
    get docxBuffer() { return loadDocx('Support-Request-Letter.docx', b64.support); },
    fields: [
      { key: 'institution_name', label: 'Institution Name (DICT/DOST/LGU/etc.)', required: true },
      { key: 'project_name', label: 'Project / Event Name', required: true },
      { key: 'project_description', label: 'Project Description', required: true },
      { key: 'support_type', label: 'Support Type (Technical/Financial/etc.)', required: true },
      { key: 'resources_needed', label: 'Resources Needed', required: true },
      { key: 'organizer_name', label: 'Organizer Name', required: true },
      { key: 'organization_name', label: 'Organization Name', required: true },
      { key: 'contact_info', label: 'Contact Info', required: true },
    ],
  },
];

module.exports = templates;
