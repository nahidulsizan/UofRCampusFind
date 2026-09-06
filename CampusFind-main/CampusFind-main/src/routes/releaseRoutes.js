'use strict';

const express = require('express');
const { releaseItem } = require('../controllers/releaseController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.post('/:id', authenticate, authorize('admin'), releaseItem);

module.exports = router;
