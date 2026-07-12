import { NextRequest } from "next/server";
import { clearSessionCookie, getSession, endSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { jsonResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (session?.sessionId) {
    logActivity({
      action: "logout",
      details: "User logged out",
      sessionId: session.sessionId,
      req,
    });
    await endSession(session.sessionId);
  }

  await clearSessionCookie();
  return jsonResponse({ success: true });
}
