'use strict';

const express = require('express');
const { createLostReport, checkStatus, myReports } = require('../controllers/lostReportController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadLostItemPhoto } = require('../middleware/upload');

const router = express.Router();

router.get('/status', checkStatus);
router.get('/mine', authenticate, authorize('user'), myReports);
router.post('/', authenticate, authorize('user'), uploadLostItemPhoto, createLostReport);

module.exports = router;
