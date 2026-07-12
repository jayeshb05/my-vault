import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { getFile, getFilePath } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import fs from "fs";

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  const action = req.nextUrl.searchParams.get("action") ?? "download";

  if (!id) return errorResponse("ID required");

  const file = getFile(id);
  if (!file) return errorResponse("File not found", 404);

  const filePath = getFilePath(id);
  if (!filePath || !fs.existsSync(filePath)) {
    return errorResponse("File not found on disk", 404);
  }

  const buffer = fs.readFileSync(filePath);

  logActivity({
    action: action === "preview" ? "preview" : "download",
    details: `${action === "preview" ? "Previewed" : "Downloaded"}: ${file.original_name}`,
    contentType: "file",
    contentId: id,
    sessionId: session!.sessionId,
    req,
  });

  const headers = new Headers();
  headers.set("Content-Type", file.mime_type);
  if (action === "download") {
    headers.set("Content-Disposition", `attachment; filename="${file.original_name}"`);
  } else {
    headers.set("Content-Disposition", `inline; filename="${file.original_name}"`);
  }
  headers.set("Content-Length", buffer.length.toString());

  return new NextResponse(buffer, { headers });
}
