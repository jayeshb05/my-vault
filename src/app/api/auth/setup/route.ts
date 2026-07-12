import { NextRequest } from "next/server";
import { setupPassword, needsSetup } from "@/lib/auth";
import { createSession, setSessionCookie } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  if (!(await needsSetup())) {
    return errorResponse("Setup already complete", 400);
  }

  const { password } = await req.json();
  if (!password || password.length < 6) {
    return errorResponse("Password must be at least 6 characters");
  }

  await setupPassword(password);
  const { token, sessionId } = await createSession(req);
  await setSessionCookie(token);

  logActivity({ action: "login", details: "Initial vault setup", sessionId, req });

  return jsonResponse({ success: true, setup: true });
}
