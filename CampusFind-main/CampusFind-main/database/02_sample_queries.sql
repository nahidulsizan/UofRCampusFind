-- CampusFind PostgreSQL reference queries.
-- Run 01_schema.sql first. These examples use placeholders and are not meant
-- to be executed as one complete script without replacing values.

-- Create a user (password_hash must come from bcrypt in the application):
-- INSERT INTO users (id, full_name, email, password_hash, phone, role)
-- VALUES ('00000000-0000-4000-8000-000000000001', 'Demo User',
--         'demo@example.com', '$2b$12$...', '306-555-0100', 'user');

-- Find a report by public reference and email:
SELECT reference_number, item_name, item_category, status, date_lost,
       last_known_location, created_at
FROM lost_reports
WHERE reference_number = 'CF-2026-0001'
  AND email = 'demo@example.com';

-- Dashboard counts:
SELECT COUNT(*) AS items_in_holding
FROM found_items
WHERE status IN ('In Holding', 'Matched');

SELECT COUNT(*) AS open_lost_reports
FROM lost_reports
WHERE status = 'Open';

SELECT COUNT(*) AS matches_pending_review
FROM item_matches
WHERE status = 'Pending Review';

-- Match queue with related lost and found records:
SELECT
  m.id,
  m.score,
  m.similarity,
  m.status,
  m.notification_status,
  m.notification_sent_at,
  lr.reference_number,
  lr.item_name,
  lr.last_known_location,
  fi.item_title,
  fi.found_location
FROM item_matches AS m
JOIN lost_reports AS lr ON lr.id = m.lost_report_id
JOIN found_items AS fi ON fi.id = m.found_item_id
WHERE m.status IN ('Pending Review', 'Confirmed')
ORDER BY m.score DESC, m.created_at DESC;

-- Items past their holding date:
SELECT id, item_title, hold_until
FROM found_items
WHERE status = 'In Holding'
  AND hold_until < NOW()
ORDER BY hold_until;


-- Email notification audit:
SELECT
  m.id,
  m.score,
  m.notification_status,
  m.notification_attempted_at,
  m.notification_sent_at,
  m.notification_error,
  lr.reference_number,
  lr.email
FROM item_matches AS m
JOIN lost_reports AS lr ON lr.id = m.lost_report_id
ORDER BY m.created_at DESC;
