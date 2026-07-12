import bcrypt from "bcryptjs";
import { getDb, getSettings, isSetupComplete } from "./db";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setupPassword(password: string): Promise<void> {
  const db = getDb();
  const hash = await hashPassword(password);
  const existing = db.prepare("SELECT id FROM settings WHERE id = 1").get();

  if (existing) {
    db.prepare(
      `UPDATE settings SET password_hash = ?, setup_complete = 1, updated_at = datetime('now') WHERE id = 1`
    ).run(hash);
  } else {
    db.prepare(
      `INSERT INTO settings (id, password_hash, setup_complete) VALUES (1, ?, 1)`
    ).run(hash);
  }
}

export async function checkPassword(password: string): Promise<boolean> {
  if (!isSetupComplete()) return false;
  const settings = getSettings();
  if (!settings?.password_hash) return false;
  return verifyPassword(password, settings.password_hash);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const valid = await checkPassword(currentPassword);
  if (!valid) return { success: false, error: "Current password is incorrect" };

  const hash = await hashPassword(newPassword);
  const db = getDb();
  db.prepare(
    `UPDATE settings SET password_hash = ?, updated_at = datetime('now') WHERE id = 1`
  ).run(hash);

  return { success: true };
}

export function needsSetup(): boolean {
  return !isSetupComplete();
}
