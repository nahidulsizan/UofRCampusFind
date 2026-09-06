'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPossibleMatchEmail,
  getMatchEmailThreshold
} = require('../src/services/emailService');

test('match email threshold defaults to medium similarity', () => {
  const original = process.env.MATCH_EMAIL_THRESHOLD;
  delete process.env.MATCH_EMAIL_THRESHOLD;
  assert.equal(getMatchEmailThreshold(), 58);
  if (original === undefined) delete process.env.MATCH_EMAIL_THRESHOLD;
  else process.env.MATCH_EMAIL_THRESHOLD = original;
});

test('possible-match email excludes private verification details', () => {
  const message = buildPossibleMatchEmail({
    lostReport: {
      fullName: 'Demo User',
      referenceNumber: 'CF-2026-0001'
    },
    foundItem: {
      itemCategory: 'Phone',
      dateFound: '2026-07-16',
      privateVerificationNotes: 'SECRET SERIAL 123'
    },
    match: { score: 82 },
    appUrl: 'https://campusfind.example'
  });

  assert.match(message.subject, /CF-2026-0001/);
  assert.match(message.html, /Phone/);
  assert.doesNotMatch(message.html, /SECRET SERIAL 123/);
  assert.doesNotMatch(message.text, /SECRET SERIAL 123/);
});
