'use strict';

const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_MATCH_EMAIL_THRESHOLD = 58;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return !['0', 'false', 'off', 'no'].includes(String(value).trim().toLowerCase());
}

function getMatchEmailThreshold() {
  const parsed = Number(process.env.MATCH_EMAIL_THRESHOLD);
  if (!Number.isFinite(parsed)) return DEFAULT_MATCH_EMAIL_THRESHOLD;
  return Math.min(100, Math.max(45, Math.round(parsed)));
}

function getEmailConfiguration() {
  return {
    enabled: normalizeBoolean(process.env.EMAIL_NOTIFICATIONS_ENABLED, true),
    apiKey: String(process.env.RESEND_API_KEY || '').trim(),
    from: String(process.env.EMAIL_FROM || '').trim(),
    replyTo: String(process.env.EMAIL_REPLY_TO || '').trim(),
    appUrl: String(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
    threshold: getMatchEmailThreshold()
  };
}

function isEmailConfigured(configuration = getEmailConfiguration()) {
  return Boolean(configuration.enabled && configuration.apiKey && configuration.from);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function buildPossibleMatchEmail({ lostReport, foundItem, match, appUrl }) {
  const safeName = escapeHtml(lostReport.fullName || 'CampusFind user');
  const safeReference = escapeHtml(lostReport.referenceNumber);
  const safeCategory = escapeHtml(foundItem.itemCategory);
  const safeDateFound = escapeHtml(formatDate(foundItem.dateFound));
  const safeAppUrl = escapeHtml(appUrl);
  const score = Number(match.score) || 0;

  const subject = `Possible match for CampusFind report ${lostReport.referenceNumber}`;
  const text = [
    `Hello ${lostReport.fullName || 'CampusFind user'},`,
    '',
    `CampusFind found a possible match for lost-item report ${lostReport.referenceNumber}.`,
    `Category: ${foundItem.itemCategory}`,
    `Date found: ${formatDate(foundItem.dateFound)}`,
    '',
    'This is only a possible match. Protective Services must verify ownership before an item can be released.',
    `Open CampusFind: ${appUrl}`,
    '',
    'Do not reply with passwords, identification numbers, or other sensitive information.'
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f7f3;font-family:Arial,sans-serif;color:#1e2520;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f3;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #d8e2d8;border-radius:18px;overflow:hidden;">
          <tr><td style="padding:24px;background:#1d5f49;color:#ffffff;">
            <h1 style="margin:0;font-size:24px;">CampusFind</h1>
            <p style="margin:6px 0 0;color:#e7f4ed;">Possible lost-item match</p>
          </td></tr>
          <tr><td style="padding:28px;">
            <p style="margin-top:0;">Hello ${safeName},</p>
            <p>CampusFind found a possible match for your lost-item report.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#eef4ef;border-radius:12px;">
              <tr><td style="padding:16px;">
                <p style="margin:0 0 8px;"><strong>Reference:</strong> ${safeReference}</p>
                <p style="margin:0 0 8px;"><strong>Category:</strong> ${safeCategory}</p>
                <p style="margin:0;"><strong>Date found:</strong> ${safeDateFound}</p>
              </td></tr>
            </table>
            <p><strong>This does not confirm ownership.</strong> Protective Services must review the match and verify identifying details before an item can be released.</p>
            <p style="margin:24px 0;">
              <a href="${safeAppUrl}" style="display:inline-block;background:#1d5f49;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;">Open CampusFind</a>
            </p>
            <p style="font-size:13px;color:#5f6e64;">For your privacy, do not email passwords, identification numbers, serial numbers, or other sensitive information. Match score: ${score}/100.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

async function sendPossibleMatchEmail({ lostReport, foundItem, match }) {
  const configuration = getEmailConfiguration();

  if (!configuration.enabled) {
    return { status: 'skipped', reason: 'Email notifications are disabled.' };
  }
  if (match.score < configuration.threshold) {
    return {
      status: 'skipped',
      reason: `Match score ${match.score} is below threshold ${configuration.threshold}.`
    };
  }
  if (!configuration.apiKey || !configuration.from) {
    return {
      status: 'skipped',
      reason: 'RESEND_API_KEY or EMAIL_FROM is not configured.'
    };
  }

  const message = buildPossibleMatchEmail({
    lostReport,
    foundItem,
    match,
    appUrl: configuration.appUrl
  });

  const payload = {
    from: configuration.from,
    to: [lostReport.email],
    subject: message.subject,
    text: message.text,
    html: message.html
  };
  if (configuration.replyTo) payload.reply_to = configuration.replyTo;

  let response;
  try {
    response = await fetch(RESEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `campusfind-match-${match.id}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000)
    });
  } catch (error) {
    throw new Error(`Email request failed: ${error.message}`);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const details = body?.error?.message || body?.message || `Resend returned HTTP ${response.status}`;
    throw new Error(details);
  }

  return { status: 'sent', providerId: body.id || null };
}

module.exports = {
  DEFAULT_MATCH_EMAIL_THRESHOLD,
  buildPossibleMatchEmail,
  getEmailConfiguration,
  getMatchEmailThreshold,
  isEmailConfigured,
  sendPossibleMatchEmail
};
