import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "./supabase";
import { detectCategory } from "./utils";
import type { FileCategory, VaultFile } from "./types";

const BUCKET = "vault-files";

// ─── Upload ────────────────────────────────────────────────────────────────
export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<VaultFile> {
  const id = uuidv4();
  const ext = originalName.split(".").pop() ?? "bin";
  const storedName = `${id}.${ext}`;
  const category = detectCategory(mimeType, originalName);
  const now = new Date().toISOString();

  // Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storedName, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  // Save metadata to PostgreSQL
  const { data, error: dbError } = await supabaseAdmin
    .from("files")
    .insert({
      id,
      original_name: originalName,
      stored_name: storedName,
      mime_type: mimeType,
      file_size: buffer.length,
      category,
      is_favorite: false,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);
  return dbRowToVaultFile(data);
}

// ─── Read ───────────────────────────────────────────────────────────────────
export async function getFile(id: string): Promise<VaultFile | undefined> {
  const { data, error } = await supabaseAdmin
    .from("files")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return undefined;
  return dbRowToVaultFile(data);
}

export async function downloadFile(id: string): Promise<Buffer | null> {
  const file = await getFile(id);
  if (!file) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(file.stored_name);

  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function getAllFiles(filter?: string): Promise<VaultFile[]> {
  let query = supabaseAdmin.from("files").select("*");

  if (filter === "favorites") {
    query = query.eq("is_favorite", true);
  } else if (filter && filter !== "all" && filter !== "text") {
    const categoryMap: Record<string, FileCategory[]> = {
      images: ["image"],
      pdf: ["pdf"],
      excel: ["excel"],
      docs: ["word", "doc", "text", "other"],
    };
    const cats = categoryMap[filter];
    if (cats) query = query.in("category", cats);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(dbRowToVaultFile);
}

export async function searchFiles(q: string): Promise<VaultFile[]> {
  const { data, error } = await supabaseAdmin
    .from("files")
    .select("*")
    .ilike("original_name", `%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map(dbRowToVaultFile);
}

// ─── Update ─────────────────────────────────────────────────────────────────
export async function renameFile(id: string, newName: string): Promise<VaultFile | null> {
  const { data, error } = await supabaseAdmin
    .from("files")
    .update({ original_name: newName, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return dbRowToVaultFile(data);
}

export async function toggleFileFavorite(id: string): Promise<VaultFile | null> {
  const file = await getFile(id);
  if (!file) return null;

  const { data, error } = await supabaseAdmin
    .from("files")
    .update({ is_favorite: !file.is_favorite, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return dbRowToVaultFile(data);
}

// ─── Delete ─────────────────────────────────────────────────────────────────
export async function deleteFile(id: string): Promise<boolean> {
  const file = await getFile(id);
  if (!file) return false;

  // Remove from storage
  await supabaseAdmin.storage.from(BUCKET).remove([file.stored_name]);

  // Remove from DB
  const { error } = await supabaseAdmin.from("files").delete().eq("id", id);
  return !error;
}

// ─── Helper ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToVaultFile(row: any): VaultFile {
  return {
    id: row.id,
    original_name: row.original_name,
    stored_name: row.stored_name,
    mime_type: row.mime_type,
    file_size: row.file_size,
    category: row.category as FileCategory,
    is_favorite: row.is_favorite ? 1 : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Legacy export — no longer a filesystem path
export const UPLOADS_DIR = "";
export const getUploadsDir = () => "";
export const getFilePath = async (id: string) => {
  const file = await getFile(id);
  return file?.stored_name ?? null;
};
