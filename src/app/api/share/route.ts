import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { saveFile } from "@/lib/storage";
import { createNote } from "@/lib/notes";
import { logActivity } from "@/lib/activity";

// Required for Vercel — allow large file uploads via share
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const text = formData.get("text") as string | null;
    const url = formData.get("url") as string | null;
    const files = formData.getAll("files") as File[];

    if (!session?.authenticated) {
      // Not authenticated — store text params and redirect to login
      const params = new URLSearchParams();
      if (title) params.set("title", title);
      if (text) params.set("text", text);
      if (url) params.set("url", url);
      if (files.filter(f => f && f.size > 0).length > 0) {
        params.set("pending_files", "1");
      }
      return NextResponse.redirect(
        new URL(`/share?${params.toString()}`, req.url)
      );
    }

    // Authenticated — save everything
    const textContent = [title, text, url].filter(Boolean).join("\n");
    let savedNotes = 0;
    let savedFiles = 0;

    if (textContent.trim()) {
      await createNote(textContent);
      logActivity({
        action: "share_upload",
        details: `Shared text: ${textContent.slice(0, 80)}`,
        contentType: "note",
        sessionId: session.sessionId,
        req,
      });
      savedNotes++;
    }

    for (const file of files) {
      if (!file || file.size === 0) continue;
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const saved = await saveFile(
          buffer,
          file.name || `shared-file-${Date.now()}`,
          file.type || "application/octet-stream"
        );
        logActivity({
          action: "share_upload",
          details: `Shared file: ${saved.original_name}`,
          contentType: "file",
          contentId: saved.id,
          sessionId: session.sessionId,
          req,
        });
        savedFiles++;
      } catch (fileErr) {
        console.error("[share] file save error:", fileErr);
      }
    }

    const total = savedNotes + savedFiles;
    return NextResponse.redirect(
      new URL(`/share?done=1&files_saved=${savedFiles}&total=${total}`, req.url)
    );
  } catch (err) {
    console.error("[share] error:", err);
    return NextResponse.redirect(new URL("/share?error=share", req.url));
  }
}
