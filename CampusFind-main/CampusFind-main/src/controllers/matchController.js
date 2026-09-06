'use strict';

const { withTransaction } = require('../config/database');
const matches = require('../repositories/matchRepository');
const lostReports = require('../repositories/lostReportRepository');
const foundItems = require('../repositories/foundItemRepository');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');

const confirmMatch = asyncHandler(async (req, res) => {
  const match = await withTransaction(async (client) => {
    const current = await matches.findById(req.params.id, client, { forUpdate: true });
    if (!current) throw httpError(404, 'Match not found.');
    if (current.status === 'Rejected') throw httpError(409, 'A rejected match cannot be confirmed.');

    const updated = await matches.updateReview(current.id, 'Confirmed', req.user.id, client);
    await lostReports.updateStatus(current.lostReportId, 'Pending Verification', client);
    await foundItems.updateStatus(current.foundItemId, 'Matched', client);
    return updated;
  });

  res.json({ message: 'Match confirmed.', match });
});

const rejectMatch = asyncHandler(async (req, res) => {
  const match = await withTransaction(async (client) => {
    const current = await matches.findById(req.params.id, client, { forUpdate: true });
    if (!current) throw httpError(404, 'Match not found.');

    const updated = await matches.updateReview(current.id, 'Rejected', req.user.id, client);
    const [otherLostMatches, otherFoundMatches] = await Promise.all([
      matches.countActiveForLostReport(current.lostReportId, client),
      matches.countActiveForFoundItem(current.foundItemId, client)
    ]);

    if (otherLostMatches === 0) {
      await lostReports.updateStatus(current.lostReportId, 'Open', client);
    }
    if (otherFoundMatches === 0) {
      await foundItems.updateStatus(current.foundItemId, 'In Holding', client);
    }
    return updated;
  });

  res.json({ message: 'Match rejected.', match });
});

module.exports = { confirmMatch, rejectMatch };
