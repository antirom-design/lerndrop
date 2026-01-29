import { API_URL } from './config.js';
import './test-screen.css';

const MAX_TIMEOUT = 90;

let tests = {
  apiUrl: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 },
  health: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 }
};

let timerInterval = null;

function getStatusIcon(status) {
  switch (status) {
    case 'passed': return '✅';
    case 'failed': return '❌';
    case 'running': return '⏳';
    default: return '⚪';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'passed': return 'test-passed';
    case 'failed': return 'test-failed';
    case 'running': return 'test-running';
    default: return 'test-pending';
  }
}

function updateTestUI(testName) {
  const test = tests[testName];
  const item = document.getElementById(`test-${testName}`);

  item.className = `test-item ${getStatusClass(test.status)}`;
  item.querySelector('.test-icon').textContent = getStatusIcon(test.status);

  let message = test.message;
  if (test.status === 'running' && test.elapsedTime >= 5) {
    message = `⏰ Server wacht auf... (${test.elapsedTime}s)`;
  }
  item.querySelector('.test-message').textContent = message;

  // Progress bar
  const progressContainer = item.querySelector('.progress-bar-container');
  if (test.status === 'running') {
    progressContainer.classList.remove('hidden');
    const percentage = Math.min((test.elapsedTime / MAX_TIMEOUT) * 100, 100);
    progressContainer.querySelector('.progress-bar').style.width = `${percentage}%`;
    progressContainer.querySelector('.progress-time').textContent = `${test.elapsedTime}s / ${MAX_TIMEOUT}s`;
  } else {
    progressContainer.classList.add('hidden');
  }

  // Cold start info
  const coldStartInfo = item.querySelector('.cold-start-info');
  if (test.status === 'running' && test.elapsedTime >= 5) {
    coldStartInfo.classList.remove('hidden');
  } else {
    coldStartInfo.classList.add('hidden');
  }

  // Details
  const details = item.querySelector('.test-details');
  if (test.details) {
    details.textContent = test.details;
    details.classList.remove('hidden');
  } else {
    details.classList.add('hidden');
  }
}

function updateTest(testName, status, message, details = '') {
  tests[testName] = {
    ...tests[testName],
    status,
    message,
    details,
    startTime: status === 'running' ? Date.now() : tests[testName].startTime,
    elapsedTime: status !== 'running' ? 0 : tests[testName].elapsedTime
  };
  updateTestUI(testName);
}

function startTimer() {
  timerInterval = setInterval(() => {
    Object.keys(tests).forEach(key => {
      if (tests[key].status === 'running' && tests[key].startTime) {
        tests[key].elapsedTime = Math.floor((Date.now() - tests[key].startTime) / 1000);
        updateTestUI(key);
      }
    });
  }, 500);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function runTests() {
  document.getElementById('success-message').classList.add('hidden');
  document.getElementById('error-actions').classList.add('hidden');

  startTimer();

  // Test 1: Check API URL
  updateTest('apiUrl', 'running', 'Prüfe API URL...');

  if (!API_URL) {
    updateTest('apiUrl', 'failed',
      'API URL nicht konfiguriert!',
      `Erwartet: https://lerndrop-api.onrender.com\nGefunden: ${API_URL || 'undefined'}\n\nLösung: VITE_API_URL in Vercel Environment Variables setzen`
    );
    stopTimer();
    document.getElementById('error-actions').classList.remove('hidden');
    return;
  }

  updateTest('apiUrl', 'passed', `Verwende: ${API_URL}`);

  // Test 2: Health Check
  updateTest('health', 'running', 'Prüfe Backend...');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT * 1000);

    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'ok') {
      updateTest('health', 'passed', 'Backend online!');
    } else {
      throw new Error(`Unerwartete Antwort: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    updateTest('health', 'failed',
      isTimeout ? `Backend Timeout (${MAX_TIMEOUT}s)!` : 'Backend nicht erreichbar!',
      `URL: ${API_URL}/health\nFehler: ${error.message}\n\nMögliche Ursachen:\n1. Backend nicht auf Render deployed\n2. Backend abgestürzt (Render Logs prüfen)\n3. Falsche URL in VITE_API_URL${isTimeout ? '\n4. Server Cold Start dauert zu lange' : ''}`
    );
    stopTimer();
    document.getElementById('error-actions').classList.remove('hidden');
    return;
  }

  stopTimer();

  // All tests passed
  document.getElementById('success-message').classList.remove('hidden');

  setTimeout(() => {
    document.getElementById('test-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
  }, 1500);
}

function initTestScreen() {
  document.getElementById('retry-btn').addEventListener('click', () => {
    tests = {
      apiUrl: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 },
      health: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 }
    };
    runTests();
  });

  document.getElementById('api-url-display').textContent = API_URL || 'Nicht konfiguriert';

  runTests();
}

export { initTestScreen };
