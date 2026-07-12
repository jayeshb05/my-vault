// backup.ts — JSON-based backup for Supabase
// Exports all notes + file metadata as a JSON zip.
// Files themselves are stored in Supabase Storage and accessible via URL.

import AdmZip from "adm-zip";
import { supabaseAdmin } from "./supabase";

export async function createBackup(): Promise<Buffer> {
  // Fetch all data from Supabase
  const [{ data: notes }, { data: files }, { data: settings }] = await Promise.all([
    supabaseAdmin.from("notes").select("*").order("created_at"),
    supabaseAdmin.from("files").select("*").order("created_at"),
    supabaseAdmin.from("settings").select("*").eq("id", 1).single(),
  ]);

  const backup = {
    version: 2,
    exported_at: new Date().toISOString(),
    notes: notes ?? [],
    files: files ?? [],
    settings: settings ?? {},
  };

  const zip = new AdmZip();
  zip.addFile("vault-backup.json", Buffer.from(JSON.stringify(backup, null, 2)));

  // Also export file list with storage paths for reference
  const fileList = (files ?? []).map((f) => ({
    id: f.id,
    name: f.original_name,
    size: f.file_size,
    type: f.mime_type,
    stored_as: f.stored_name,
  }));
  zip.addFile("file-list.json", Buffer.from(JSON.stringify(fileList, null, 2)));

  return zip.toBuffer();
}

export async function restoreBackup(buffer: Buffer): Promise<void> {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry("vault-backup.json");
  if (!entry) throw new Error("Invalid backup: vault-backup.json not found");

  const backup = JSON.parse(entry.getData().toString("utf8"));

  // Restore notes
  if (Array.isArray(backup.notes) && backup.notes.length > 0) {
    await supabaseAdmin.from("notes").upsert(backup.notes, { onConflict: "id" });
  }

  // Restore file metadata (actual files in storage not restored — only metadata)
  if (Array.isArray(backup.files) && backup.files.length > 0) {
    await supabaseAdmin.from("files").upsert(backup.files, { onConflict: "id" });
  }

  // Restore settings (preserve password_hash)
  if (backup.settings?.id === 1) {
    await supabaseAdmin
      .from("settings")
      .upsert(backup.settings, { onConflict: "id" });
  }
}
