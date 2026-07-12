import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "vault.db");

let db: Database.Database | null = null;

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL DEFAULT '',
      auto_lock_minutes INTEGER DEFAULT 15,
      theme TEXT DEFAULT 'system',
      setup_complete INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      is_pinned INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      category TEXT NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      login_at TEXT NOT NULL,
      logout_at TEXT,
      duration_seconds INTEGER,
      device_name TEXT,
      browser TEXT,
      os TEXT,
      ip_address TEXT,
      pwa_installed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      content_type TEXT,
      content_id TEXT,
      device_name TEXT,
      browser TEXT,
      os TEXT,
      ip_address TEXT,
      pwa_installed INTEGER DEFAULT 0,
      session_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned DESC, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_files_updated ON files(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
    CREATE INDEX IF NOT EXISTS idx_sessions_login ON sessions(login_at DESC);
  `);
}

export function getDb(): Database.Database {
  if (!db) {
    ensureDirs();
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    initSchema(db);
  }
  return db;
}

export function isSetupComplete(): boolean {
  const database = getDb();
  const row = database.prepare("SELECT setup_complete FROM settings WHERE id = 1").get() as
    | { setup_complete: number }
    | undefined;
  return row?.setup_complete === 1;
}

export function getSettings() {
  const database = getDb();
  return database.prepare("SELECT * FROM settings WHERE id = 1").get() as
    | {
        password_hash: string;
        auto_lock_minutes: number;
        theme: string;
        setup_complete: number;
      }
    | undefined;
}

export { DATA_DIR, DB_PATH };
