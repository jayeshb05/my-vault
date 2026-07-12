import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { getFile, downloadFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  const action = req.nextUrl.searchParams.get("action") ?? "download";

  if (!id) return errorResponse("ID required");

  const file = await getFile(id);
  if (!file) return errorResponse("File not found", 404);

  const buffer = await downloadFile(id);
  if (!buffer) return errorResponse("File not found in storage", 404);

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
  headers.set(
    "Content-Disposition",
    `${action === "download" ? "attachment" : "inline"}; filename="${file.original_name}"`
  );
  headers.set("Content-Length", buffer.length.toString());

  return new NextResponse(new Uint8Array(buffer), { headers });
}
