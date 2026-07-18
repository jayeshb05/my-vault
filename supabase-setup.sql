-- ============================================================
-- Lily — Supabase PostgreSQL Setup
-- Run this entire script in Supabase SQL Editor once
-- ============================================================

-- Settings (single row, id = 1)
CREATE TABLE IF NOT EXISTS settings (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL DEFAULT '',
  auto_lock_minutes INTEGER DEFAULT 15,
  theme       TEXT DEFAULT 'system',
  setup_complete BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  is_pinned   BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_updated  ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_pinned   ON notes(is_pinned DESC, updated_at DESC);

-- Files (metadata only — actual files in Supabase Storage)
CREATE TABLE IF NOT EXISTS files (
  id            TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  category      TEXT NOT NULL,
  is_favorite   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_updated  ON files(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id               TEXT PRIMARY KEY,
  login_at         TIMESTAMPTZ NOT NULL,
  logout_at        TIMESTAMPTZ,
  duration_seconds INTEGER,
  device_name      TEXT,
  browser          TEXT,
  os               TEXT,
  ip_address       TEXT,
  pwa_installed    BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sessions_login ON sessions(login_at DESC);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id           TEXT PRIMARY KEY,
  action       TEXT NOT NULL,
  details      TEXT DEFAULT '',
  content_type TEXT,
  content_id   TEXT,
  device_name  TEXT,
  browser      TEXT,
  os           TEXT,
  ip_address   TEXT,
  pwa_installed BOOLEAN DEFAULT FALSE,
  session_id   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action  ON activity_logs(action);

-- ============================================================
-- Row Level Security — DISABLE for all tables
-- (App uses service_role key server-side, RLS not needed)
-- ============================================================
ALTER TABLE settings      DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes         DISABLE ROW LEVEL SECURITY;
ALTER TABLE files         DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
