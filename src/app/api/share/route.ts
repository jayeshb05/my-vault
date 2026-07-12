import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { saveFile } from "@/lib/storage";
import { createNote } from "@/lib/notes";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.authenticated) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const text = formData.get("text") as string | null;
    const url = formData.get("url") as string | null;
    const files = formData.getAll("files") as File[];

    const textContent = [title, text, url].filter(Boolean).join("\n");
    if (textContent.trim()) {
      await createNote(textContent);
      logActivity({ action: "share_upload", details: `Shared text: ${textContent.slice(0, 80)}`, contentType: "note", sessionId: session.sessionId, req });
    }

    let savedFiles = 0;
    for (const file of files) {
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const saved = await saveFile(buffer, file.name, file.type || "application/octet-stream");
        logActivity({ action: "share_upload", details: `Shared file: ${saved.original_name}`, contentType: "file", contentId: saved.id, sessionId: session.sessionId, req });
        savedFiles++;
      }
    }

    const total = (textContent.trim() ? 1 : 0) + savedFiles;
    return NextResponse.redirect(new URL(`/share?done=1&files_saved=${savedFiles}&total=${total}`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/share?error=share", req.url));
  }
}
