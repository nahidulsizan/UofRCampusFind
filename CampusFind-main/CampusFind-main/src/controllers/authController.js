'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../repositories/userRepository');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { cleanString, isValidEmail, isValidPhone } = require('../utils/validation');

function createToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw httpError(500, 'JWT_SECRET must contain at least 32 characters.');
  }

  return jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET,
    { subject: user.id, expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role
  };
}

const signup = asyncHandler(async (req, res) => {
  const fullName = cleanString(req.body.fullName);
  const email = cleanString(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  const phone = cleanString(req.body.phone);

  if (fullName.length < 2) throw httpError(400, 'Full name must contain at least 2 characters.');
  if (!isValidEmail(email)) throw httpError(400, 'Enter a valid email address.');
  if (password.length < 8) throw httpError(400, 'Password must contain at least 8 characters.');
  if (!isValidPhone(phone)) throw httpError(400, 'Enter a valid phone number.');

  const existing = await users.findByEmail(email);
  if (existing) throw httpError(409, 'An account already exists for this email address.');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await users.createUser({
    fullName,
    email,
    passwordHash,
    phone,
    role: 'user',
    photoIdPath: req.file ? req.file.path : null
  });

  res.status(201).json({
    message: 'Account created successfully.',
    user: publicUser(user)
  });
});

async function loginForRole(req, res, expectedRole) {
  const email = cleanString(req.body.email).toLowerCase();
  const password = String(req.body.password || '');

  if (!isValidEmail(email) || !password) {
    throw httpError(400, 'Email and password are required.');
  }

  const user = await users.findByEmail(email);
  if (!user || user.status !== 'active') throw httpError(401, 'Invalid email or password.');
  if (user.role !== expectedRole) {
    throw httpError(
      403,
      expectedRole === 'admin'
        ? 'This is not an administrator account.'
        : 'Use the administrator login page for this account.'
    );
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) throw httpError(401, 'Invalid email or password.');

  const token = createToken(user);
  res.json({ token, user: publicUser(user) });
}

const login = asyncHandler((req, res) => loginForRole(req, res, 'user'));
const adminLogin = asyncHandler((req, res) => loginForRole(req, res, 'admin'));

const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = { signup, login, adminLogin, me };
