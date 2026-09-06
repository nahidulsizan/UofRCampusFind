'use strict';

const express = require('express');
const { createFoundItem } = require('../controllers/foundItemController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.post('/', authenticate, authorize('admin'), createFoundItem);

module.exports = router;
