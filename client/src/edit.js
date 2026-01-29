import { API_URL } from './config.js';

// Parse URL to get id and token from hash (e.g., /edit.html#abc123/token)
const hash = window.location.hash.slice(1);
const [unitId, editToken] = hash.split('/');

const loadingEl = document.getElementById('loading');
const errorCardEl = document.getElementById('errorCard');
const editCardEl = document.getElementById('editCard');

if (!unitId || !editToken) {
  loadingEl.classList.add('hidden');
  errorCardEl.classList.remove('hidden');
  document.getElementById('errorText').textContent = 'Ungültiger Edit-Link';
} else {
  loadUnitInfo();
}

async function loadUnitInfo() {
  try {
    const response = await fetch(`${API_URL}/api/info/${unitId}`, {
      headers: {
        'X-Edit-Token': editToken
      }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Einheit nicht gefunden');
    }

    const data = await response.json();

    // Hide loading, show edit card
    loadingEl.classList.add('hidden');
    editCardEl.classList.remove('hidden');

    // Populate data
    const viewUrl = `${API_URL}/v/${unitId}`;

    document.getElementById('viewUrl').value = viewUrl;
    document.getElementById('previewFrame').src = viewUrl;

    if (data.title) {
      document.getElementById('unitTitle').textContent = data.title;
    }

    document.getElementById('fileCount').textContent = data.fileCount + ' Dateien';
    document.getElementById('fileSize').textContent = formatBytes(data.sizeBytes);
    document.getElementById('createdAt').textContent = formatDate(data.createdAt);
    document.getElementById('updatedAt').textContent = formatDate(data.updatedAt);

  } catch (error) {
    loadingEl.classList.add('hidden');
    errorCardEl.classList.remove('hidden');
    document.getElementById('errorText').textContent = error.message;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

window.copyLink = function(inputId) {
  const input = document.getElementById(inputId);
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value);

  const btn = input.nextElementSibling;
  const originalText = btn.textContent;
  btn.textContent = 'Kopiert!';
  setTimeout(() => {
    btn.textContent = originalText;
  }, 2000);
}

// Update Modal
const updateModal = document.getElementById('updateModal');
const updateDropZone = document.getElementById('updateDropZone');
const updateFileInput = document.getElementById('updateFileInput');
const updateProgressContainer = document.getElementById('updateProgressContainer');
const updateProgressFill = document.getElementById('updateProgressFill');
const updateProgressText = document.getElementById('updateProgressText');
const updateError = document.getElementById('updateError');

window.showUpdateModal = function() {
  updateModal.classList.add('visible');
  updateError.classList.add('hidden');
  updateProgressContainer.classList.remove('visible');
  updateDropZone.style.display = 'block';
}

window.hideUpdateModal = function() {
  updateModal.classList.remove('visible');
}

updateDropZone.addEventListener('click', () => updateFileInput.click());

updateFileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    uploadUpdate(e.target.files[0]);
  }
});

updateDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  updateDropZone.classList.add('drag-over');
});

updateDropZone.addEventListener('dragleave', () => {
  updateDropZone.classList.remove('drag-over');
});

updateDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  updateDropZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length > 0) {
    uploadUpdate(e.dataTransfer.files[0]);
  }
});

async function uploadUpdate(file) {
  updateError.classList.add('hidden');

  if (!file.name.endsWith('.zip') && file.type !== 'application/zip') {
    updateError.textContent = 'Bitte laden Sie eine ZIP-Datei hoch.';
    updateError.classList.remove('hidden');
    return;
  }

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    updateError.textContent = 'Die Datei ist zu gross. Maximale Groesse: 50 MB.';
    updateError.classList.remove('hidden');
    return;
  }

  updateProgressContainer.classList.add('visible');
  updateProgressFill.style.width = '0%';
  updateProgressText.textContent = 'Wird hochgeladen...';
  updateDropZone.style.display = 'none';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        updateProgressFill.style.width = percent + '%';
        updateProgressText.textContent = `Wird hochgeladen... ${percent}%`;
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        hideUpdateModal();
        loadUnitInfo();
        document.getElementById('previewFrame').src = document.getElementById('previewFrame').src;
      } else {
        const response = JSON.parse(xhr.responseText);
        updateError.textContent = response.error || 'Update fehlgeschlagen.';
        updateError.classList.remove('hidden');
        resetUpdateUpload();
      }
    });

    xhr.addEventListener('error', () => {
      updateError.textContent = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
      updateError.classList.remove('hidden');
      resetUpdateUpload();
    });

    xhr.open('PUT', `${API_URL}/api/update/${unitId}`);
    xhr.setRequestHeader('X-Edit-Token', editToken);
    xhr.send(formData);
  } catch (error) {
    updateError.textContent = 'Ein Fehler ist aufgetreten: ' + error.message;
    updateError.classList.remove('hidden');
    resetUpdateUpload();
  }
}

function resetUpdateUpload() {
  updateProgressContainer.classList.remove('visible');
  updateDropZone.style.display = 'block';
  updateFileInput.value = '';
}

// Delete Modal
const deleteModal = document.getElementById('deleteModal');
const deleteError = document.getElementById('deleteError');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

window.showDeleteModal = function() {
  deleteModal.classList.add('visible');
  deleteError.classList.add('hidden');
  confirmDeleteBtn.disabled = false;
}

window.hideDeleteModal = function() {
  deleteModal.classList.remove('visible');
}

window.deleteUnit = async function() {
  deleteError.classList.add('hidden');
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Wird gelöscht...';

  try {
    const response = await fetch(`${API_URL}/api/delete/${unitId}`, {
      method: 'DELETE',
      headers: {
        'X-Edit-Token': editToken
      }
    });

    if (response.ok) {
      window.location.href = '/?deleted=1';
    } else {
      const data = await response.json();
      deleteError.textContent = data.error || 'Löschen fehlgeschlagen.';
      deleteError.classList.remove('hidden');
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Endgültig löschen';
    }
  } catch (error) {
    deleteError.textContent = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
    deleteError.classList.remove('hidden');
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Endgültig löschen';
  }
}

// Close modals on overlay click
updateModal.addEventListener('click', (e) => {
  if (e.target === updateModal) hideUpdateModal();
});

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) hideDeleteModal();
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideUpdateModal();
    hideDeleteModal();
  }
});
