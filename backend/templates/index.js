// Template Registry — built-in letter templates
// .docx files are embedded as base64 buffers so they always exist in the Lambda bundle.
// Placeholders in the .docx files use {placeholder_name} syntax (single curly braces).

const fs   = require('fs');
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
  try { b64 = JSON.parse(fs.readFileSync(b64Path, 'utf8')); } catch {}
}

/** @type {import('../registry').LetterTypeDefinition[]} */
const templates = [
  {
    id: 'event-hosting-request',
    displayName: 'Event Hosting Request',
    get docxBuffer() { return loadDocx('Event-Hosting-Request.docx', b64.event); },
    fields: [
      { key: 'institution_name',      label: 'Institution Name',           required: true  },
      { key: 'facility_name',         label: 'Facility Name',              required: true  },
      { key: 'event_name',            label: 'Event Name',                 required: true  },
      { key: 'event_description',     label: 'Event Description',          required: true  },
      { key: 'event_date',            label: 'Event Date',                 required: true  },
      { key: 'event_time',            label: 'Event Time',                 required: true  },
      { key: 'expected_participants', label: 'Expected Participants',       required: true  },
      { key: 'organizer_name',        label: 'Organizer Name',             required: true  },
      { key: 'organization_name',     label: 'Organization Name',          required: true  },
      { key: 'contact_info',          label: 'Contact Info',               required: true  },
      { key: 'additional_requests',   label: 'Additional Requests',        required: false },
    ],
  },
  {
    id: 'support-request-letter',
    displayName: 'Support Request Letter',
    get docxBuffer() { return loadDocx('Support-Request-Letter.docx', b64.support); },
    fields: [
      { key: 'institution_name',    label: 'Institution Name (DICT/DOST/LGU/etc.)',  required: true },
      { key: 'project_name',        label: 'Project / Event Name',                   required: true },
      { key: 'project_description', label: 'Project Description',                    required: true },
      { key: 'support_type',        label: 'Support Type (Technical/Financial/etc.)', required: true },
      { key: 'resources_needed',    label: 'Resources Needed',                       required: true },
      { key: 'organizer_name',      label: 'Organizer Name',                         required: true },
      { key: 'organization_name',   label: 'Organization Name',                      required: true },
      { key: 'contact_info',        label: 'Contact Info',                           required: true },
    ],
  },
  {
    id: 'resignation-letter',
    displayName: 'Resignation Letter',
    get docxBuffer() { return loadDocx('resignation-letter.docx', b64.resignation); },
    fields: [
      { key: 'manager_name',       label: 'Manager / Recipient Name', required: true },
      { key: 'job_title',          label: 'Your Job Title',           required: true },
      { key: 'company_name',       label: 'Company Name',             required: true },
      { key: 'last_working_day',   label: 'Last Working Day',         required: true },
      { key: 'reason_for_leaving', label: 'Reason for Leaving',       required: true },
      { key: 'your_name',          label: 'Your Full Name',           required: true },
      { key: 'contact_info',       label: 'Contact Info',             required: true },
    ],
  },
  {
    id: 'recommendation-letter',
    displayName: 'Recommendation Letter',
    get docxBuffer() { return loadDocx('recommendation-letter.docx', b64.recommendation); },
    fields: [
      { key: 'recipient_name',       label: 'Recipient Name',                 required: true },
      { key: 'candidate_name',       label: 'Candidate Full Name',            required: true },
      { key: 'your_relationship',    label: 'Your Relationship to Candidate', required: true },
      { key: 'your_organization',    label: 'Your Organization',              required: true },
      { key: 'duration',             label: 'Duration Known (e.g. 2 years)',  required: true },
      { key: 'key_strengths',        label: 'Key Strengths & Achievements',   required: true },
      { key: 'position_applied_for', label: 'Position Applied For',           required: true },
      { key: 'your_name',            label: 'Your Full Name',                 required: true },
      { key: 'your_title',           label: 'Your Title / Position',          required: true },
      { key: 'your_contact',         label: 'Your Contact Info',              required: true },
    ],
  },
  {
    id: 'complaint-letter',
    displayName: 'Complaint Letter',
    get docxBuffer() { return loadDocx('complaint-letter.docx', b64.complaint); },
    fields: [
      { key: 'recipient_name',         label: 'Recipient Name / Department',  required: true },
      { key: 'complaint_subject',      label: 'Subject of Complaint',         required: true },
      { key: 'company_or_institution', label: 'Company / Institution Name',   required: true },
      { key: 'complaint_details',      label: 'Complaint Details',            required: true },
      { key: 'incident_date',          label: 'Date of Incident',             required: true },
      { key: 'impact_description',     label: 'Impact / How It Affected You', required: true },
      { key: 'previous_attempts',      label: 'Previous Attempts to Resolve', required: true },
      { key: 'requested_resolution',   label: 'Requested Resolution',         required: true },
      { key: 'your_name',              label: 'Your Full Name',               required: true },
      { key: 'contact_info',           label: 'Your Contact Info',            required: true },
    ],
  },
  {
    id: 'job-application-letter',
    displayName: 'Job Application Letter',
    get docxBuffer() { return loadDocx('job-application-letter.docx', b64.jobApplication); },
    fields: [
      { key: 'hiring_manager_name', label: 'Hiring Manager Name',               required: true },
      { key: 'position_title',      label: 'Position Title',                    required: true },
      { key: 'company_name',        label: 'Company Name',                      required: true },
      { key: 'job_source',          label: 'Where You Found the Job',           required: true },
      { key: 'about_yourself',      label: 'Brief Introduction About Yourself', required: true },
      { key: 'relevant_experience', label: 'Relevant Experience & Skills',      required: true },
      { key: 'why_this_company',    label: 'Why You Want to Work Here',         required: true },
      { key: 'your_name',           label: 'Your Full Name',                    required: true },
      { key: 'contact_info',        label: 'Your Contact Info',                 required: true },
    ],
  },
];

module.exports = templates;
