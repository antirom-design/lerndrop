// Parse URL parameters
const params = new URLSearchParams(window.location.search);

const viewUrl = params.get('viewUrl');
const editUrl = params.get('editUrl');
const title = params.get('title');
const fileCount = params.get('fileCount');
const sizeBytes = parseInt(params.get('sizeBytes'));

// Populate fields
document.getElementById('viewUrl').value = viewUrl;
document.getElementById('editUrl').value = editUrl;
document.getElementById('viewLink').href = viewUrl;

if (title) {
  document.getElementById('unitTitle').textContent = title;
}

document.getElementById('fileCount').textContent = fileCount + ' Dateien';
document.getElementById('fileSize').textContent = formatBytes(sizeBytes);

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

window.copyLink = function(inputId) {
  const input = document.getElementById(inputId);
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value);

  // Visual feedback
  const btn = input.nextElementSibling;
  const originalText = btn.textContent;
  btn.textContent = 'Kopiert!';
  setTimeout(() => {
    btn.textContent = originalText;
  }, 2000);
}
