import { API_URL } from './config.js';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const errorMessage = document.getElementById('errorMessage');

if (dropZone) {
  // Click to select file
  dropZone.addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  });

  // Drag and drop events
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

    if (e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  });
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

async function uploadFile(file) {
  hideError();

  // Validate file type
  if (!file.name.endsWith('.zip') && file.type !== 'application/zip') {
    showError('Bitte laden Sie eine ZIP-Datei hoch.');
    return;
  }

  // Validate file size (50 MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    showError('Die Datei ist zu gross. Maximale Groesse: 50 MB.');
    return;
  }

  // Show progress
  progressContainer.classList.add('visible');
  progressFill.style.width = '0%';
  progressText.textContent = 'Wird hochgeladen...';
  dropZone.style.display = 'none';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = percent + '%';
        progressText.textContent = `Wird hochgeladen... ${percent}%`;
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        // Redirect to success page with data
        const params = new URLSearchParams({
          id: response.id,
          viewUrl: response.viewUrl,
          editUrl: response.editUrl,
          title: response.title || '',
          fileCount: response.fileCount,
          sizeBytes: response.sizeBytes
        });
        window.location.href = '/success.html?' + params.toString();
      } else {
        const response = JSON.parse(xhr.responseText);
        showError(response.error || 'Upload fehlgeschlagen.');
        resetUpload();
      }
    });

    xhr.addEventListener('error', () => {
      showError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
      resetUpload();
    });

    xhr.open('POST', `${API_URL}/api/upload`);
    xhr.send(formData);
  } catch (error) {
    showError('Ein Fehler ist aufgetreten: ' + error.message);
    resetUpload();
  }
}

function resetUpload() {
  progressContainer.classList.remove('visible');
  dropZone.style.display = 'block';
  fileInput.value = '';
}
