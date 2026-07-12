import { NextRequest } from "next/server";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import {
  createNote, getAllNotes, getNote, updateNote, deleteNote,
  toggleNotePin, toggleNoteFavorite, duplicateNote,
} from "@/lib/notes";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const note = await getNote(id);
    if (!note) return errorResponse("Note not found", 404);
    return jsonResponse({ note });
  }

  const filter = req.nextUrl.searchParams.get("filter") ?? undefined;
  return jsonResponse({ notes: await getAllNotes(filter) });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const { content, title } = await req.json();
  if (!content) return errorResponse("Content required");

  const note = await createNote(content, title);
  logActivity({ action: "note_create", details: `Created note: ${note.title}`, contentType: "note", contentId: note.id, sessionId: session!.sessionId, req });

  return jsonResponse({ note }, 201);
}

export async function PUT(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const { id, title, content, action } = await req.json();
  if (!id) return errorResponse("ID required");

  if (action === "pin") {
    const note = await toggleNotePin(id);
    if (!note) return errorResponse("Note not found", 404);
    logActivity({ action: "note_pin", details: `Pinned: ${note.title}`, contentType: "note", contentId: id, sessionId: session!.sessionId, req });
    return jsonResponse({ note });
  }

  if (action === "favorite") {
    const note = await toggleNoteFavorite(id);
    if (!note) return errorResponse("Note not found", 404);
    return jsonResponse({ note });
  }

  if (action === "duplicate") {
    const note = await duplicateNote(id);
    if (!note) return errorResponse("Note not found", 404);
    logActivity({ action: "note_duplicate", details: "Duplicated note", contentType: "note", contentId: note.id, sessionId: session!.sessionId, req });
    return jsonResponse({ note });
  }

  const note = await updateNote(id, { title, content });
  if (!note) return errorResponse("Note not found", 404);
  logActivity({ action: "note_edit", details: `Edited: ${note.title}`, contentType: "note", contentId: id, sessionId: session!.sessionId, req });
  return jsonResponse({ note });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("ID required");

  const note = await getNote(id);
  const deleted = await deleteNote(id);
  if (!deleted) return errorResponse("Note not found", 404);

  logActivity({ action: "note_delete", details: `Deleted: ${note?.title}`, contentType: "note", contentId: id, sessionId: session!.sessionId, req });
  return jsonResponse({ success: true });
}
