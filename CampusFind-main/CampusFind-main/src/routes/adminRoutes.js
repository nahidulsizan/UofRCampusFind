'use strict';

const express = require('express');
const { dashboard } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.get('/dashboard', authenticate, authorize('admin'), dashboard);

module.exports = router;
