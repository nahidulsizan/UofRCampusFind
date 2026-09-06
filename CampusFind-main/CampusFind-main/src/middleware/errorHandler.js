'use strict';

const multer = require('multer');

function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let message = error.message || 'Unexpected server error.';

  if (error instanceof multer.MulterError) {
    status = 400;
    if (error.code === 'LIMIT_FILE_SIZE') message = 'The uploaded file must be 5 MB or smaller.';
    else message = 'Only one JPG, PNG, or PDF file may be uploaded.';
  } else if (error.code === '23505') {
    status = 409;
    message = 'A record with that value already exists.';
  } else if (error.code === '23503') {
    status = 409;
    message = 'This record is still linked to other data and cannot be changed that way.';
  } else if (error.code === '23514') {
    status = 400;
    message = 'One of the supplied values is not allowed.';
  } else if (error.code === '22P02') {
    status = 400;
    message = 'The requested record ID is invalid.';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }

  res.status(status).json({
    message,
    ...(error.details ? { details: error.details } : {}),
    ...(process.env.NODE_ENV !== 'production' && status === 500 ? { stack: error.stack } : {})
  });
}

module.exports = { notFound, errorHandler };
