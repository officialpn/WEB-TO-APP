const API_URL = 'https://ft-web2apk.ftshehryar10044.workers.dev/api';
const DEFAULT_ICON_URL = 'https://placehold.co/512x512.png';

const form = document.querySelector('#build-form');
const websiteInput = document.querySelector('#website-url');
const nameInput = document.querySelector('#app-name');
const packageNameInput = document.querySelector('#package-name');
const versionNameInput = document.querySelector('#version-name');
const versionCodeInput = document.querySelector('#version-code');
const iconInput = document.querySelector('#app-icon');
const nameCount = document.querySelector('#name-count');
const submitButton = document.querySelector('#submit-button');
const resultPanel = document.querySelector('#result-panel');
const iconPreview = document.querySelector('#icon-preview');
const iconFileInput = document.querySelector('#icon-file');
const selectedFileLabel = document.querySelector('#selected-file');
const clearFileButton = document.querySelector('#clear-file');
let iconFileData = '';
let packageNameWasEdited = false;

/* ===== ZOOM BLOCK (SCROLL SAFE) ===== */
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
    e.preventDefault();
  }
});

function setFullHeight() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
setFullHeight();
window.addEventListener('resize', setFullHeight);
window.addEventListener('orientationchange', setFullHeight);

/* ===== HELPERS ===== */
function parseWebUrl(value) {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function setError(id, message) {
  document.getElementById(id).textContent = message;
}

function packageNameFromAppName(value) {
  const suffix = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_]+/g, '.').replace(/^\.+|\.+$/g, '').replace(/\.+/g, '.')
    .replace(/^[^a-z]+/, '') || 'myapp';
  return `com.appify.${suffix}`;
}

function validate() {
  const websiteUrl = websiteInput.value.trim();
  const appName = nameInput.value.trim();
  const packageName = packageNameInput.value.trim();
  const versionName = versionNameInput.value.trim();
  const versionCode = Number(versionCodeInput.value);
  const icon = iconInput.value.trim();
  const website = parseWebUrl(websiteUrl);
  const iconUrl = icon ? parseWebUrl(icon) : null;
  const hasUploadedIcon = Boolean(iconFileData);
  let valid = true;

  setError('website-error', '');
  setError('name-error', '');
  setError('package-error', '');
  setError('version-name-error', '');
  setError('version-code-error', '');
  setError('icon-error', '');
  websiteInput.closest('.input-wrap').classList.toggle('is-valid', Boolean(website));

  if (!websiteUrl) {
    setError('website-error', 'ENTER THE WEBSITE ADDRESS YOU WANT TO TURN INTO AN APP.');
    valid = false;
  } else if (!website) {
    setError('website-error', 'ENTER A COMPLETE WEBSITE URL STARTING WITH HTTPS:// OR HTTP://.');
    valid = false;
  }
  if (!appName) {
    setError('name-error', 'ADD A NAME FOR YOUR APP BEFORE STARTING THE BUILD.');
    valid = false;
  } else if (appName.length > 50) {
    setError('name-error', 'KEEP THE APP NAME TO 50 CHARACTERS OR FEWER.');
    valid = false;
  }
  if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(packageName)) {
    setError('package-error', 'USE LOWERCASE PACKAGE SEGMENTS STARTING WITH A LETTER, E.G. COM.APPIFY.MYAPP.');
    valid = false;
  }
  if (!versionName || versionName.length > 30) {
    setError('version-name-error', 'ENTER A VERSION NAME (UP TO 30 CHARACTERS), SUCH AS 1.0.0.');
    valid = false;
  }
  if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) {
    setError('version-code-error', 'VERSION CODE MUST BE A WHOLE NUMBER FROM 1 TO 2,100,000,000.');
    valid = false;
  }
  if (icon && !iconUrl && !hasUploadedIcon) {
    setError('icon-error', 'USE A COMPLETE IMAGE URL STARTING WITH HTTPS:// OR HTTP://, OR CLEAR THE FIELD.');
    valid = false;
  }
  return valid;
}

function findApkUrl(payload) {
  const keys = /^(apkurl|downloadurl|downloadlink|apkdownloadurl|fileurl|apk)$/i;
  const visited = new Set();
  function scan(value) {
    if (!value || typeof value !== 'object' || visited.has(value)) return null;
    visited.add(value);
    for (const [key, candidate] of Object.entries(value)) {
      if (keys.test(key)) {
        const possible = typeof candidate === 'string' ? candidate : candidate?.url;
        if (typeof possible === 'string' && parseWebUrl(possible)) return possible;
      }
    }
    for (const candidate of Object.values(value)) {
      const found = scan(candidate);
      if (found) return found;
    }
    return null;
  }
  return scan(payload);
}

function showResult({ status, title, message, downloadUrl, details }) {
  resultPanel.className = `result-panel status-${status}`;
  resultPanel.replaceChildren();
  resultPanel.style.visibility = 'visible';

  const top = document.createElement('div');
  top.className = 'result-top';
  const symbol = document.createElement('span');
  symbol.className = 'result-symbol';
  symbol.textContent = status === 'error' ? '!' : status === 'loading' ? '…' : '✓';
  const heading = document.createElement('span');
  heading.className = 'result-title';
  heading.textContent = title;
  top.append(symbol, heading);
  resultPanel.append(top);

  if (message) {
    const body = document.createElement('p');
    body.className = 'result-message';
    body.textContent = message;
    resultPanel.append(body);
  }
  if (downloadUrl) {
    const link = document.createElement('a');
    link.className = 'download-link';
    link.href = downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'DOWNLOAD APK';
    const arrow = document.createElement('span');
    arrow.textContent = '↓';
    link.append(arrow);
    resultPanel.append(link);
  }
  if (details) {
    const response = document.createElement('p');
    response.className = 'response-details';
    response.textContent = details;
    resultPanel.append(response);
  }
}

function friendlyError(payload, statusCode) {
  if (payload && typeof payload.error === 'string') return payload.error.toUpperCase();
  if (payload && typeof payload.message === 'string' && /error|fail|invalid|required/i.test(String(payload.status || ''))) return payload.message.toUpperCase();
  if (statusCode === 429) return 'THE BUILD SERVICE IS BUSY. WAIT A MOMENT AND TRY AGAIN.';
  if (statusCode >= 500) return 'THE BUILD SERVICE HAD A PROBLEM. PLEASE TRY AGAIN LATER.';
  return `THE BUILD SERVICE COULD NOT START THIS REQUEST (HTTP ${statusCode}). CHECK YOUR DETAILS AND TRY AGAIN.`;
}

websiteInput.addEventListener('input', () => {
  if (websiteInput.value.trim()) {
    const valid = Boolean(parseWebUrl(websiteInput.value));
    websiteInput.closest('.input-wrap').classList.toggle('is-valid', valid);
  } else {
    websiteInput.closest('.input-wrap').classList.remove('is-valid');
  }
  setError('website-error', '');
});
nameInput.addEventListener('input', () => {
  nameCount.textContent = String(nameInput.value.length);
  if (!packageNameWasEdited) packageNameInput.value = packageNameFromAppName(nameInput.value);
  setError('name-error', '');
});
packageNameInput.addEventListener('input', () => {
  packageNameWasEdited = true;
  setError('package-error', '');
});
versionNameInput.addEventListener('input', () => setError('version-name-error', ''));
versionCodeInput.addEventListener('input', () => setError('version-code-error', ''));

function resetFileSelection() {
  iconFileData = '';
  iconFileInput.value = '';
  selectedFileLabel.textContent = 'PNG, JPG OR WEBP · MAX 5 MB';
  clearFileButton.hidden = true;
}

function readIconAsPng(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('COULD NOT READ THIS IMAGE. TRY ANOTHER FILE.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('THIS IMAGE COULD NOT BE OPENED. TRY A PNG, JPG OR WEBP FILE.'));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const scale = Math.min(512 / image.naturalWidth, 512 / image.naturalHeight);
        const width = Math.round(image.naturalWidth * scale);
        const height = Math.round(image.naturalHeight * scale);
        canvas.getContext('2d').drawImage(image, (512 - width) / 2, (512 - height) / 2, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

iconInput.addEventListener('input', () => {
  if (iconFileInput.files.length || iconFileData) resetFileSelection();
  setError('icon-error', '');
  iconPreview.replaceChildren();
  const url = parseWebUrl(iconInput.value);
  if (url) {
    const img = document.createElement('img');
    img.src = url.href;
    img.alt = '';
    img.onerror = () => { iconPreview.innerHTML = '<span class="icon-placeholder">◇</span>'; };
    iconPreview.replaceChildren(img);
  } else {
    iconPreview.innerHTML = '<span class="icon-placeholder">◇</span>';
  }
});

iconFileInput.addEventListener('change', async () => {
  const file = iconFileInput.files?.[0];
  if (!file) return;
  setError('icon-error', '');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    resetFileSelection();
    setError('icon-error', 'CHOOSE A PNG, JPG OR WEBP IMAGE.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    resetFileSelection();
    setError('icon-error', 'THAT IMAGE IS OVER 5 MB. CHOOSE A SMALLER FILE.');
    return;
  }
  iconInput.value = '';
  selectedFileLabel.textContent = file.name.toUpperCase();
  clearFileButton.hidden = false;
  try {
    iconFileData = await readIconAsPng(file);
    const img = document.createElement('img');
    img.src = iconFileData;
    img.alt = 'SELECTED APP ICON PREVIEW';
    iconPreview.replaceChildren(img);
  } catch (error) {
    resetFileSelection();
    setError('icon-error', (error.message || 'COULD NOT READ THIS IMAGE. TRY ANOTHER FILE.').toUpperCase());
  }
});

clearFileButton.addEventListener('click', () => {
  resetFileSelection();
  iconPreview.innerHTML = '<span class="icon-placeholder">◇</span>';
  setError('icon-error', '');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!validate()) {
    resultPanel.style.visibility = 'hidden';
    const firstInvalid = form.querySelector('.field-error:not(:empty)');
    firstInvalid?.previousElementSibling?.querySelector('input')?.focus();
    return;
  }

  const request = {
    websiteUrl: websiteInput.value.trim(),
    appName: nameInput.value.trim(),
    packageName: packageNameInput.value.trim(),
    versionName: versionNameInput.value.trim(),
    versionCode: Number(versionCodeInput.value),
    icon: iconFileData || iconInput.value.trim() || DEFAULT_ICON_URL,
  };
  submitButton.disabled = true;
  submitButton.classList.add('is-loading');
  showResult({ status: 'loading', title: 'SENDING YOUR BUILD REQUEST', message: 'CONNECTING TO THE BUILD SERVICE. THIS MAY TAKE A MOMENT.' });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const raw = await response.text();
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; }
    catch { payload = { message: raw }; }

    const apiStatus = String(payload?.status || '').toLowerCase();
    if (!response.ok || apiStatus === 'error' || apiStatus === 'failed') {
      showResult({
        status: 'error',
        title: 'BUILD REQUEST WASN’T ACCEPTED',
        message: friendlyError(payload, response.status),
        details: response.status ? `SERVICE RESPONSE · HTTP ${response.status}` : '',
      });
      return;
    }

    const downloadUrl = findApkUrl(payload);
    const message = downloadUrl
      ? 'YOUR BUILD SERVICE RETURNED AN APK DOWNLOAD LINK.'
      : 'THE REQUEST WAS ACCEPTED, BUT THE SERVICE DID NOT INCLUDE AN APK DOWNLOAD LINK IN THIS RESPONSE.';
    showResult({
      status: 'success',
      title: downloadUrl ? 'YOUR APK IS READY' : 'BUILD REQUEST RECEIVED',
      message,
      downloadUrl,
      details: payload?.message && typeof payload.message === 'string' ? payload.message.toUpperCase() : '',
    });
  } catch (error) {
    const message = error instanceof TypeError
      ? 'COULD NOT REACH THE BUILD SERVICE. CHECK YOUR CONNECTION AND TRY AGAIN.'
      : 'SOMETHING UNEXPECTED HAPPENED WHILE CONTACTING THE BUILD SERVICE.';
    showResult({ status: 'error', title: 'COULDN’T CONNECT TO THE BUILD SERVICE', message });
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('is-loading');
  }
});