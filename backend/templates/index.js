// Template Registry — built-in letter templates
// Each template references a .docx file in ./docx/
// Placeholders in the .docx files use {placeholder_name} syntax (single curly braces)

const path = require('path');

/** @type {import('../registry').LetterTypeDefinition[]} */
const templates = [
  {
    id: 'event-hosting-request',
    displayName: 'Event Hosting Request',
    docxFile: path.join(__dirname, 'docx', 'event-hosting-request.docx'),
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
    docxFile: path.join(__dirname, 'docx', 'support-request-letter.docx'),
    fields: [
      { key: 'institution_name',   label: 'Institution Name (DICT/DOST/LGU/etc.)', required: true  },
      { key: 'project_name',       label: 'Project / Event Name',                  required: true  },
      { key: 'project_description',label: 'Project Description',                   required: true  },
      { key: 'support_type',       label: 'Support Type (Technical/Financial/etc.)',required: true  },
      { key: 'resources_needed',   label: 'Resources Needed',                      required: true  },
      { key: 'organizer_name',     label: 'Organizer Name',                        required: true  },
      { key: 'organization_name',  label: 'Organization Name',                     required: true  },
      { key: 'contact_info',       label: 'Contact Info',                          required: true  },
    ],
  },
  {
    id: 'resignation-letter',
    displayName: 'Resignation Letter',
    docxFile: path.join(__dirname, 'docx', 'resignation-letter.docx'),
    fields: [
      { key: 'manager_name',      label: 'Manager / Recipient Name', required: true },
      { key: 'job_title',         label: 'Your Job Title',           required: true },
      { key: 'company_name',      label: 'Company Name',             required: true },
      { key: 'last_working_day',  label: 'Last Working Day',         required: true },
      { key: 'reason_for_leaving',label: 'Reason for Leaving',       required: true },
      { key: 'your_name',         label: 'Your Full Name',           required: true },
      { key: 'contact_info',      label: 'Contact Info',             required: true },
    ],
  },
  {
    id: 'recommendation-letter',
    displayName: 'Recommendation Letter',
    docxFile: path.join(__dirname, 'docx', 'recommendation-letter.docx'),
    fields: [
      { key: 'recipient_name',       label: 'Recipient Name',                    required: true },
      { key: 'candidate_name',       label: 'Candidate Full Name',               required: true },
      { key: 'your_relationship',    label: 'Your Relationship to Candidate',    required: true },
      { key: 'your_organization',    label: 'Your Organization',                 required: true },
      { key: 'duration',             label: 'Duration Known (e.g. 2 years)',     required: true },
      { key: 'key_strengths',        label: 'Key Strengths & Achievements',      required: true },
      { key: 'position_applied_for', label: 'Position Applied For',              required: true },
      { key: 'your_name',            label: 'Your Full Name',                    required: true },
      { key: 'your_title',           label: 'Your Title / Position',             required: true },
      { key: 'your_contact',         label: 'Your Contact Info',                 required: true },
    ],
  },
  {
    id: 'complaint-letter',
    displayName: 'Complaint Letter',
    docxFile: path.join(__dirname, 'docx', 'complaint-letter.docx'),
    fields: [
      { key: 'recipient_name',        label: 'Recipient Name / Department',    required: true },
      { key: 'complaint_subject',     label: 'Subject of Complaint',           required: true },
      { key: 'company_or_institution',label: 'Company / Institution Name',     required: true },
      { key: 'complaint_details',     label: 'Complaint Details',              required: true },
      { key: 'incident_date',         label: 'Date of Incident',               required: true },
      { key: 'impact_description',    label: 'Impact / How It Affected You',   required: true },
      { key: 'previous_attempts',     label: 'Previous Attempts to Resolve',   required: true },
      { key: 'requested_resolution',  label: 'Requested Resolution',           required: true },
      { key: 'your_name',             label: 'Your Full Name',                 required: true },
      { key: 'contact_info',          label: 'Your Contact Info',              required: true },
    ],
  },
  {
    id: 'job-application-letter',
    displayName: 'Job Application Letter',
    docxFile: path.join(__dirname, 'docx', 'job-application-letter.docx'),
    fields: [
      { key: 'hiring_manager_name', label: 'Hiring Manager Name',              required: true },
      { key: 'position_title',      label: 'Position Title',                   required: true },
      { key: 'company_name',        label: 'Company Name',                     required: true },
      { key: 'job_source',          label: 'Where You Found the Job',          required: true },
      { key: 'about_yourself',      label: 'Brief Introduction About Yourself',required: true },
      { key: 'relevant_experience', label: 'Relevant Experience & Skills',     required: true },
      { key: 'why_this_company',    label: 'Why You Want to Work Here',        required: true },
      { key: 'your_name',           label: 'Your Full Name',                   required: true },
      { key: 'contact_info',        label: 'Your Contact Info',                required: true },
    ],
  },
];

module.exports = templates;
