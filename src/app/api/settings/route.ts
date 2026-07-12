import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, jsonResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const db = getDb();
  const settings = db.prepare("SELECT auto_lock_minutes, theme, setup_complete FROM settings WHERE id = 1").get();
  return jsonResponse({ settings });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { auto_lock_minutes, theme } = await req.json();
  const db = getDb();

  if (auto_lock_minutes !== undefined) {
    db.prepare("UPDATE settings SET auto_lock_minutes = ?, updated_at = datetime('now') WHERE id = 1").run(auto_lock_minutes);
  }
  if (theme !== undefined) {
    db.prepare("UPDATE settings SET theme = ?, updated_at = datetime('now') WHERE id = 1").run(theme);
  }

  const settings = db.prepare("SELECT auto_lock_minutes, theme, setup_complete FROM settings WHERE id = 1").get();
  return jsonResponse({ settings });
}
