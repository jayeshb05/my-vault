import { NextRequest } from "next/server";
import { requireAuth, jsonResponse } from "@/lib/api-helpers";
import { searchNotes } from "@/lib/notes";
import { searchFiles } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { formatFileSize, getCategoryLabel } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return jsonResponse({ results: [] });

  const notes = searchNotes(q).map((n) => ({
    id: n.id,
    type: "note" as const,
    title: n.title,
    content: n.content,
    subtitle: n.content.slice(0, 120),
    is_pinned: n.is_pinned === 1,
    is_favorite: n.is_favorite === 1,
    created_at: n.created_at,
    updated_at: n.updated_at,
    matchField: n.title.toLowerCase().includes(q.toLowerCase()) ? "title" : "content",
  }));

  const files = searchFiles(q).map((f) => ({
    id: f.id,
    type: "file" as const,
    title: f.original_name,
    subtitle: `${getCategoryLabel(f.category)} · ${formatFileSize(f.file_size)}`,
    category: f.category,
    mime_type: f.mime_type,
    file_size: f.file_size,
    is_pinned: false,
    is_favorite: f.is_favorite === 1,
    created_at: f.created_at,
    updated_at: f.updated_at,
    matchField: "filename",
  }));

  const results = [...notes, ...files];

  logActivity({
    action: "search",
    details: `Searched: "${q}" (${results.length} results)`,
    sessionId: session!.sessionId,
    req,
  });

  return jsonResponse({ results, query: q });
}
