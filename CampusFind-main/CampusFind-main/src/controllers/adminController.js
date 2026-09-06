'use strict';

const foundItems = require('../repositories/foundItemRepository');
const lostReports = require('../repositories/lostReportRepository');
const matches = require('../repositories/matchRepository');
const releases = require('../repositories/releaseRepository');
const { asyncHandler } = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (_req, res) => {
  const [itemsInHolding, openLostReports, matchesPendingReview, recentMatches, recentReleases] = await Promise.all([
    foundItems.countInHolding(),
    lostReports.countOpen(),
    matches.countPending(),
    matches.findRecentForDashboard(),
    releases.findRecent()
  ]);

  res.json({
    metrics: { itemsInHolding, openLostReports, matchesPendingReview },
    recentMatches,
    recentReleases
  });
});

module.exports = { dashboard };
