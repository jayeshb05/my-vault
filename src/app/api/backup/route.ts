import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { createBackup, restoreBackup } from "@/lib/backup";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const buffer = await createBackup();

  logActivity({
    action: "backup",
    details: "Vault backup created",
    sessionId: session!.sessionId,
    req,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="my-vault-backup-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("backup") as File | null;
  if (!file) return errorResponse("No backup file provided");

  const buffer = Buffer.from(await file.arrayBuffer());
  await restoreBackup(buffer);

  logActivity({
    action: "restore",
    details: "Vault restored from backup",
    sessionId: session!.sessionId,
    req,
  });

  return NextResponse.json({ success: true });
}
