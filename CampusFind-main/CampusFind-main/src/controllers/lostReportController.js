'use strict';

const lostReports = require('../repositories/lostReportRepository');
const { ITEM_CATEGORIES } = require('../constants/itemCategories');
const { nextLostReportReference } = require('../services/referenceService');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { cleanString, isValidEmail, isValidPhone, isValidDate } = require('../utils/validation');

const createLostReport = asyncHandler(async (req, res) => {
  if (req.user.role !== 'user') throw httpError(403, 'Only public user accounts can submit lost reports.');

  const email = req.user.email;
  const phone = cleanString(req.body.phone);
  const itemCategory = cleanString(req.body.itemCategory);
  const itemName = cleanString(req.body.itemName);
  const dateLost = cleanString(req.body.dateLost);
  const lastKnownLocation = cleanString(req.body.lastKnownLocation);
  const description = cleanString(req.body.description);

  if (!isValidEmail(email)) throw httpError(400, 'Enter a valid email address.');
  if (!isValidPhone(phone)) throw httpError(400, 'Enter a valid phone number.');
  if (!ITEM_CATEGORIES.includes(itemCategory)) throw httpError(400, 'Select a valid item category.');
  if (itemName.length < 2) throw httpError(400, 'Item name must contain at least 2 characters.');
  if (!isValidDate(dateLost)) throw httpError(400, 'Select a valid date lost.');
  if (new Date(dateLost) > new Date()) throw httpError(400, 'Date lost cannot be in the future.');
  if (lastKnownLocation.length < 2) throw httpError(400, 'Last known location is required.');
  if (description.length < 10) throw httpError(400, 'Description must contain at least 10 characters.');

  const referenceNumber = await nextLostReportReference();
  const report = await lostReports.createLostReport({
    referenceNumber,
    userId: req.user.id,
    fullName: req.user.fullName,
    email,
    phone,
    itemCategory,
    itemName,
    dateLost,
    lastKnownLocation,
    photoPath: req.file ? req.file.path : null,
    description,
    status: 'Open'
  });

  res.status(201).json({
    message: 'Lost item report submitted.',
    referenceNumber: report.referenceNumber,
    report: {
      id: report.id,
      referenceNumber: report.referenceNumber,
      itemName: report.itemName,
      status: report.status
    }
  });
});

const checkStatus = asyncHandler(async (req, res) => {
  const referenceNumber = cleanString(req.query.referenceNumber).toUpperCase();
  const email = cleanString(req.query.email).toLowerCase();

  if (!referenceNumber || !isValidEmail(email)) {
    throw httpError(400, 'A reference number and valid email address are required.');
  }

  const report = await lostReports.findByReferenceAndEmail(referenceNumber, email);
  if (!report) throw httpError(404, 'No report matches that reference number and email address.');

  res.json({
    report: {
      referenceNumber: report.referenceNumber,
      itemName: report.itemName,
      itemCategory: report.itemCategory,
      status: report.status,
      dateLost: report.dateLost,
      lastKnownLocation: report.lastKnownLocation,
      createdAt: report.createdAt
    }
  });
});

const myReports = asyncHandler(async (req, res) => {
  const reports = await lostReports.findByUserId(req.user.id);
  res.json({
    reports: reports.map((report) => ({
      id: report.id,
      referenceNumber: report.referenceNumber,
      itemName: report.itemName,
      itemCategory: report.itemCategory,
      status: report.status,
      dateLost: report.dateLost,
      lastKnownLocation: report.lastKnownLocation,
      createdAt: report.createdAt
    }))
  });
});

module.exports = { createLostReport, checkStatus, myReports };
