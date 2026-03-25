# Implementation Plan: Letter Generator App

## Overview

Implement a single-page web app with a Node.js AWS Lambda backend. The backend uses path-based routing across three endpoints, a template engine with `{{placeholder}}` substitution, optional LLM enhancement with a 30s timeout fallback, pdfkit-based PDF generation, and local file storage. The frontend is vanilla HTML/JS/CSS with dynamic form rendering driven by the registry schema.

## Tasks

- [x] 1. Set up project structure and core data types
  - Create directory layout: `frontend/` (index.html, app.js, style.css), `backend/` (handler.js, templateEngine.js, llmClient.js, pdfGenerator.js, storage.js, registry.js, templates/index.js)
  - Define `LetterTypeDefinition` and `FieldDefinition` JSDoc types in a shared comment block in `registry.js`
  - Define `RenderResult` type (`{ ok: true, text }` | `{ ok: false, missingKeys[] }`)
  - Initialize `package.json` with `pdfkit` and `fast-check` dependencies
  - _Requirements: 10.3, 11.1_

- [x] 2. Implement Template Registry and registry module
  - [x] 2.1 Create `templates/index.js` with two `LetterTypeDefinition` entries: "Event Hosting Request" and "Support Request Letter" with all fields and `{{placeholder}}` templates as specified
    - Event Hosting Request fields: institution_name, facility_name, event_name, event_description, event_date, event_time, expected_participants, organizer_name, organization_name, contact_info, additional_requests (all required)
    - Support Request Letter fields: institution_name, project_name, project_description, support_type, resources_needed, organizer_name, organization_name, contact_info (all required)
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 10.3_
  - [x] 2.2 Implement `registry.js` to load and expose the template array, with a `getById(id)` helper
    - _Requirements: 10.1, 10.2_
  - [ ]* 2.3 Write property test for registry structural completeness (Property 11)
    - **Property 11: Registry entries are structurally complete**
    - **Validates: Requirements 10.3**
  - [ ]* 2.4 Write property test for registry extensibility (Property 12)
    - **Property 12: Registry extensibility — new entry appears in API response**
    - **Validates: Requirements 10.2**

- [x] 3. Implement Template Engine
  - [x] 3.1 Implement `templateEngine.js` — `render(template, fields)` function
    - Replace all `{{key}}` tokens with corresponding values from `fields` map using a global regex
    - Perform case-sensitive key matching
    - After substitution, scan for any remaining `{{...}}` tokens and collect them as `missingKeys`
    - Return `RenderResult`: `{ ok: true, text }` if none remain, `{ ok: false, missingKeys }` otherwise
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 3.2 Write property test for placeholder substitution completeness (Property 4)
    - **Property 4: Placeholder substitution completeness**
    - **Validates: Requirements 5.1, 3.2, 4.2**
  - [ ]* 3.3 Write property test for case-sensitive placeholder matching (Property 5)
    - **Property 5: Case-sensitive placeholder matching**
    - **Validates: Requirements 5.2**
  - [ ]* 3.4 Write property test for error listing all unresolved placeholders (Property 6)
    - **Property 6: Error lists all unresolved placeholders**
    - **Validates: Requirements 5.4, 3.3, 4.3**
  - [ ]* 3.5 Write property test for template rendering idempotence (Property 7)
    - **Property 7: Template rendering is idempotent**
    - **Validates: Requirements 5.5**
  - [ ]* 3.6 Write unit tests for templateEngine
    - Empty template renders to empty string without error
    - Template with no placeholders returns template unchanged
    - _Requirements: 5.1, 5.3_

- [x] 4. Implement LLM Client
  - [x] 4.1 Implement `llmClient.js` — `enhance(text)` async function
    - Call external LLM endpoint with the letter text as prompt
    - Wrap the fetch call with `AbortController` and a 30-second timeout (`setTimeout` + `controller.abort()`)
    - On timeout or any HTTP/network error, catch the exception and return `null`
    - On success, return the enhanced text string
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 4.2 Write unit tests for llmClient timeout and error fallback
    - Mock LLM to delay >30s, verify `null` returned
    - Mock LLM to throw, verify `null` returned
    - _Requirements: 6.3_

- [x] 5. Implement PDF Generator
  - [x] 5.1 Implement `pdfGenerator.js` — `generate(text)` function using pdfkit
    - Create a `PDFDocument`, set font, margins, and line wrapping
    - Write `text` to the document and collect the output into a `Buffer` via stream
    - Return the PDF `Buffer`
    - Throw on any pdfkit error (caller handles HTTP 500)
    - _Requirements: 8.2, 8.3_
  - [ ]* 5.2 Write unit test for PDF generation failure
    - Mock pdfkit to throw, verify error propagates
    - _Requirements: 8.4_

- [x] 6. Implement Storage module
  - [x] 6.1 Implement `storage.js` — `save(letterTypeId, text, pdfBuffer)` async function
    - Call `fs.mkdirSync(storagePath, { recursive: true })` before writing
    - Generate filename base: `{letterTypeId}_{new Date().toISOString().replace(/[:.]/g, '-')}`
    - Write `{base}.md` (UTF-8 text) and `{base}.pdf` (binary buffer) using `fs.promises.writeFile`
    - Return `{ mdPath, pdfPath }` on success; throw on write failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [ ]* 6.2 Write property test for storage filename convention (Property 10)
    - **Property 10: Storage filename matches naming convention**
    - **Validates: Requirements 9.3**
  - [ ]* 6.3 Write property test for both storage files saved (Property 9)
    - **Property 9: Both storage files saved on successful generation**
    - **Validates: Requirements 9.1, 9.2**
  - [ ]* 6.4 Write unit tests for storage edge cases
    - Storage folder auto-creation: run with non-existent path, verify folder created
    - Storage write failure: mock `fs.promises.writeFile` to throw, verify error propagates
    - _Requirements: 9.4, 9.5_

- [x] 7. Implement API handler (Lambda entry point)
  - [x] 7.1 Implement `handler.js` with path-based routing
    - Export `handler(event, context)` as Lambda entry point
    - Route `GET /letter-types` → `listLetterTypes()`
    - Route `POST /generate` → `generateLetter(body)`
    - Route `POST /download-pdf` → `downloadPdf(body)`
    - Wrap all routes in a top-level try/catch returning HTTP 500 on unhandled exceptions
    - Return HTTP 400 for unknown routes or missing required parameters
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x] 7.2 Implement `listLetterTypes()` — returns registry entries (id, displayName, fields) without template text
    - _Requirements: 11.1, 1.1, 10.1_
  - [x] 7.3 Implement `generateLetter(body)` — validates input, renders template, calls LLM, saves to storage, returns `{ letterText, llmEnhanced }`
    - Validate `letterTypeId` exists in registry; return HTTP 400 if not
    - Validate all required fields are present and non-whitespace; return HTTP 400 listing missing fields
    - Call `templateEngine.render()`; return HTTP 400 if `RenderResult.ok === false`
    - Call `llmClient.enhance()`; use raw text if `null` returned, set `llmEnhanced` accordingly
    - Call `storage.save()` with letterTypeId, final text, and PDF buffer
    - _Requirements: 2.3, 2.4, 3.2, 3.3, 4.2, 4.3, 6.1, 6.2, 6.3, 9.1, 9.2, 11.2_
  - [x] 7.4 Implement `downloadPdf(body)` — accepts `{ letterText }`, calls `pdfGenerator.generate()`, returns PDF binary with correct headers
    - Set `Content-Type: application/pdf` and `Content-Disposition: attachment`
    - Return HTTP 400 if `letterText` is missing
    - _Requirements: 8.2, 8.3, 11.3_
  - [ ]* 7.5 Write property test for invalid API requests returning HTTP 400 (Property 13)
    - **Property 13: Invalid API requests return HTTP 400**
    - **Validates: Requirements 11.4**
  - [ ]* 7.6 Write unit tests for handler routing
    - `GET /letter-types` returns correct shape with all registered types
    - `POST /generate` with valid Event Hosting Request fields returns rendered text
    - `POST /generate` with valid Support Request fields returns rendered text
    - `POST /download-pdf` returns `application/pdf` with correct headers
    - Unknown letter type ID returns HTTP 400
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 8. Checkpoint — Ensure all backend tests pass
  - Run `npx jest --testPathPattern=backend` (or equivalent) and confirm all tests pass; ask the user if questions arise.

- [x] 9. Implement frontend — HTML shell and CSS
  - [x] 9.1 Create `frontend/index.html` with: letter type `<select>`, dynamic form container `<div id="form-container">`, submit button, loading indicator (hidden by default), letter preview container `<div id="preview">`, copy and download buttons, error message area
    - _Requirements: 1.1, 7.1, 7.3, 8.1_
  - [x] 9.2 Create `frontend/style.css` with layout, form styling, loading indicator, preview formatting (preserving whitespace/line breaks), and button styles
    - _Requirements: 7.2_

- [x] 10. Implement frontend — app.js
  - [x] 10.1 On page load, call `GET /letter-types` and populate the `<select>` with returned letter types
    - _Requirements: 1.1, 10.1_
  - [x] 10.2 On letter type change, clear form container and re-render form fields from the selected type's `fields` schema; mark required fields visually
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3_
  - [ ]* 10.3 Write property test for form fields matching schema (Property 1)
    - **Property 1: Form fields match schema**
    - **Validates: Requirements 1.2, 2.1**
  - [ ]* 10.4 Write property test for form cleared on letter type change (Property 2)
    - **Property 2: Form cleared on letter type change**
    - **Validates: Requirements 1.3**
  - [x] 10.5 On form submit, validate required fields client-side; display error listing missing fields if any; show loading indicator; call `POST /generate`; hide loading indicator on response
    - _Requirements: 2.3, 2.4, 6.4_
  - [ ]* 10.6 Write property test for required field validation (Property 3)
    - **Property 3: Required field validation rejects incomplete submissions**
    - **Validates: Requirements 2.3, 2.4**
  - [x] 10.7 On successful generate response, display letter preview with preserved line breaks; show copy and download buttons; show notification if `llmEnhanced: false`
    - _Requirements: 6.3, 7.1, 7.2, 7.3_
  - [ ]* 10.8 Write property test for line break preservation in preview (Property 8)
    - **Property 8: Line breaks preserved in preview**
    - **Validates: Requirements 7.2**
  - [x] 10.9 Implement copy-to-clipboard using `navigator.clipboard.writeText()`; display confirmation message on success
    - _Requirements: 7.3, 7.4_
  - [x] 10.10 Implement download PDF button: call `POST /download-pdf` with current letter text; trigger browser file download from returned binary; display error if API returns non-200
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ]* 10.11 Write unit tests for frontend interactions
    - Copy-to-clipboard: verify clipboard contains full letter text after action
    - _Requirements: 7.4_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Run the full test suite and confirm all tests pass; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 iterations each
- Each property test must include the comment tag: `// Feature: letter-generator-app, Property {N}: {property_text}`
- LLM endpoint URL should be read from an environment variable (e.g. `LLM_ENDPOINT_URL`)
- Storage folder path should be configurable via environment variable (e.g. `STORAGE_PATH`)
