'use strict';

const crypto = require('crypto');
const { query } = require('../config/database');

function mapMatch(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    lostReportId: row.lost_report_id,
    foundItemId: row.found_item_id,
    score: row.score,
    similarity: row.similarity,
    status: row.status,
    reviewedByAdminId: row.reviewed_by_admin_id,
    notificationStatus: row.notification_status,
    notificationAttemptedAt: row.notification_attempted_at,
    notificationSentAt: row.notification_sent_at,
    notificationError: row.notification_error,
    emailProviderId: row.email_provider_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const columns = `id, lost_report_id, found_item_id, score, similarity, status,
  reviewed_by_admin_id, notification_status, notification_attempted_at,
  notification_sent_at, notification_error, email_provider_id, created_at, updated_at`;

async function insertCandidate(data, executor = { query }) {
  const id = crypto.randomUUID();
  const result = await executor.query(
    `INSERT INTO item_matches
       (id, lost_report_id, found_item_id, score, similarity, status)
     VALUES ($1, $2, $3, $4, $5, 'Pending Review')
     ON CONFLICT (lost_report_id, found_item_id) DO NOTHING
     RETURNING ${columns}`,
    [id, data.lostReportId, data.foundItemId, data.score, data.similarity]
  );
  return mapMatch(result.rows[0]);
}


async function markNotificationSent(id, providerId, executor = { query }) {
  const result = await executor.query(
    `UPDATE item_matches
        SET notification_status = 'Sent',
            notification_attempted_at = NOW(),
            notification_sent_at = NOW(),
            notification_error = NULL,
            email_provider_id = $2,
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${columns}`,
    [id, providerId || null]
  );
  return mapMatch(result.rows[0]);
}

async function markNotificationFailed(id, errorMessage, executor = { query }) {
  const result = await executor.query(
    `UPDATE item_matches
        SET notification_status = 'Failed',
            notification_attempted_at = NOW(),
            notification_error = LEFT($2, 500),
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${columns}`,
    [id, String(errorMessage || 'Unknown email error')]
  );
  return mapMatch(result.rows[0]);
}

async function markNotificationSkipped(id, reason, executor = { query }) {
  const result = await executor.query(
    `UPDATE item_matches
        SET notification_status = 'Skipped',
            notification_attempted_at = NOW(),
            notification_error = LEFT($2, 500),
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${columns}`,
    [id, String(reason || 'Notification skipped')]
  );
  return mapMatch(result.rows[0]);
}

async function findById(id, executor = { query }, options = {}) {
  const lock = options.forUpdate ? ' FOR UPDATE' : '';
  const result = await executor.query(
    `SELECT ${columns} FROM item_matches WHERE id = $1${lock}`,
    [id]
  );
  return mapMatch(result.rows[0]);
}

async function updateReview(id, status, reviewedByAdminId, executor = { query }) {
  const result = await executor.query(
    `UPDATE item_matches
        SET status = $2,
            reviewed_by_admin_id = $3,
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${columns}`,
    [id, status, reviewedByAdminId]
  );
  return mapMatch(result.rows[0]);
}

async function countActiveForLostReport(lostReportId, executor = { query }) {
  const result = await executor.query(
    `SELECT COUNT(*)::int AS count
       FROM item_matches
      WHERE lost_report_id = $1
        AND status IN ('Pending Review', 'Confirmed')`,
    [lostReportId]
  );
  return result.rows[0].count;
}

async function countActiveForFoundItem(foundItemId, executor = { query }) {
  const result = await executor.query(
    `SELECT COUNT(*)::int AS count
       FROM item_matches
      WHERE found_item_id = $1
        AND status IN ('Pending Review', 'Confirmed')`,
    [foundItemId]
  );
  return result.rows[0].count;
}

async function countPending(executor = { query }) {
  const result = await executor.query(
    `SELECT COUNT(*)::int AS count
       FROM item_matches
      WHERE status = 'Pending Review'`
  );
  return result.rows[0].count;
}

async function findRecentForDashboard(executor = { query }) {
  const result = await executor.query(
    `SELECT
       m.id AS match_id,
       m.score,
       m.similarity,
       m.status AS match_status,
       m.notification_status,
       m.notification_sent_at,
       m.created_at AS match_created_at,
       lr.id AS lost_id,
       lr.reference_number,
       lr.item_name,
       lr.item_category AS lost_item_category,
       lr.email AS lost_email,
       lr.date_lost,
       lr.last_known_location,
       fi.id AS found_id,
       fi.item_title,
       fi.item_category AS found_item_category,
       fi.date_found,
       fi.found_location,
       fi.status AS found_status
     FROM item_matches AS m
     JOIN lost_reports AS lr ON lr.id = m.lost_report_id
     JOIN found_items AS fi ON fi.id = m.found_item_id
     WHERE m.status IN ('Pending Review', 'Confirmed')
       AND fi.status <> 'Released'
       AND lr.status <> 'Resolved'
     ORDER BY m.score DESC, m.created_at DESC
     LIMIT 12`
  );

  return result.rows.map((row) => ({
    id: row.match_id,
    _id: row.match_id,
    score: row.score,
    similarity: row.similarity,
    status: row.match_status,
    notificationStatus: row.notification_status,
    notificationSentAt: row.notification_sent_at,
    createdAt: row.match_created_at,
    lostReportId: {
      id: row.lost_id,
      _id: row.lost_id,
      referenceNumber: row.reference_number,
      itemName: row.item_name,
      itemCategory: row.lost_item_category,
      email: row.lost_email,
      dateLost: row.date_lost,
      lastKnownLocation: row.last_known_location
    },
    foundItemId: {
      id: row.found_id,
      _id: row.found_id,
      itemTitle: row.item_title,
      itemCategory: row.found_item_category,
      dateFound: row.date_found,
      foundLocation: row.found_location,
      status: row.found_status
    }
  }));
}

module.exports = {
  insertCandidate,
  markNotificationSent,
  markNotificationFailed,
  markNotificationSkipped,
  findById,
  updateReview,
  countActiveForLostReport,
  countActiveForFoundItem,
  countPending,
  findRecentForDashboard
};
