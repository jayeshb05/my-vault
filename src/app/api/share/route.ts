import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, isTokenExpired, COOKIE_NAME } from "@/lib/session-edge";
import { saveFile } from "@/lib/storage";
import { createNote } from "@/lib/notes";
import { logActivity } from "@/lib/activity";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Read session directly from cookie on the request (works on Vercel)
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    const isAuth = session?.authenticated && !isTokenExpired(session);

    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const text = formData.get("text") as string | null;
    const url = formData.get("url") as string | null;
    const files = formData.getAll("files") as File[];

    if (!isAuth) {
      // Not logged in — redirect to share page with text in params
      const params = new URLSearchParams();
      if (title) params.set("title", title);
      if (text) params.set("text", text);
      if (url) params.set("url", url);
      return NextResponse.redirect(
        new URL(`/share?${params.toString()}`, req.url),
        { status: 303 }
      );
    }

    const sessionId = session!.sessionId;
    const textContent = [title, text, url].filter(Boolean).join("\n");
    let savedFiles = 0;

    if (textContent.trim()) {
      await createNote(textContent);
      logActivity({
        action: "share_upload",
        details: `Shared text: ${textContent.slice(0, 80)}`,
        contentType: "note",
        sessionId,
        req,
      });
    }

    for (const file of files) {
      if (!file || file.size === 0) continue;
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const saved = await saveFile(
          buffer,
          file.name || `shared-${Date.now()}`,
          file.type || "application/octet-stream"
        );
        logActivity({
          action: "share_upload",
          details: `Shared file: ${saved.original_name}`,
          contentType: "file",
          contentId: saved.id,
          sessionId,
          req,
        });
        savedFiles++;
      } catch (e) {
        console.error("[share] file error:", e);
      }
    }

    const total = (textContent.trim() ? 1 : 0) + savedFiles;
    return NextResponse.redirect(
      new URL(`/share?done=1&files_saved=${savedFiles}&total=${total}`, req.url),
      { status: 303 }
    );
  } catch (err) {
    console.error("[share POST]", err);
    return NextResponse.redirect(
      new URL("/share?error=1", req.url),
      { status: 303 }
    );
  }
}
