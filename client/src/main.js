import { API_URL } from './config.js';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const errorMessage = document.getElementById('errorMessage');

if (dropZone) {
  // Click handlers for different upload types
  document.getElementById('uploadZip')?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  document.getElementById('uploadFolder')?.addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput.click();
  });

  document.getElementById('uploadFiles')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const multiInput = document.getElementById('multiFileInput');
    multiInput.click();
  });

  // File input changes
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
  });

  folderInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
  });

  document.getElementById('multiFileInput')?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
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

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const items = e.dataTransfer.items;
    if (items) {
      const files = await getAllFiles(items);
      if (files.length > 0) {
        uploadFiles(files);
      }
    } else if (e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  });
}

// Recursively get all files from dropped items (including folders)
async function getAllFiles(items) {
  const files = [];

  async function traverseEntry(entry, path = '') {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file) => {
          file.relativePath = path + file.name;
          files.push(file);
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise((resolve) => {
        reader.readEntries((entries) => resolve(entries));
      });

      for (const childEntry of entries) {
        await traverseEntry(childEntry, path + entry.name + '/');
      }
    }
  }

  const promises = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry();
    if (entry) {
      promises.push(traverseEntry(entry));
    }
  }

  await Promise.all(promises);
  return files;
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

async function uploadFiles(files) {
  hideError();

  // Calculate total size
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const maxSize = 50 * 1024 * 1024;

  if (totalSize > maxSize) {
    showError('Die Dateien sind zu gross. Maximale Gesamtgrösse: 50 MB.');
    return;
  }

  if (files.length === 0) {
    showError('Keine Dateien ausgewählt.');
    return;
  }

  // Show progress
  progressContainer.classList.add('visible');
  progressFill.style.width = '0%';
  progressText.textContent = `Wird hochgeladen... (${files.length} Dateien)`;
  dropZone.style.display = 'none';

  const formData = new FormData();

  // Add files with their paths
  files.forEach((file, index) => {
    const fieldName = `file_${index}`;
    formData.append(fieldName, file, file.name);

    // Add the relative path as a separate field
    const relativePath = file.relativePath || file.webkitRelativePath || file.name;
    formData.append(`path_${fieldName}`, relativePath);
  });

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
        let errorMsg = 'Upload fehlgeschlagen.';
        try {
          const response = JSON.parse(xhr.responseText);
          errorMsg = response.error || errorMsg;
        } catch (e) {}
        showError(errorMsg);
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
  folderInput.value = '';
  const multiInput = document.getElementById('multiFileInput');
  if (multiInput) multiInput.value = '';
}
