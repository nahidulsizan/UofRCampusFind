'use strict';

const { withTransaction } = require('../config/database');
const matches = require('../repositories/matchRepository');
const lostReports = require('../repositories/lostReportRepository');
const foundItems = require('../repositories/foundItemRepository');
const releases = require('../repositories/releaseRepository');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { cleanString } = require('../utils/validation');

const releaseItem = asyncHandler(async (req, res) => {
  const log = await withTransaction(async (client) => {
    const match = await matches.findById(req.params.id, client, { forUpdate: true });
    if (!match) throw httpError(404, 'Match not found.');
    if (match.status !== 'Confirmed') throw httpError(409, 'Confirm the match before releasing the item.');

    const [lostReport, foundItem] = await Promise.all([
      lostReports.findById(match.lostReportId, client, { forUpdate: true }),
      foundItems.findById(match.foundItemId, client, { forUpdate: true })
    ]);

    if (!lostReport || !foundItem) {
      throw httpError(404, 'The linked lost or found record no longer exists.');
    }
    if (foundItem.status === 'Released') {
      throw httpError(409, 'This item has already been released.');
    }

    const releaseLog = await releases.createReleaseLog(
      {
        foundItemId: foundItem.id,
        lostReportId: lostReport.id,
        releasedToUserId: lostReport.userId,
        releasedByAdminId: req.user.id,
        verificationDetailsConfirmed: true,
        notes: cleanString(req.body.notes) || 'Released after in-person ownership verification.'
      },
      client
    );

    await foundItems.updateStatus(foundItem.id, 'Released', client);
    await lostReports.updateStatus(lostReport.id, 'Resolved', client);
    return releaseLog;
  });

  res.status(201).json({ message: 'Item released and audit log created.', releaseLogId: log.id });
});

module.exports = { releaseItem };
