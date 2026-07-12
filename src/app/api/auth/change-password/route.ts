import { NextRequest } from "next/server";
import { changePassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401);

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return errorResponse("Both passwords required");
  }
  if (newPassword.length < 6) {
    return errorResponse("New password must be at least 6 characters");
  }

  const result = await changePassword(currentPassword, newPassword);
  if (!result.success) return errorResponse(result.error!, 400);

  logActivity({
    action: "password_change",
    details: "Password changed",
    sessionId: session.sessionId,
    req,
  });

  return jsonResponse({ success: true });
}
