const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('campusfindToken');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('campusfindUser') || 'null');
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem('campusfindToken', token);
  localStorage.setItem('campusfindUser', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('campusfindToken');
  localStorage.removeItem('campusfindUser');
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(body?.message || body || 'Request failed.');
  }
  return body;
}

export function postJson(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function requireSession(role) {
  const token = getToken();
  const user = getUser();
  if (!token || !user || (role && user.role !== role)) return null;
  return user;
}

export function showMessage(container, message, type = 'info') {
  let box = container.querySelector('.api-message');
  if (!box) {
    box = document.createElement('p');
    box.className = 'api-message';
    box.setAttribute('role', 'status');
    container.appendChild(box);
  }
  box.textContent = message;
  box.dataset.type = type;
}

export function setBusy(form, busy, label = 'Working...') {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}
