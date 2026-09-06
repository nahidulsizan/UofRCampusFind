'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { signup, login, adminLogin, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { uploadPrivatePhotoId } = require('../middleware/upload');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' }
});

router.post('/signup', authLimiter, uploadPrivatePhotoId, signup);
router.post('/login', authLimiter, login);
router.post('/admin/login', authLimiter, adminLogin);
router.get('/me', authenticate, me);

module.exports = router;
