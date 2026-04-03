// Professional Letter Generator — Frontend Logic

// API base URL — points to deployed Lambda when set, falls back to local server
const API_BASE = 'https://cbgis9lan3.execute-api.us-east-1.amazonaws.com/dev';

let letterTypes = [];
let currentLetterText = '';
let currentLetterIsHtml = false;
let currentDocxBase64 = null;
let lastGenerateContext = null;
let docxExtractedText = '';
let uploadedDocxBase64 = null;

// ── DOM Elements ──────────────────────────────────────────────────────────────
const letterTypeSelect = document.getElementById('letter-type-select');
const openFormBtn = document.getElementById('open-form-btn');
const formModal = document.getElementById('form-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formContainer = document.getElementById('form-container');
const submitBtn = document.getElementById('submit-btn');
const modalTitle = document.getElementById('modal-title');

const dropZone = document.getElementById('drop-zone');
const dropZoneIdle = document.getElementById('drop-zone-idle');
const dropZoneSelected = document.getElementById('drop-zone-selected');
const fileNameDisplay = document.getElementById('file-name-display');
const fileRemoveBtn = document.getElementById('file-remove-btn');
const docxUpload = document.getElementById('docx-upload');
const analyzeBtn = document.getElementById('analyze-btn');
const docxModal = document.getElementById('docx-modal');
const closeDocxModalBtn = document.getElementById('close-docx-modal-btn');
const cancelDocxBtn = document.getElementById('cancel-docx-btn');
const docxFields = document.getElementById('docx-fields');
const enhanceBtn = document.getElementById('enhance-btn');

const previewSection = document.getElementById('preview-section');
const previewText = document.getElementById('preview-text');
const editInstruction = document.getElementById('edit-instruction');
const editBtn = document.getElementById('edit-btn');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');
const downloadBtnText = document.getElementById('download-btn-text');
const downloadDocxBtn = document.getElementById('download-docx-btn');
const regenerateBtn = document.getElementById('regenerate-btn');
const copyConfirmation = document.getElementById('copy-confirmation');
const llmNotice = document.getElementById('llm-notice');
const historyList = document.getElementById('history-list');
const refreshHistoryBtn = document.getElementById('refresh-history-btn');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const errorToast = document.getElementById('error-toast');
const errorMsg = document.getElementById('error-msg');
const successToast = document.getElementById('success-toast');
const successMsg = document.getElementById('success-msg');
const emptyState = document.getElementById('empty-state');
const mobileActionBar = document.getElementById('mobile-action-bar');
const mobileCopyBtn = document.getElementById('mobile-copy-btn');
const mobileDownloadBtn = document.getElementById('mobile-download-btn');
const mobileRegenerateBtn = document.getElementById('mobile-regenerate-btn');

// ── Step Indicator ────────────────────────────────────────────────────────────
function setStep(step) {
  const steps = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3'),
  ];
  const lines = document.querySelectorAll('.step-line');

  steps.forEach((el, i) => {
    el.classList.remove('active', 'completed');
    if (i + 1 < step) el.classList.add('completed');
    else if (i + 1 === step) el.classList.add('active');
  });

  lines.forEach((line, i) => {
    line.classList.toggle('completed', i + 1 < step);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showLoading(msg = 'Processing your request...') {
  loadingText.textContent = msg;
  loadingOverlay.style.display = 'flex';
}
function hideLoading() { loadingOverlay.style.display = 'none'; }

function showError(msg) {
  errorMsg.textContent = msg;
  errorToast.style.display = 'flex';
  setTimeout(() => { errorToast.style.display = 'none'; }, 5000);
}

function showSuccess(msg) {
  successMsg.textContent = msg;
  successToast.style.display = 'flex';
  setTimeout(() => { successToast.style.display = 'none'; }, 3500);
}

function openModal(modal) { modal.style.display = 'flex'; }
function closeModal(modal) { modal.style.display = 'none'; }

function displayPreview(letterContent, llmEnhanced, isHtml = false, docxBase64 = null) {
  currentLetterText    = letterContent;
  currentLetterIsHtml  = isHtml;
  currentDocxBase64    = docxBase64;
  if (isHtml) { previewText.innerHTML = letterContent; previewText.classList.remove('plain'); }
  else        { previewText.textContent = letterContent; previewText.classList.add('plain'); }
  llmNotice.style.display = llmEnhanced === false ? '' : 'none';
  previewSection.style.display = '';
  if (emptyState)      emptyState.style.display      = 'none';
  if (mobileActionBar) mobileActionBar.style.display = 'flex';
  if (downloadDocxBtn) downloadDocxBtn.style.display = docxBase64 ? '' : 'none';
  previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setStep(3);
  showSuccess(llmEnhanced ? '✨ Letter generated with AI enhancement!' : '📄 Letter generated successfully.');
}

// ── Edit Letter ───────────────────────────────────────────────────────────────
editBtn.addEventListener('click', async () => {
  const instruction = editInstruction.value.trim();
  if (!instruction) { showError('Please enter an edit instruction, e.g. "make it shorter".'); return; }
  if (!currentLetterText) { showError('No letter to edit. Generate a letter first.'); return; }

  showLoading('✏️ Editing your letter...');
  try {
    const res = await fetch(`${API_BASE}/edit-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letterText: currentLetterText, instruction }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'Edit failed.'); return; }
    displayPreview(data.letterText, true, currentLetterIsHtml);
    editInstruction.value = '';
    showSuccess('✏️ Letter updated!');
  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    hideLoading();
  }
});

editInstruction.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') editBtn.click();
});

// ── Letter History ────────────────────────────────────────────────────────────
async function loadHistory() {
  if (!historyList) return;
  try {
    const res = await fetch(`${API_BASE}/letters`);
    if (!res.ok) return;
    const data = await res.json();
    const letters = data.letters || [];
    if (letters.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No letters generated yet. Create your first letter above!</p>';
      return;
    }
    historyList.innerHTML = '';
    letters.slice(0, 10).forEach(letter => {
      const item = document.createElement('div');
      item.className = 'history-item';
      const date = new Date(letter.createdAt).toLocaleString();
      const typeLabel = letter.letterTypeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      item.innerHTML = `
        <div class="history-item-info">
          <span class="history-item-type">📄 ${typeLabel}</span>
          <span class="history-item-date">${date}</span>
        </div>`;
      historyList.appendChild(item);
    });
  } catch {
    if (historyList) historyList.innerHTML = '<p class="history-empty">Could not load history.</p>';
  }
}

if (refreshHistoryBtn) refreshHistoryBtn.addEventListener('click', loadHistory);

// ── Drag & Drop Upload Zone ───────────────────────────────────────────────────
function setFileSelected(file) {
  if (!file) return;
  fileNameDisplay.textContent = file.name;
  dropZoneIdle.style.display = 'none';
  dropZoneSelected.style.display = 'flex';
  analyzeBtn.disabled = false;
}

function clearFileSelection() {
  docxUpload.value = '';
  dropZoneIdle.style.display = 'block';
  dropZoneSelected.style.display = 'none';
  analyzeBtn.disabled = true;
}

docxUpload.addEventListener('change', () => {
  if (docxUpload.files[0]) setFileSelected(docxUpload.files[0]);
});

fileRemoveBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearFileSelection();
});

// Drag events
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!file.name.endsWith('.docx')) {
    showError('Only .docx files are supported.');
    return;
  }
  // Assign to file input
  const dt = new DataTransfer();
  dt.items.add(file);
  docxUpload.files = dt.files;
  setFileSelected(file);
});

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
  setStep(2);

  const totalRequired = lt.fields.filter(f => f.required).length;

  // Progress counter
  const progressBar = document.createElement('div');
  progressBar.className = 'form-progress';
  progressBar.innerHTML = `<div class="form-progress-text"><span id="form-progress-count">0</span> of <span>${totalRequired}</span> required fields completed</div><div class="form-progress-track"><div class="form-progress-fill" id="form-progress-fill" style="width:0%"></div></div>`;
  formContainer.appendChild(progressBar);

  function updateProgress() {
    const inputs = formContainer.querySelectorAll('input[name], textarea[name]');
    let filled = 0;
    inputs.forEach(inp => { if (inp.dataset.required === 'true' && inp.value.trim()) filled++; });
    const pct = totalRequired > 0 ? Math.round((filled / totalRequired) * 100) : 0;
    const countEl = document.getElementById('form-progress-count');
    const fillEl = document.getElementById('form-progress-fill');
    if (countEl) countEl.textContent = filled;
    if (fillEl) { fillEl.style.width = pct + '%'; fillEl.className = 'form-progress-fill' + (pct === 100 ? ' complete' : ''); }
  }

  lt.fields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'field-group';
    const label = document.createElement('label');
    label.htmlFor = `field-${field.key}`;
    label.textContent = field.label;
    if (field.required) { const mark = document.createElement('span'); mark.className = 'required-mark'; mark.textContent = ' *'; label.appendChild(mark); }

    let input;
    const fieldKey = field.key.toLowerCase();
    const fieldLabel = field.label.toLowerCase();
    const isTextarea = fieldKey.includes('description') || fieldKey.includes('additional') || fieldKey.includes('request');

    if (isTextarea) { input = document.createElement('textarea'); input.rows = 4; input.placeholder = `Enter ${field.label.toLowerCase()}...`; }
    else if (fieldKey.includes('date') || fieldLabel.includes('date')) { input = document.createElement('input'); input.type = 'date'; }
    else if (fieldKey.includes('time') || fieldLabel.includes('time')) { input = document.createElement('input'); input.type = 'time'; }
    else if (fieldKey.includes('email') || fieldLabel.includes('email')) { input = document.createElement('input'); input.type = 'email'; input.placeholder = 'example@email.com'; }
    else if (fieldKey.includes('phone') || fieldLabel.includes('phone')) { input = document.createElement('input'); input.type = 'tel'; input.placeholder = '+1 (555) 123-4567'; }
    else if (fieldKey.includes('participant') || fieldKey.includes('expected') || fieldKey.includes('quantity')) { input = document.createElement('input'); input.type = 'number'; input.min = '1'; input.placeholder = 'Enter number'; }
    else if (fieldKey.includes('website') || fieldKey.includes('url') || fieldKey.includes('link')) { input = document.createElement('input'); input.type = 'url'; input.placeholder = 'https://example.com'; }
    else { input = document.createElement('input'); input.type = 'text'; input.placeholder = `Enter ${field.label.toLowerCase()}`; }

    input.id = `field-${field.key}`;
    input.name = field.key;
    input.dataset.required = field.required ? 'true' : 'false';
    input.dataset.label = field.label;
    input.addEventListener('input', updateProgress);

    div.appendChild(label);
    div.appendChild(input);

    if (isTextarea) {
      const counter = document.createElement('div');
      counter.className = 'char-counter';
      counter.textContent = '0 characters';
      input.addEventListener('input', () => { const l = input.value.length; counter.textContent = `${l} character${l !== 1 ? 's' : ''}`; });
      div.appendChild(counter);
    }

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
  showLoading('✨ Generating your letter...');

  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letterTypeId, fields }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'Generation failed.'); return; }

    displayPreview(data.letterText, data.llmEnhanced, false, data.docx || null);
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

  setStep(2);
  showLoading('🔍 Analyzing your document...');

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/analyze-docx`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'Analysis failed.'); return; }

    docxExtractedText  = data.extractedText || data.plainText || '';
    uploadedDocxBase64 = data.docxBase64 || null;
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
  if (!docxExtractedText && !uploadedDocxBase64) { showError('Please analyze a document first.'); return; }

  const inputs = docxFields.querySelectorAll('input[name], textarea[name]');
  const fields = {};
  inputs.forEach(input => {
    if (input.value.trim()) fields[input.name] = input.value.trim();
  });

  closeModal(docxModal);
  showLoading('📄 Filling your document...');

  try {
    let res, data;
    if (uploadedDocxBase64) {
      res = await fetch(`${API_BASE}/fill-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docxBase64: uploadedDocxBase64, fields }),
      });
    } else {
      res = await fetch(`${API_BASE}/enhance-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedText: docxExtractedText, fields }),
      });
    }
    data = await res.json();
    if (!res.ok) { showError(data.error || 'Failed to fill document.'); return; }

    displayPreview(data.letterText, false, false, data.docx || null);
    lastGenerateContext = { type: 'docx', docxBase64: uploadedDocxBase64, extractedText: docxExtractedText, fields };
    docxUpload.value = '';
    docxExtractedText = '';
    uploadedDocxBase64 = null;
    clearFileSelection();
  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    hideLoading();
  }
});

// ── Preview Actions ───────────────────────────────────────────────────────────
regenerateBtn.addEventListener('click', async () => {
  if (!lastGenerateContext) return;

  showLoading('🔄 Regenerating your letter...');

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
    downloadBtnText.textContent = 'Generating PDF...';
    downloadBtn.disabled = true;
    showLoading('📄 Generating your PDF...');
    const res = await fetch(`${API_BASE}/download-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letterText: currentLetterText, isHtml: currentLetterIsHtml }),
    });

    const data = await res.json();
    if (!res.ok) { showError(data.error || 'PDF generation failed.'); return; }

    // Decode base64 PDF and trigger download
    const binary = atob(data.pdf);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename || 'letter.pdf';
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('📥 PDF downloaded successfully!');
  } catch (err) {
    showError('Network error: ' + err.message);
  } finally {
    hideLoading();
    downloadBtnText.textContent = 'Download PDF';
    downloadBtn.disabled = false;
  }
});

// ── Download DOCX ─────────────────────────────────────────────────────────────
if (downloadDocxBtn) {
  downloadDocxBtn.addEventListener('click', () => {
    if (!currentDocxBase64) { showError('No .docx available for this letter.'); return; }
    try {
      const binary = atob(currentDocxBase64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'letter.docx';
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('📥 DOCX downloaded successfully!');
    } catch (err) {
      showError('Failed to download DOCX: ' + err.message);
    }
  });
}

// ── Dark Mode ─────────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const themeKnob = themeToggle ? themeToggle.querySelector('.theme-toggle-knob') : null;

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  if (themeKnob) themeKnob.textContent = dark ? '☾' : '☀';
}

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(!isDark);
    localStorage.setItem('theme', !isDark ? 'dark' : 'light');
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
if (mobileCopyBtn) mobileCopyBtn.addEventListener('click', () => copyBtn.click());
if (mobileDownloadBtn) mobileDownloadBtn.addEventListener('click', () => downloadBtn.click());
if (mobileRegenerateBtn) mobileRegenerateBtn.addEventListener('click', () => regenerateBtn.click());

setStep(1);
loadLetterTypes();
loadHistory();
