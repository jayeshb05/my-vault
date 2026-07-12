import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./supabase";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function getSettings() {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  return data;
}

export async function isSetupComplete(): Promise<boolean> {
  const settings = await getSettings();
  return settings?.setup_complete === true;
}

export async function needsSetup(): Promise<boolean> {
  return !(await isSetupComplete());
}

export async function setupPassword(password: string): Promise<void> {
  const hash = await hashPassword(password);
  const existing = await getSettings();

  if (existing) {
    await supabaseAdmin
      .from("settings")
      .update({ password_hash: hash, setup_complete: true, updated_at: new Date().toISOString() })
      .eq("id", 1);
  } else {
    await supabaseAdmin
      .from("settings")
      .insert({ id: 1, password_hash: hash, setup_complete: true });
  }
}

export async function checkPassword(password: string): Promise<boolean> {
  if (await needsSetup()) return false;
  const settings = await getSettings();
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
  await supabaseAdmin
    .from("settings")
    .update({ password_hash: hash, updated_at: new Date().toISOString() })
    .eq("id", 1);

  return { success: true };
}

export async function getAppSettings() {
  return getSettings();
}
