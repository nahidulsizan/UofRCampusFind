'use strict';

const crypto = require('crypto');
const { query } = require('../config/database');

async function createReleaseLog(data, executor = { query }) {
  const id = crypto.randomUUID();
  const result = await executor.query(
    `INSERT INTO release_logs
       (id, found_item_id, lost_report_id, released_to_user_id,
        released_by_admin_id, verification_details_confirmed, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, found_item_id, lost_report_id, released_to_user_id,
               released_by_admin_id, release_date,
               verification_details_confirmed, notes, created_at`,
    [
      id,
      data.foundItemId,
      data.lostReportId,
      data.releasedToUserId || null,
      data.releasedByAdminId,
      data.verificationDetailsConfirmed !== false,
      data.notes || null
    ]
  );
  return {
    id: result.rows[0].id,
    _id: result.rows[0].id,
    releaseDate: result.rows[0].release_date
  };
}

async function findRecent(executor = { query }) {
  const result = await executor.query(
    `SELECT
       r.id AS release_id,
       r.release_date,
       r.notes,
       lr.id AS lost_id,
       lr.reference_number,
       lr.item_name,
       fi.id AS found_id,
       fi.item_title
     FROM release_logs AS r
     JOIN lost_reports AS lr ON lr.id = r.lost_report_id
     JOIN found_items AS fi ON fi.id = r.found_item_id
     WHERE r.release_date >= NOW() - INTERVAL '7 days'
     ORDER BY r.release_date DESC
     LIMIT 20`
  );

  return result.rows.map((row) => ({
    id: row.release_id,
    _id: row.release_id,
    releaseDate: row.release_date,
    notes: row.notes,
    lostReportId: {
      id: row.lost_id,
      _id: row.lost_id,
      referenceNumber: row.reference_number,
      itemName: row.item_name
    },
    foundItemId: {
      id: row.found_id,
      _id: row.found_id,
      itemTitle: row.item_title
    }
  }));
}

module.exports = { createReleaseLog, findRecent };
