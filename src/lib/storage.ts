import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import { detectCategory } from "./utils";
import type { FileCategory, VaultFile } from "./types";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export function getUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<VaultFile> {
  const id = uuidv4();
  const ext = path.extname(originalName);
  const storedName = `${id}${ext}`;
  const filePath = path.join(getUploadsDir(), storedName);

  fs.writeFileSync(filePath, buffer);

  const category = detectCategory(mimeType, originalName);
  const now = new Date().toISOString();

  const db = getDb();
  db.prepare(
    `INSERT INTO files (id, original_name, stored_name, mime_type, file_size, category, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, originalName, storedName, mimeType, buffer.length, category, now, now);

  return {
    id,
    original_name: originalName,
    stored_name: storedName,
    mime_type: mimeType,
    file_size: buffer.length,
    category,
    is_favorite: 0,
    created_at: now,
    updated_at: now,
  };
}

export function getFile(id: string): VaultFile | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM files WHERE id = ?").get(id) as VaultFile | undefined;
}

export function getFilePath(id: string): string | null {
  const file = getFile(id);
  if (!file) return null;
  return path.join(getUploadsDir(), file.stored_name);
}

export function deleteFile(id: string): boolean {
  const file = getFile(id);
  if (!file) return false;

  const filePath = path.join(getUploadsDir(), file.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const db = getDb();
  db.prepare("DELETE FROM files WHERE id = ?").run(id);
  return true;
}

export function renameFile(id: string, newName: string): VaultFile | null {
  const db = getDb();
  const file = getFile(id);
  if (!file) return null;

  db.prepare(
    `UPDATE files SET original_name = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(newName, id);

  return { ...file, original_name: newName, updated_at: new Date().toISOString() };
}

export function toggleFileFavorite(id: string): VaultFile | null {
  const db = getDb();
  const file = getFile(id);
  if (!file) return null;

  const newVal = file.is_favorite ? 0 : 1;
  db.prepare(
    `UPDATE files SET is_favorite = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(newVal, id);

  return { ...file, is_favorite: newVal, updated_at: new Date().toISOString() };
}

export function getAllFiles(filter?: string): VaultFile[] {
  const db = getDb();
  let query = "SELECT * FROM files";
  const params: string[] = [];

  if (filter === "favorites") {
    query += " WHERE is_favorite = 1";
  } else if (filter && filter !== "all") {
    const categoryMap: Record<string, FileCategory[]> = {
      images: ["image"],
      pdf: ["pdf"],
      excel: ["excel"],
      docs: ["word", "doc", "text", "other"],
      text: ["text"],
    };
    const cats = categoryMap[filter];
    if (cats) {
      query += ` WHERE category IN (${cats.map(() => "?").join(",")})`;
      params.push(...cats);
    }
  }

  query += " ORDER BY updated_at DESC";
  return db.prepare(query).all(...params) as VaultFile[];
}

export function searchFiles(query: string): VaultFile[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM files WHERE original_name LIKE ? ORDER BY updated_at DESC LIMIT 50`
    )
    .all(`%${query}%`) as VaultFile[];
}

export { UPLOADS_DIR };
