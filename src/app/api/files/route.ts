import { NextRequest } from "next/server";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { saveFile, getFile, deleteFile, renameFile, toggleFileFavorite } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const source = (formData.get("source") as string) ?? "upload";

  if (!file) return errorResponse("No file provided");

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveFile(buffer, file.name, file.type || "application/octet-stream");

  const actionMap: Record<string, "upload" | "share_upload" | "clipboard_paste" | "camera_upload"> = {
    upload: "upload",
    share: "share_upload",
    clipboard: "clipboard_paste",
    camera: "camera_upload",
  };

  logActivity({ action: actionMap[source] ?? "upload", details: `Uploaded: ${saved.original_name}`, contentType: "file", contentId: saved.id, sessionId: session!.sessionId, req });

  return jsonResponse({ file: saved }, 201);
}

export async function PUT(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const { id, action, name } = await req.json();
  if (!id) return errorResponse("ID required");

  if (action === "rename" && name) {
    const file = await renameFile(id, name);
    if (!file) return errorResponse("File not found", 404);
    logActivity({ action: "file_rename", details: `Renamed to: ${name}`, contentType: "file", contentId: id, sessionId: session!.sessionId, req });
    return jsonResponse({ file });
  }

  if (action === "favorite") {
    const file = await toggleFileFavorite(id);
    if (!file) return errorResponse("File not found", 404);
    logActivity({ action: "file_favorite", details: `Favorite toggled: ${file.original_name}`, contentType: "file", contentId: id, sessionId: session!.sessionId, req });
    return jsonResponse({ file });
  }

  return errorResponse("Invalid action");
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("ID required");

  const file = await getFile(id);
  const deleted = await deleteFile(id);
  if (!deleted) return errorResponse("File not found", 404);

  logActivity({ action: "file_delete", details: `Deleted: ${file?.original_name}`, contentType: "file", contentId: id, sessionId: session!.sessionId, req });
  return jsonResponse({ success: true });
}
