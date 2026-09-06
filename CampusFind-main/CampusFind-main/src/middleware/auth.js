'use strict';

const jwt = require('jsonwebtoken');
const users = require('../repositories/userRepository');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');

const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw httpError(401, 'Authentication is required.');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, 'Your session is invalid or has expired. Please log in again.');
  }

  const user = await users.findById(payload.sub);
  if (!user || user.status !== 'active') {
    throw httpError(401, 'This account is not available.');
  }

  req.user = user;
  next();
});

function authorize(...roles) {
  return function authorizeRole(req, _res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(httpError(403, 'You do not have permission to perform this action.'));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
