import { NextRequest } from "next/server";
import { getSession, setActivityAuth } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401);

  const { password } = await req.json();
  if (!password) return errorResponse("Password required");

  const valid = await setActivityAuth(password);
  if (!valid) return errorResponse("Incorrect password", 401);

  logActivity({
    action: "unlock",
    details: "Activity center unlocked",
    sessionId: session.sessionId,
    req,
  });

  return jsonResponse({ success: true });
}
