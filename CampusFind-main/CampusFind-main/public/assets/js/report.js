import { request, requireSession, showMessage, setBusy, clearSession } from './api.js';

const reportForm = document.getElementById('report-form');
const statusForm = document.getElementById('status-form');
const reportsList = document.getElementById('my-reports-list');
const user = requireSession('user');

if (!user) {
  window.location.replace('/login.html');
} else {
  document.getElementById('signed-in-user').textContent = user.fullName;
  reportForm.elements.email.value = user.email || '';
  reportForm.elements.phone.value = user.phone || '';
}

document.getElementById('user-signout')?.addEventListener('click', (event) => {
  event.preventDefault();
  clearSession();
  window.location.assign('/');
});

reportForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!reportForm.reportValidity()) return;

  const lostDate = new Date(`${reportForm.elements.dateLost.value}T00:00:00`);
  if (lostDate > new Date()) {
    showMessage(reportForm, 'Date lost cannot be in the future.', 'error');
    return;
  }

  try {
    setBusy(reportForm, true, 'Submitting report...');
    showMessage(reportForm, 'Submitting your report...');
    const data = await request('/lost-reports', { method: 'POST', body: new FormData(reportForm) });
    window.location.assign(`/claim-success.html?reference=${encodeURIComponent(data.referenceNumber)}`);
  } catch (error) {
    showMessage(reportForm, error.message, 'error');
  } finally {
    setBusy(reportForm, false);
  }
});

statusForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!statusForm.reportValidity()) return;

  const result = document.getElementById('status-result');
  const params = new URLSearchParams({
    referenceNumber: statusForm.elements.referenceNumber.value,
    email: statusForm.elements.statusEmail.value
  });

  try {
    setBusy(statusForm, true, 'Checking...');
    const data = await request(`/lost-reports/status?${params}`);
    const report = data.report;
    result.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = `${report.referenceNumber}: ${report.itemName}`;
    const detail = document.createElement('span');
    detail.textContent = `Status: ${report.status} · Last known location: ${report.lastKnownLocation}`;
    result.append(title, detail);
    result.dataset.type = 'success';
  } catch (error) {
    result.textContent = error.message;
    result.dataset.type = 'error';
  } finally {
    setBusy(statusForm, false);
  }
});

async function loadMyReports() {
  if (!reportsList) return;
  try {
    const data = await request('/lost-reports/mine');
    reportsList.innerHTML = '';
    if (!data.reports.length) {
      reportsList.textContent = 'You have not submitted a report yet.';
      return;
    }
    for (const report of data.reports) {
      const item = document.createElement('article');
      item.className = 'match-item';
      const title = document.createElement('strong');
      title.textContent = `${report.referenceNumber} — ${report.itemName}`;
      const detail = document.createElement('span');
      detail.textContent = `${report.status} · Lost ${new Date(report.dateLost).toLocaleDateString()} · ${report.lastKnownLocation}`;
      item.append(title, detail);
      reportsList.appendChild(item);
    }
  } catch (error) {
    reportsList.textContent = error.message;
  }
}

loadMyReports();
