'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const lostReportRoutes = require('./routes/lostReportRoutes');
const foundItemRoutes = require('./routes/foundItemRoutes');
const adminRoutes = require('./routes/adminRoutes');
const matchRoutes = require('./routes/matchRoutes');
const releaseRoutes = require('./routes/releaseRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  const publicDirectory = path.join(__dirname, '..', 'public');

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '250kb' }));
  app.use(express.urlencoded({ extended: false, limit: '250kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'CampusFind', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/lost-reports', lostReportRoutes);
  app.use('/api/found-items', foundItemRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/release', releaseRoutes);

  app.use(express.static(publicDirectory, { extensions: ['html'] }));

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
