import { request, postJson, requireSession, clearSession, showMessage, setBusy } from './api.js';

const user = requireSession('admin');
const form = document.getElementById('found-item-form');
const matchList = document.getElementById('match-list');
const releaseList = document.getElementById('release-list');

if (!user) {
  window.location.replace('/admin-login.html');
} else {
  document.getElementById('admin-name').textContent = user.fullName;
}

document.getElementById('admin-signout')?.addEventListener('click', (event) => {
  event.preventDefault();
  clearSession();
  window.location.assign('/admin-login.html');
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  try {
    setBusy(form, true, 'Saving item...');
    const data = await postJson('/found-items', {
      itemTitle: form.elements.itemTitle.value,
      itemCategory: form.elements.itemCategory.value,
      dateFound: form.elements.dateFound.value,
      foundLocation: form.elements.foundLocation.value,
      dropOffLocation: form.elements.dropOffLocation.value,
      privateVerificationNotes: form.elements.privateVerificationNotes.value
    });
    const emailSummary = data.emailFailures
      ? `${data.emailsSent} email(s) sent; ${data.emailFailures} failed.`
      : `${data.emailsSent} email notification(s) sent.`;
    showMessage(form, `Item saved. ${data.matchesCreated} possible match(es) created. ${emailSummary}`, 'success');
    form.reset();
    form.elements.dateFound.valueAsDate = new Date();
    await loadDashboard();
  } catch (error) {
    showMessage(form, error.message, 'error');
  } finally {
    setBusy(form, false);
  }
});

function makeButton(text, action, id, className = 'btn btn-secondary btn-small') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function renderMatches(matches) {
  matchList.innerHTML = '';
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'match-item';
    empty.textContent = 'No matches are waiting for review.';
    matchList.appendChild(empty);
    return;
  }

  for (const match of matches) {
    const lost = match.lostReportId || {};
    const found = match.foundItemId || {};
    const item = document.createElement('article');
    item.className = 'match-item';

    const title = document.createElement('strong');
    title.textContent = `${found.itemTitle || 'Found item'} ↔ ${lost.itemName || 'Lost report'}`;
    const meta = document.createElement('span');
    meta.textContent = `${lost.referenceNumber || ''} · ${match.similarity} similarity · score ${match.score}`;
    const location = document.createElement('span');
    location.textContent = `Lost: ${lost.lastKnownLocation || 'Unknown'} · Found: ${found.foundLocation || 'Unknown'}`;
    const actions = document.createElement('div');
    actions.className = 'button-row';
    if (match.status === 'Pending Review') {
      actions.append(
        makeButton('Confirm', 'confirm', match._id),
        makeButton('Reject', 'reject', match._id)
      );
    }
    if (match.status === 'Confirmed') {
      actions.append(makeButton('Release', 'release', match._id, 'btn btn-primary btn-small'));
    }
    const status = document.createElement('span');
    status.textContent = `Review status: ${match.status}`;
    const emailStatus = document.createElement('span');
    emailStatus.textContent = `Email notification: ${match.notificationStatus || 'Not Sent'}`;
    item.append(title, meta, location, status, emailStatus, actions);
    matchList.appendChild(item);
  }
}

function renderReleases(releases) {
  releaseList.innerHTML = '';
  if (!releases.length) {
    releaseList.textContent = 'No release records yet.';
    return;
  }
  for (const release of releases) {
    const item = document.createElement('article');
    item.className = 'match-item';
    const title = document.createElement('strong');
    title.textContent = `${release.foundItemId?.itemTitle || 'Found item'} released`;
    const detail = document.createElement('span');
    detail.textContent = `${release.lostReportId?.referenceNumber || ''} · ${new Date(release.releaseDate).toLocaleString()}`;
    item.append(title, detail);
    releaseList.appendChild(item);
  }
}

async function loadDashboard() {
  try {
    const data = await request('/admin/dashboard');
    document.getElementById('metric-holding').textContent = data.metrics.itemsInHolding;
    document.getElementById('metric-open').textContent = data.metrics.openLostReports;
    document.getElementById('metric-matches').textContent = data.metrics.matchesPendingReview;
    renderMatches(data.recentMatches);
    renderReleases(data.recentReleases);
  } catch (error) {
    matchList.textContent = error.message;
  }
}

matchList?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  button.disabled = true;
  try {
    if (action === 'confirm') await request(`/matches/${id}/confirm`, { method: 'PATCH' });
    if (action === 'reject') await request(`/matches/${id}/reject`, { method: 'PATCH' });
    if (action === 'release') {
      const confirmed = window.confirm('Release this item? Do this only after ownership is verified in person.');
      if (!confirmed) return;
      await postJson(`/release/${id}`, { notes: 'Released after in-person ownership verification.' });

      // Remove the released match immediately. The database records and
      // seven-day release audit entry remain available on the server.
      button.closest('.match-item')?.remove();
    }
    await loadDashboard();
  } catch (error) {
    window.alert(error.message);
  } finally {
    button.disabled = false;
  }
});

if (form) form.elements.dateFound.valueAsDate = new Date();
loadDashboard();
