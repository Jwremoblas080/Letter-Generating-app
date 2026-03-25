// Professional Letter Generator — Frontend Logic

// API base URL — points to deployed Lambda when set, falls back to local server
const API_BASE = 'https://cbgis9lan3.execute-api.us-east-1.amazonaws.com/dev';

let letterTypes = [];
let currentLetterText = '';
let currentLetterIsHtml = false;
let lastGenerateContext = null;
let docxExtractedText = '';

// ── DOM Elements ──────────────────────────────────────────────────────────────
const letterTypeSelect = document.getElementById('letter-type-select');
const openFormBtn = document.getElementById('open-form-btn');
const formModal = document.getElementById('form-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formContainer = document.getElementById('form-container');
const submitBtn = document.getElementById('submit-btn');
const modalTitle = document.getElementById('modal-title');

const docxUpload = document.getElementById('docx-upload');
const analyzeBtn = document.getElementById('analyze-btn');
const docxModal = document.getElementById('docx-modal');
const closeDocxModalBtn = document.getElementById('close-docx-modal-btn');
const cancelDocxBtn = document.getElementById('cancel-docx-btn');
const docxFields = document.getElementById('docx-fields');
const enhanceBtn = document.getElementById('enhance-btn');

const previewSection = document.getElementById('preview-section');
const previewText = document.getElementById('preview-text');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');
const regenerateBtn = document.getElementById('regenerate-btn');
const copyConfirmation = document.getElementById('copy-confirmation');
const llmNotice = document.getElementById('llm-notice');

const loadingOverlay = document.getElementById('loading-overlay');
const errorToast = document.getElementById('error-toast');
const errorMsg = document.getElementById('error-msg');

// ── Helpers ───────────────────────────────────────────────────────────────────
function showLoading() { loadingOverlay.style.display = 'flex'; }
function hideLoading() { loadingOverlay.style.display = 'none'; }

function showError(msg) {
  errorMsg.textContent = msg;
  errorToast.style.display = 'flex';
  setTimeout(() => { errorToast.style.display = 'none'; }, 5000);
}

function openModal(modal) { modal.style.display = 'flex'; }
function closeModal(modal) { modal.style.display = 'none'; }

function displayPreview(letterContent, llmEnhanced, isHtml = false) {
  // Store original content (HTML or plain text) for PDF generation
  currentLetterText = letterContent;
  currentLetterIsHtml = isHtml;

  if (isHtml) {
    previewText.innerHTML = letterContent;
    previewText.classList.remove('plain');
  } else {
    previewText.textContent = letterContent;
    previewText.classList.add('plain');
  }

  llmNotice.style.display = llmEnhanced === false ? '' : 'none';
  previewSection.style.display = '';
  previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Load Letter Types ─────────────────────────────────────────────────────────
async function loadLetterTypes() {
  try {
    const res = await fetch(`${API_BASE}/letter-types`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    letterTypes = data.letterTypes || [];
    letterTypes.forEach(lt => {
      const opt = document.createElement('option');
      opt.value = lt.id;
      opt.textContent = lt.displayName;
      letterTypeSelect.appendChild(opt);
    });
  } catch (err) {
    showError('Failed to load letter types: ' + err.message);
  }
}

// ── Template Flow ─────────────────────────────────────────────────────────────
letterTypeSelect.addEventListener('change', () => {
  openFormBtn.disabled = !letterTypeSelect.value;
});

openFormBtn.addEventListener('click', () => {
  const letterTypeId = letterTypeSelect.value;
  if (!letterTypeId) return;

  const lt = letterTypes.find(t => t.id === letterTypeId);
  if (!lt) return;

  modalTitle.textContent = `Fill ${lt.displayName} Details`;
  formContainer.innerHTML = '';

  lt.fields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'field-group';

    const label = document.createElement('label');
    label.htmlFor = `field-${field.key}`;
    label.textContent = field.label;
    if (field.required) {
      const mark = document.createElement('span');
      mark.className = 'required-mark';
      mark.textContent = ' *';
      label.appendChild(mark);
    }

    // Smart input type detection
    let input;
    const fieldKey = field.key.toLowerCase();
    const fieldLabel = field.label.toLowerCase();
    
    // Textarea for long text fields
    if (fieldKey.includes('description') || fieldKey.includes('additional') || fieldKey.includes('request')) {
      input = document.createElement('textarea');
      input.rows = 4;
      input.placeholder = `Enter ${field.label.toLowerCase()}...`;
    } 
    // Date picker for date fields
    else if (fieldKey.includes('date') || fieldLabel.includes('date')) {
      input = document.createElement('input');
      input.type = 'date';
    } 
    // Time picker for time fields
    else if (fieldKey.includes('time') || fieldLabel.includes('time')) {
      input = document.createElement('input');
      input.type = 'time';
    } 
    // Email input for email/contact fields
    else if (fieldKey.includes('email') || fieldLabel.includes('email')) {
      input = document.createElement('input');
      input.type = 'email';
      input.placeholder = 'example@email.com';
    } 
    // Tel input for phone fields
    else if (fieldKey.includes('phone') || fieldLabel.includes('phone')) {
      input = document.createElement('input');
      input.type = 'tel';
      input.placeholder = '+1 (555) 123-4567';
    } 
    // Number input for participant/quantity fields
    else if (fieldKey.includes('participant') || fieldKey.includes('expected') || fieldKey.includes('quantity')) {
      input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.placeholder = 'Enter number';
    } 
    // URL input for website fields
    else if (fieldKey.includes('website') || fieldKey.includes('url') || fieldKey.includes('link')) {
      input = document.createElement('input');
      input.type = 'url';
      input.placeholder = 'https://example.com';
    } 
    // Default text input
    else {
      input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Enter ${field.label.toLowerCase()}`;
    }
    
    input.id = `field-${field.key}`;
    input.name = field.key;
    input.dataset.required = field.required ? 'true' : 'false';
    input.dataset.label = field.label;

    div.appendChild(label);
    div.appendChild(input);
    formContainer.appendChild(div);
  });

  openModal(formModal);
});

closeModalBtn.addEventListener('click', () => closeModal(formModal));
cancelBtn.addEventListener('click', () => closeModal(formModal));

submitBtn.addEventListener('click', async () => {
  const letterTypeId = letterTypeSelect.value;
  if (!letterTypeId) return;

  const inputs = formContainer.querySelectorAll('input[name], textarea[name]');
  const fields = {};
  const missingLabels = [];

  inputs.forEach(input => {
    fields[input.name] = input.value;
    if (input.dataset.required === 'true' && !input.value.trim()) {
      missingLabels.push(input.dataset.label);
    }
  });

  if (missingLabels.length > 0) {
    showError('Please fill in: ' + missingLabels.join(', '));
    return;
  }

  closeModal(formModal);
  showLoading();

  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letterTypeId, fields }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'Generation failed.'); return; }

    displayPreview(data.letterText, data.llmEnhanced, false);
    lastGenerateContext = { type: 'template', letterTypeId, fields };
  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    hideLoading();
  }
});

// ── Docx Flow ─────────────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  const file = docxUpload.files[0];
  if (!file) { showError('Please select a .docx file first.'); return; }
  if (!file.name.endsWith('.docx')) { showError('Only .docx files are supported.'); return; }

  showLoading();

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/analyze-docx`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'Analysis failed.'); return; }

    docxExtractedText = data.extractedText;
    docxFields.innerHTML = '';

    const fields = data.fields || [];
    if (fields.length === 0) {
      docxFields.innerHTML = '<p style="color:#6b7280;font-size:0.9rem">No specific fields detected — AI will polish the letter as-is.</p>';
    } else {
      fields.forEach(field => {
        const div = document.createElement('div');
        div.className = 'field-group';

        const label = document.createElement('label');
        label.htmlFor = `docx-field-${field.key}`;
        label.textContent = field.label;
        if (field.required) {
          const mark = document.createElement('span');
          mark.className = 'required-mark';
          mark.textContent = ' *';
          label.appendChild(mark);
        }

        // Smart input type detection (same as template form)
        let input;
        const fieldKey = field.key.toLowerCase();
        const fieldLabel = field.label.toLowerCase();
        
        // Date picker for date fields
        if (fieldKey.includes('date') || fieldLabel.includes('date')) {
          input = document.createElement('input');
          input.type = 'date';
        } 
        // Time picker for time fields
        else if (fieldKey.includes('time') || fieldLabel.includes('time')) {
          input = document.createElement('input');
          input.type = 'time';
        } 
        // Email input for email/contact fields
        else if (fieldKey.includes('email') || fieldLabel.includes('email')) {
          input = document.createElement('input');
          input.type = 'email';
          input.placeholder = 'example@email.com';
        } 
        // Tel input for phone fields
        else if (fieldKey.includes('phone') || fieldLabel.includes('phone') || fieldKey.includes('contact') && fieldLabel.includes('number')) {
          input = document.createElement('input');
          input.type = 'tel';
          input.placeholder = '+1 (555) 123-4567';
        } 
        // Number input for participant/quantity fields
        else if (fieldKey.includes('participant') || fieldKey.includes('expected') || fieldKey.includes('quantity') || fieldKey.includes('number') || fieldKey.includes('amount')) {
          input = document.createElement('input');
          input.type = 'number';
          input.min = '1';
          input.placeholder = 'Enter number';
        } 
        // URL input for website fields
        else if (fieldKey.includes('website') || fieldKey.includes('url') || fieldKey.includes('link')) {
          input = document.createElement('input');
          input.type = 'url';
          input.placeholder = 'https://example.com';
        } 
        // Textarea for description/long text fields
        else if (fieldKey.includes('description') || fieldKey.includes('detail') || fieldKey.includes('message') || fieldKey.includes('note') || fieldKey.includes('comment')) {
          input = document.createElement('textarea');
          input.rows = 4;
          input.placeholder = `Enter ${field.label.toLowerCase()}...`;
        }
        // Default text input
        else {
          input = document.createElement('input');
          input.type = 'text';
          input.placeholder = `Enter ${field.label.toLowerCase()}`;
        }
        
        input.id = `docx-field-${field.key}`;
        input.name = field.key;

        div.appendChild(label);
        div.appendChild(input);
        docxFields.appendChild(div);
      });
    }

    openModal(docxModal);
  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    hideLoading();
  }
});

closeDocxModalBtn.addEventListener('click', () => closeModal(docxModal));
cancelDocxBtn.addEventListener('click', () => closeModal(docxModal));

enhanceBtn.addEventListener('click', async () => {
  if (!docxExtractedText) { showError('Please analyze a document first.'); return; }

  const inputs = docxFields.querySelectorAll('input[name], textarea[name]');
  const fields = {};
  inputs.forEach(input => {
    if (input.value.trim()) fields[input.name] = input.value.trim();
  });

  closeModal(docxModal);
  showLoading();

  try {
    const res = await fetch(`${API_BASE}/enhance-docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extractedText: docxExtractedText, fields }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'Enhancement failed.'); return; }

    displayPreview(data.letterText, data.llmEnhanced, data.isHtml === true);
    lastGenerateContext = { type: 'docx', extractedText: docxExtractedText, fields };
    docxUpload.value = '';
    docxExtractedText = '';
  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    hideLoading();
  }
});

// ── Preview Actions ───────────────────────────────────────────────────────────
regenerateBtn.addEventListener('click', async () => {
  if (!lastGenerateContext) return;

  showLoading();

  try {
    if (lastGenerateContext.type === 'template') {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterTypeId: lastGenerateContext.letterTypeId, fields: lastGenerateContext.fields }),
      });
      const data = await res.json();
      if (!res.ok) { showError(data.error || 'Regeneration failed.'); return; }
      displayPreview(data.letterText, data.llmEnhanced, false);
    } else if (lastGenerateContext.type === 'docx') {
      const res = await fetch(`${API_BASE}/enhance-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedText: lastGenerateContext.extractedText, fields: lastGenerateContext.fields }),
      });
      const data = await res.json();
      if (!res.ok) { showError(data.error || 'Regeneration failed.'); return; }
      displayPreview(data.letterText, data.llmEnhanced, data.isHtml === true);
    }
  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    hideLoading();
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    // For copy, strip HTML tags to get plain text
    const textToCopy = currentLetterIsHtml
      ? currentLetterText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : currentLetterText;
    await navigator.clipboard.writeText(textToCopy);
    copyConfirmation.style.display = 'flex';
    setTimeout(() => { copyConfirmation.style.display = 'none'; }, 2000);
  } catch (err) {
    showError('Failed to copy: ' + err.message);
  }
});

downloadBtn.addEventListener('click', async () => {
  try {
    showLoading();
    const res = await fetch(`${API_BASE}/download-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letterText: currentLetterText, isHtml: currentLetterIsHtml }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showError(data.error || 'PDF generation failed.');
      return;
    }

    const contentType = res.headers.get('content-type') || '';
    let blob;
    if (contentType.includes('application/json')) {
      const data = await res.json();
      const base64 = data.body || data;
      const binary = atob(typeof base64 === 'string' ? base64 : '');
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blob = new Blob([bytes], { type: 'application/pdf' });
    } else {
      blob = await res.blob();
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'letter.pdf';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    hideLoading();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadLetterTypes();
