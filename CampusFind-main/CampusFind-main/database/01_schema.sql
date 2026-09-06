BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone VARCHAR(25),
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  photo_id_path TEXT,
  status VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE TABLE IF NOT EXISTS lost_report_counters (
  year INTEGER PRIMARY KEY,
  seq INTEGER NOT NULL DEFAULT 0 CHECK (seq >= 0)
);

CREATE TABLE IF NOT EXISTS lost_reports (
  id UUID PRIMARY KEY,
  reference_number VARCHAR(32) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  item_category VARCHAR(80) NOT NULL,
  item_name VARCHAR(160) NOT NULL,
  date_lost DATE NOT NULL,
  last_known_location VARCHAR(200) NOT NULL,
  photo_path TEXT,
  description VARCHAR(2000) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'Matched', 'Pending Verification', 'Resolved', 'Closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lost_reports_user_id ON lost_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_reports_status ON lost_reports(status);
CREATE INDEX IF NOT EXISTS idx_lost_reports_category ON lost_reports(item_category);
CREATE INDEX IF NOT EXISTS idx_lost_reports_date_lost ON lost_reports(date_lost);
CREATE INDEX IF NOT EXISTS idx_lost_reports_email_reference ON lost_reports(email, reference_number);

CREATE TABLE IF NOT EXISTS found_items (
  id UUID PRIMARY KEY,
  item_title VARCHAR(160) NOT NULL,
  item_category VARCHAR(80) NOT NULL,
  date_found DATE NOT NULL,
  found_location VARCHAR(200) NOT NULL,
  drop_off_location VARCHAR(200) NOT NULL,
  private_verification_notes VARCHAR(2000),
  status VARCHAR(16) NOT NULL DEFAULT 'In Holding'
    CHECK (status IN ('In Holding', 'Matched', 'Released', 'Disposed')),
  created_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  hold_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_found_items_status ON found_items(status);
CREATE INDEX IF NOT EXISTS idx_found_items_category ON found_items(item_category);
CREATE INDEX IF NOT EXISTS idx_found_items_date_found ON found_items(date_found);
CREATE INDEX IF NOT EXISTS idx_found_items_admin ON found_items(created_by_admin_id);

CREATE TABLE IF NOT EXISTS item_matches (
  id UUID PRIMARY KEY,
  lost_report_id UUID NOT NULL REFERENCES lost_reports(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  similarity VARCHAR(20) NOT NULL CHECK (similarity IN ('high', 'medium', 'low', 'manual review')),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending Review'
    CHECK (status IN ('Pending Review', 'Confirmed', 'Rejected')),
  reviewed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_status VARCHAR(16) NOT NULL DEFAULT 'Not Sent'
    CHECK (notification_status IN ('Not Sent', 'Sent', 'Skipped', 'Failed')),
  notification_attempted_at TIMESTAMPTZ,
  notification_sent_at TIMESTAMPTZ,
  notification_error VARCHAR(500),
  email_provider_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lost_report_id, found_item_id)
);


-- Add notification columns when upgrading an existing CampusFind database.
ALTER TABLE item_matches ADD COLUMN IF NOT EXISTS notification_status VARCHAR(16) NOT NULL DEFAULT 'Not Sent';
ALTER TABLE item_matches ADD COLUMN IF NOT EXISTS notification_attempted_at TIMESTAMPTZ;
ALTER TABLE item_matches ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;
ALTER TABLE item_matches ADD COLUMN IF NOT EXISTS notification_error VARCHAR(500);
ALTER TABLE item_matches ADD COLUMN IF NOT EXISTS email_provider_id VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_matches_notification_status_check'
  ) THEN
    ALTER TABLE item_matches
      ADD CONSTRAINT item_matches_notification_status_check
      CHECK (notification_status IN ('Not Sent', 'Sent', 'Skipped', 'Failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_item_matches_status ON item_matches(status);
CREATE INDEX IF NOT EXISTS idx_item_matches_lost_report ON item_matches(lost_report_id);
CREATE INDEX IF NOT EXISTS idx_item_matches_found_item ON item_matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_item_matches_score ON item_matches(score DESC);
CREATE INDEX IF NOT EXISTS idx_item_matches_notification_status ON item_matches(notification_status);

CREATE TABLE IF NOT EXISTS release_logs (
  id UUID PRIMARY KEY,
  found_item_id UUID NOT NULL REFERENCES found_items(id) ON DELETE RESTRICT,
  lost_report_id UUID NOT NULL REFERENCES lost_reports(id) ON DELETE RESTRICT,
  released_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  released_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  release_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_details_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  notes VARCHAR(2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_logs_found_item ON release_logs(found_item_id);
CREATE INDEX IF NOT EXISTS idx_release_logs_lost_report ON release_logs(lost_report_id);
CREATE INDEX IF NOT EXISTS idx_release_logs_release_date ON release_logs(release_date DESC);

COMMIT;
