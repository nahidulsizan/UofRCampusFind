'use strict';

const crypto = require('crypto');
const { query } = require('../config/database');

function mapLostReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    referenceNumber: row.reference_number,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    itemCategory: row.item_category,
    itemName: row.item_name,
    dateLost: row.date_lost,
    lastKnownLocation: row.last_known_location,
    photoPath: row.photo_path,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const columns = `id, reference_number, user_id, full_name, email, phone,
  item_category, item_name, date_lost, last_known_location, photo_path,
  description, status, created_at, updated_at`;

async function createLostReport(data, executor = { query }) {
  const id = crypto.randomUUID();
  const result = await executor.query(
    `INSERT INTO lost_reports
       (id, reference_number, user_id, full_name, email, phone, item_category,
        item_name, date_lost, last_known_location, photo_path, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING ${columns}`,
    [
      id,
      data.referenceNumber,
      data.userId,
      data.fullName,
      data.email,
      data.phone,
      data.itemCategory,
      data.itemName,
      data.dateLost,
      data.lastKnownLocation,
      data.photoPath || null,
      data.description,
      data.status || 'Open'
    ]
  );
  return mapLostReport(result.rows[0]);
}

async function findByReferenceAndEmail(referenceNumber, email, executor = { query }) {
  const result = await executor.query(
    `SELECT ${columns}
       FROM lost_reports
      WHERE reference_number = $1 AND email = $2`,
    [referenceNumber, email]
  );
  return mapLostReport(result.rows[0]);
}

async function findByUserId(userId, executor = { query }) {
  const result = await executor.query(
    `SELECT ${columns}
       FROM lost_reports
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(mapLostReport);
}

async function findById(id, executor = { query }, options = {}) {
  const lock = options.forUpdate ? ' FOR UPDATE' : '';
  const result = await executor.query(
    `SELECT ${columns} FROM lost_reports WHERE id = $1${lock}`,
    [id]
  );
  return mapLostReport(result.rows[0]);
}

async function findMatchCandidates({ itemCategory, dateFound }, executor = { query }) {
  const result = await executor.query(
    `SELECT ${columns}
       FROM lost_reports
      WHERE status IN ('Open', 'Matched')
        AND date_lost <= $1
        AND item_category = $2
      ORDER BY created_at DESC
      LIMIT 200`,
    [dateFound, itemCategory]
  );
  return result.rows.map(mapLostReport);
}

async function updateStatus(id, status, executor = { query }) {
  const result = await executor.query(
    `UPDATE lost_reports
        SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING ${columns}`,
    [id, status]
  );
  return mapLostReport(result.rows[0]);
}

async function countOpen(executor = { query }) {
  const result = await executor.query(
    `SELECT COUNT(*)::int AS count FROM lost_reports WHERE status = 'Open'`
  );
  return result.rows[0].count;
}

module.exports = {
  createLostReport,
  findByReferenceAndEmail,
  findByUserId,
  findById,
  findMatchCandidates,
  updateStatus,
  countOpen
};
