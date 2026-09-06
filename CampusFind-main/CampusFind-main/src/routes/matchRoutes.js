'use strict';

const express = require('express');
const { confirmMatch, rejectMatch } = require('../controllers/matchController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.patch('/:id/confirm', authenticate, authorize('admin'), confirmMatch);
router.patch('/:id/reject', authenticate, authorize('admin'), rejectMatch);

module.exports = router;
