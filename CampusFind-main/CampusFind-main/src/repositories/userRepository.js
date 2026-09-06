'use strict';

const crypto = require('crypto');
const { query } = require('../config/database');

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    phone: row.phone,
    role: row.role,
    photoIdPath: row.photo_id_path,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function findByEmail(email, executor = { query }) {
  const result = await executor.query(
    `SELECT id, full_name, email, password_hash, phone, role, photo_id_path,
            status, created_at, updated_at
       FROM users
      WHERE email = $1`,
    [email]
  );
  return mapUser(result.rows[0]);
}

async function findById(id, executor = { query }) {
  const result = await executor.query(
    `SELECT id, full_name, email, password_hash, phone, role, photo_id_path,
            status, created_at, updated_at
       FROM users
      WHERE id = $1`,
    [id]
  );
  return mapUser(result.rows[0]);
}

async function createUser(data, executor = { query }) {
  const id = crypto.randomUUID();
  const result = await executor.query(
    `INSERT INTO users
       (id, full_name, email, password_hash, phone, role, photo_id_path, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, full_name, email, password_hash, phone, role, photo_id_path,
               status, created_at, updated_at`,
    [
      id,
      data.fullName,
      data.email,
      data.passwordHash,
      data.phone || null,
      data.role || 'user',
      data.photoIdPath || null,
      data.status || 'active'
    ]
  );
  return mapUser(result.rows[0]);
}

async function upsertAdmin(data, executor = { query }) {
  const id = crypto.randomUUID();
  const result = await executor.query(
    `INSERT INTO users
       (id, full_name, email, password_hash, phone, role, status)
     VALUES ($1, $2, $3, $4, $5, 'admin', 'active')
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       phone = EXCLUDED.phone,
       role = 'admin',
       status = 'active',
       updated_at = NOW()
     RETURNING id, full_name, email, password_hash, phone, role, photo_id_path,
               status, created_at, updated_at`,
    [id, data.fullName, data.email, data.passwordHash, data.phone || null]
  );
  return mapUser(result.rows[0]);
}

module.exports = { findByEmail, findById, createUser, upsertAdmin };
