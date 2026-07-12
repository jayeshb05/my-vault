import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import { generateTitle } from "./utils";
import { getAllFiles } from "./storage";
import type { Note, VaultFile } from "./types";

export function createNote(content: string, title?: string): Note {
  const id = uuidv4();
  const noteTitle = title || generateTitle(content);
  const now = new Date().toISOString();
  const db = getDb();

  db.prepare(
    `INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, noteTitle, content, now, now);

  return {
    id,
    title: noteTitle,
    content,
    is_pinned: 0,
    is_favorite: 0,
    created_at: now,
    updated_at: now,
  };
}

export function getNote(id: string): Note | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as Note | undefined;
}

export function updateNote(id: string, updates: { title?: string; content?: string }): Note | null {
  const db = getDb();
  const note = getNote(id);
  if (!note) return null;

  const title = updates.title ?? note.title;
  const content = updates.content ?? note.content;

  db.prepare(
    `UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(title, content, id);

  return { ...note, title, content, updated_at: new Date().toISOString() };
}

export function deleteNote(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  return result.changes > 0;
}

export function toggleNotePin(id: string): Note | null {
  const db = getDb();
  const note = getNote(id);
  if (!note) return null;

  const newVal = note.is_pinned ? 0 : 1;
  db.prepare(
    `UPDATE notes SET is_pinned = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(newVal, id);

  return { ...note, is_pinned: newVal, updated_at: new Date().toISOString() };
}

export function toggleNoteFavorite(id: string): Note | null {
  const db = getDb();
  const note = getNote(id);
  if (!note) return null;

  const newVal = note.is_favorite ? 0 : 1;
  db.prepare(
    `UPDATE notes SET is_favorite = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(newVal, id);

  return { ...note, is_favorite: newVal, updated_at: new Date().toISOString() };
}

export function duplicateNote(id: string): Note | null {
  const note = getNote(id);
  if (!note) return null;
  return createNote(note.content, `${note.title} (copy)`);
}

export function getAllNotes(filter?: string): Note[] {
  const db = getDb();
  let query = "SELECT * FROM notes";
  const params: number[] = [];

  if (filter === "favorites") {
    query += " WHERE is_favorite = 1";
  }

  query += " ORDER BY is_pinned DESC, updated_at DESC";
  return db.prepare(query).all(...params) as Note[];
}

export function searchNotes(query: string): Note[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT 50`
    )
    .all(`%${query}%`, `%${query}%`) as Note[];
}

export function getVaultItems(filter?: string) {
  const notes = getAllNotes(filter);
  const files = getAllFiles(filter);

  const items = [
    ...notes.map((n: Note) => ({
      id: n.id,
      type: "note" as const,
      title: n.title,
      content: n.content,
      subtitle: n.content.slice(0, 100),
      is_pinned: n.is_pinned === 1,
      is_favorite: n.is_favorite === 1,
      created_at: n.created_at,
      updated_at: n.updated_at,
    })),
    ...files.map((f: VaultFile) => ({
      id: f.id,
      type: "file" as const,
      title: f.original_name,
      subtitle: f.category,
      category: f.category,
      mime_type: f.mime_type,
      file_size: f.file_size,
      is_pinned: false,
      is_favorite: f.is_favorite === 1,
      created_at: f.created_at,
      updated_at: f.updated_at,
    })),
  ];

  if (filter === "text") {
    return items.filter((i) => i.type === "note");
  }

  items.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return items;
}
