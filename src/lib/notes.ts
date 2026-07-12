import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "./supabase";
import { generateTitle } from "./utils";
import { getAllFiles } from "./storage";
import type { Note, VaultFile } from "./types";

// ─── Create ──────────────────────────────────────────────────────────────────
export async function createNote(content: string, title?: string): Promise<Note> {
  const id = uuidv4();
  const noteTitle = title || generateTitle(content);
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("notes")
    .insert({ id, title: noteTitle, content, is_pinned: false, is_favorite: false, created_at: now, updated_at: now })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return dbRowToNote(data);
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export async function getNote(id: string): Promise<Note | undefined> {
  const { data, error } = await supabaseAdmin
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return undefined;
  return dbRowToNote(data);
}

export async function getAllNotes(filter?: string): Promise<Note[]> {
  let query = supabaseAdmin.from("notes").select("*");

  if (filter === "favorites") {
    query = query.eq("is_favorite", true);
  }
  // For all other filters (pdf, excel, images, docs) — notes are excluded
  // by getVaultItems before calling this function

  const { data, error } = await query
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data.map(dbRowToNote);
}

export async function searchNotes(q: string): Promise<Note[]> {
  const { data, error } = await supabaseAdmin
    .from("notes")
    .select("*")
    .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map(dbRowToNote);
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateNote(
  id: string,
  updates: { title?: string; content?: string }
): Promise<Note | null> {
  const { data, error } = await supabaseAdmin
    .from("notes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return dbRowToNote(data);
}

export async function toggleNotePin(id: string): Promise<Note | null> {
  const note = await getNote(id);
  if (!note) return null;

  const { data, error } = await supabaseAdmin
    .from("notes")
    .update({ is_pinned: !note.is_pinned, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return dbRowToNote(data);
}

export async function toggleNoteFavorite(id: string): Promise<Note | null> {
  const note = await getNote(id);
  if (!note) return null;

  const { data, error } = await supabaseAdmin
    .from("notes")
    .update({ is_favorite: !note.is_favorite, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return dbRowToNote(data);
}

export async function duplicateNote(id: string): Promise<Note | null> {
  const note = await getNote(id);
  if (!note) return null;
  return createNote(note.content, `${note.title} (copy)`);
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteNote(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("notes").delete().eq("id", id);
  return !error;
}

// ─── Vault items (notes + files combined) ─────────────────────────────────────
export async function getVaultItems(filter?: string) {
  // These filters are file-only — don't fetch notes at all
  const fileOnlyFilters = ["images", "pdf", "excel", "docs"];
  // These filters are note-only — don't fetch files at all
  const noteOnlyFilters = ["text"];

  const fetchNotes = !fileOnlyFilters.includes(filter ?? "");
  const fetchFiles = !noteOnlyFilters.includes(filter ?? "");

  const [notes, files] = await Promise.all([
    fetchNotes ? getAllNotes(filter) : Promise.resolve([]),
    fetchFiles ? getAllFiles(filter) : Promise.resolve([]),
  ]);

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

  items.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return items;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToNote(row: any): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    is_pinned: row.is_pinned ? 1 : 0,
    is_favorite: row.is_favorite ? 1 : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
