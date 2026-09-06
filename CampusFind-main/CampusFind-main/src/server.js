'use strict';

require('dotenv').config();

const { createApp } = require('./app');
const { connectDatabase, closeDatabase } = require('./config/database');

const port = Number(process.env.PORT) || 3000;

async function start() {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`CampusFind is running on http://localhost:${port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received. Shutting down...`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('CampusFind failed to start:', error);
  process.exit(1);
});
