// db.ts — Supabase replaces SQLite/better-sqlite3
// All database access now goes through supabaseAdmin in each lib file.
// This file is kept for backward-compatible imports only.

export { supabaseAdmin as getDb } from "./supabase";

// These were filesystem paths — no longer needed
export const DATA_DIR = "";
export const DB_PATH = "";
