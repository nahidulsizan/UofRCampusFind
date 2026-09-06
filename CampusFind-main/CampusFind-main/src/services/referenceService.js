'use strict';

const { query } = require('../config/database');

async function nextLostReportReference(date = new Date(), executor = { query }) {
  const year = date.getUTCFullYear();
  const result = await executor.query(
    `INSERT INTO lost_report_counters (year, seq)
     VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE
       SET seq = lost_report_counters.seq + 1
     RETURNING seq`,
    [year]
  );

  return `CF-${year}-${String(result.rows[0].seq).padStart(4, '0')}`;
}

module.exports = { nextLostReportReference };
