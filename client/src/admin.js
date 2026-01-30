import { API_URL } from './config.js';

let adminPassword = '';

const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const unitsTableBody = document.getElementById('unitsTableBody');
const emptyState = document.getElementById('emptyState');

// Check if already logged in
const savedPassword = sessionStorage.getItem('adminPassword');
if (savedPassword) {
  adminPassword = savedPassword;
  verifyAndLoad();
}

// Login handlers
loginBtn.addEventListener('click', login);
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('adminPassword');
  adminPassword = '';
  loginScreen.classList.remove('hidden');
  adminPanel.classList.add('hidden');
  passwordInput.value = '';
});

async function login() {
  const password = passwordInput.value;

  try {
    const response = await fetch(`${API_URL}/api/admin/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': password
      }
    });

    if (response.ok) {
      adminPassword = password;
      sessionStorage.setItem('adminPassword', password);
      loginError.classList.add('hidden');
      showAdminPanel();
      loadUnits();
    } else {
      loginError.textContent = 'Falsches Passwort';
      loginError.classList.remove('hidden');
    }
  } catch (error) {
    loginError.textContent = 'Verbindungsfehler';
    loginError.classList.remove('hidden');
  }
}

async function verifyAndLoad() {
  try {
    const response = await fetch(`${API_URL}/api/admin/verify`, {
      method: 'POST',
      headers: {
        'X-Admin-Password': adminPassword
      }
    });

    if (response.ok) {
      showAdminPanel();
      loadUnits();
    } else {
      sessionStorage.removeItem('adminPassword');
    }
  } catch (error) {
    sessionStorage.removeItem('adminPassword');
  }
}

function showAdminPanel() {
  loginScreen.classList.add('hidden');
  adminPanel.classList.remove('hidden');
}

async function loadUnits() {
  try {
    const response = await fetch(`${API_URL}/api/admin/units`, {
      headers: {
        'X-Admin-Password': adminPassword
      }
    });

    if (!response.ok) throw new Error('Failed to load units');

    const data = await response.json();
    renderUnits(data.units);
  } catch (error) {
    console.error('Load units error:', error);
  }
}

function renderUnits(units) {
  // Update stats
  document.getElementById('totalUnits').textContent = units.length;
  document.getElementById('totalFiles').textContent = units.reduce((sum, u) => sum + (u.fileCount || 0), 0);
  document.getElementById('totalSize').textContent = formatBytes(units.reduce((sum, u) => sum + (u.sizeBytes || 0), 0));

  if (units.length === 0) {
    unitsTableBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  unitsTableBody.innerHTML = units.map(unit => `
    <tr data-id="${unit.id}">
      <td>
        <div class="unit-title">${unit.title || 'Ohne Titel'}</div>
        <div class="unit-id">${unit.id}</div>
      </td>
      <td class="unit-meta">${unit.fileCount || 0}</td>
      <td class="unit-meta">${formatBytes(unit.sizeBytes || 0)}</td>
      <td class="unit-meta">${formatDate(unit.createdAt)}</td>
      <td>
        ${unit.filesExist
          ? '<span class="status-ok">✓</span>'
          : '<span class="status-missing">✗</span>'
        }
      </td>
      <td class="unit-actions">
        <a href="${API_URL}/v/${unit.id}" target="_blank" class="btn btn-secondary btn-icon" title="Ansehen">👁️</a>
        <button class="btn btn-danger btn-icon delete-btn" data-id="${unit.id}" title="Löschen">🗑️</button>
      </td>
    </tr>
  `).join('');

  // Add delete handlers
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteUnit(btn.dataset.id));
  });
}

async function deleteUnit(id) {
  if (!confirm(`Einheit "${id}" wirklich löschen?`)) return;

  try {
    const response = await fetch(`${API_URL}/api/admin/units/${id}`, {
      method: 'DELETE',
      headers: {
        'X-Admin-Password': adminPassword
      }
    });

    if (response.ok) {
      loadUnits();
    } else {
      alert('Löschen fehlgeschlagen');
    }
  } catch (error) {
    alert('Fehler: ' + error.message);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
