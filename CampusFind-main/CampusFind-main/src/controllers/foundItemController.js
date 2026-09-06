'use strict';

const foundItems = require('../repositories/foundItemRepository');
const { ITEM_CATEGORIES } = require('../constants/itemCategories');
const { createPossibleMatches } = require('../services/matchingService');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { cleanString, isValidDate } = require('../utils/validation');

const createFoundItem = asyncHandler(async (req, res) => {
  const itemTitle = cleanString(req.body.itemTitle);
  const itemCategory = cleanString(req.body.itemCategory);
  const dateFound = cleanString(req.body.dateFound);
  const foundLocation = cleanString(req.body.foundLocation);
  const dropOffLocation = cleanString(req.body.dropOffLocation);
  const privateVerificationNotes = cleanString(req.body.privateVerificationNotes);

  if (itemTitle.length < 2) throw httpError(400, 'Item title must contain at least 2 characters.');
  if (!ITEM_CATEGORIES.includes(itemCategory)) throw httpError(400, 'Select a valid item category.');
  if (!isValidDate(dateFound)) throw httpError(400, 'Select a valid date found.');
  if (new Date(dateFound) > new Date()) throw httpError(400, 'Date found cannot be in the future.');
  if (foundLocation.length < 2) throw httpError(400, 'Found location is required.');
  if (dropOffLocation.length < 2) throw httpError(400, 'Drop-off location is required.');

  const holdUntil = new Date();
  holdUntil.setDate(holdUntil.getDate() + 14);

  const foundItem = await foundItems.createFoundItem({
    itemTitle,
    itemCategory,
    dateFound,
    foundLocation,
    dropOffLocation,
    privateVerificationNotes: privateVerificationNotes || null,
    createdByAdminId: req.user.id,
    holdUntil
  });

  const matchResult = await createPossibleMatches(foundItem);
  const emailsSent = matchResult.notifications.filter((item) => item.status === 'sent').length;
  const emailFailures = matchResult.notifications.filter((item) => item.status === 'failed').length;

  res.status(201).json({
    message: 'Found item saved.',
    foundItem: {
      id: foundItem.id,
      itemTitle: foundItem.itemTitle,
      status: foundItem.status,
      holdUntil: foundItem.holdUntil
    },
    matchesCreated: matchResult.matches.length,
    emailsSent,
    emailFailures
  });
});

module.exports = { createFoundItem };
