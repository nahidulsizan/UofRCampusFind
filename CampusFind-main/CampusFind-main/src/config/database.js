'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let pool;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not configured. Copy .env.example to .env and add your PostgreSQL connection string.');
  }
  return url;
}

function getSslConfig(databaseUrl) {
  const mode = String(process.env.PGSSLMODE || '').toLowerCase();
  if (mode === 'disable') return false;
  if (mode === 'require') return { rejectUnauthorized: false };
  if (/localhost|127\.0\.0\.1/.test(databaseUrl)) return false;
  return undefined;
}

function getPool() {
  if (!pool) {
    const databaseUrl = getDatabaseUrl();
    const ssl = getSslConfig(databaseUrl);
    const options = {
      connectionString: databaseUrl,
      max: Number(process.env.PG_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };
    if (ssl !== undefined) options.ssl = ssl;
    pool = new Pool(options);

    pool.on('error', (error) => {
      console.error('Unexpected PostgreSQL pool error:', error);
    });
  }
  return pool;
}

async function applySchema() {
  const schemaPath = path.join(__dirname, '..', '..', 'database', '01_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await getPool().query(schema);
}

async function connectDatabase() {
  const database = getPool();
  const result = await database.query('SELECT current_database() AS name, NOW() AS connected_at');
  await applySchema();
  console.log(`PostgreSQL connected: ${result.rows[0].name}`);
}

async function query(text, values) {
  return getPool().query(text, values);
}

async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function closeDatabase() {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}

module.exports = { connectDatabase, closeDatabase, query, withTransaction };
