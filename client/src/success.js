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

// Generate QR codes - wait for library to load
function generateQRCodes() {
  if (!viewUrl) return;

  // Small QR code in the card
  const smallCanvas = document.createElement('canvas');
  document.getElementById('qrCode').appendChild(smallCanvas);
  QRCode.toCanvas(smallCanvas, viewUrl, {
    width: 150,
    margin: 0,
    color: { dark: '#1f2937', light: '#ffffff' }
  });

  // Large QR code for modal
  QRCode.toCanvas(document.getElementById('qrModalCanvas'), viewUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#1f2937', light: '#ffffff' }
  });

  document.getElementById('qrModalUrl').textContent = viewUrl;
}

// Wait for QRCode library
if (window.QRCode) {
  generateQRCodes();
} else {
  // Poll for library (loaded via CDN)
  const checkQR = setInterval(() => {
    if (window.QRCode) {
      clearInterval(checkQR);
      generateQRCodes();
    }
  }, 50);
  // Timeout after 5s
  setTimeout(() => clearInterval(checkQR), 5000);
}

// QR Modal functions
window.showQrModal = function() {
  document.getElementById('qrModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

window.hideQrModal = function() {
  document.getElementById('qrModal').classList.remove('active');
  document.body.style.overflow = '';
}

// ESC key to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideQrModal();
  }
});
