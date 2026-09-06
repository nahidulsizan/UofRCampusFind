'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { jaccard, calculateMatchScore, similarityFromScore } = require('../src/services/matchingService');

test('jaccard identifies shared item words', () => {
  assert.equal(jaccard('black iPhone 14', 'Black iPhone'), 2 / 3);
});

test('matching score rewards category, title, location, and close dates', () => {
  const score = calculateMatchScore(
    {
      itemCategory: 'Phone',
      itemName: 'Black iPhone 14',
      lastKnownLocation: 'Riddell Centre food court',
      dateLost: new Date('2026-07-10')
    },
    {
      itemCategory: 'Phone',
      itemTitle: 'Black iPhone',
      foundLocation: 'Riddell Centre',
      dateFound: new Date('2026-07-11')
    }
  );
  assert.ok(score >= 75);
  assert.equal(similarityFromScore(score), 'high');
});
