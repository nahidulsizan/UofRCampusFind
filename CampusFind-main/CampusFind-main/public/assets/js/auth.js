import { postJson, request, setSession, showMessage, setBusy } from './api.js';

const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const adminLoginForm = document.getElementById('admin-login-form');

signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!signupForm.reportValidity()) return;

  const payload = new FormData(signupForm);
  try {
    setBusy(signupForm, true, 'Creating account...');
    showMessage(signupForm, 'Creating your account...');
    await request('/auth/signup', { method: 'POST', body: payload });
    sessionStorage.setItem('campusfindFlash', 'Account created. You can now log in.');
    window.location.assign('/login.html');
  } catch (error) {
    showMessage(signupForm, error.message, 'error');
  } finally {
    setBusy(signupForm, false);
  }
});

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;

  try {
    setBusy(loginForm, true, 'Logging in...');
    const data = await postJson('/auth/login', {
      email: loginForm.elements.email.value,
      password: loginForm.elements.password.value
    });
    setSession(data.token, data.user);
    window.location.assign('/report.html');
  } catch (error) {
    showMessage(loginForm, error.message, 'error');
  } finally {
    setBusy(loginForm, false);
  }
});

adminLoginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!adminLoginForm.reportValidity()) return;

  try {
    setBusy(adminLoginForm, true, 'Logging in...');
    const data = await postJson('/auth/admin/login', {
      email: adminLoginForm.elements.email.value,
      password: adminLoginForm.elements.password.value
    });
    setSession(data.token, data.user);
    window.location.assign('/admin-dashboard.html');
  } catch (error) {
    showMessage(adminLoginForm, error.message, 'error');
  } finally {
    setBusy(adminLoginForm, false);
  }
});

const flash = sessionStorage.getItem('campusfindFlash');
if (flash && loginForm) {
  showMessage(loginForm, flash, 'success');
  sessionStorage.removeItem('campusfindFlash');
}
