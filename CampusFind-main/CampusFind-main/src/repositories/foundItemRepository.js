'use strict';

const crypto = require('crypto');
const { query } = require('../config/database');

function mapFoundItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    itemTitle: row.item_title,
    itemCategory: row.item_category,
    dateFound: row.date_found,
    foundLocation: row.found_location,
    dropOffLocation: row.drop_off_location,
    privateVerificationNotes: row.private_verification_notes,
    status: row.status,
    createdByAdminId: row.created_by_admin_id,
    holdUntil: row.hold_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const columns = `id, item_title, item_category, date_found, found_location,
  drop_off_location, private_verification_notes, status,
  created_by_admin_id, hold_until, created_at, updated_at`;

async function createFoundItem(data, executor = { query }) {
  const id = crypto.randomUUID();
  const result = await executor.query(
    `INSERT INTO found_items
       (id, item_title, item_category, date_found, found_location,
        drop_off_location, private_verification_notes, status,
        created_by_admin_id, hold_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${columns}`,
    [
      id,
      data.itemTitle,
      data.itemCategory,
      data.dateFound,
      data.foundLocation,
      data.dropOffLocation,
      data.privateVerificationNotes || null,
      data.status || 'In Holding',
      data.createdByAdminId,
      data.holdUntil || null
    ]
  );
  return mapFoundItem(result.rows[0]);
}

async function findById(id, executor = { query }, options = {}) {
  const lock = options.forUpdate ? ' FOR UPDATE' : '';
  const result = await executor.query(
    `SELECT ${columns} FROM found_items WHERE id = $1${lock}`,
    [id]
  );
  return mapFoundItem(result.rows[0]);
}

async function updateStatus(id, status, executor = { query }) {
  const result = await executor.query(
    `UPDATE found_items
        SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING ${columns}`,
    [id, status]
  );
  return mapFoundItem(result.rows[0]);
}

async function countInHolding(executor = { query }) {
  const result = await executor.query(
    `SELECT COUNT(*)::int AS count
       FROM found_items
      WHERE status IN ('In Holding', 'Matched')`
  );
  return result.rows[0].count;
}

module.exports = { createFoundItem, findById, updateStatus, countInHolding };
