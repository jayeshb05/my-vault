import { NextRequest } from "next/server";
import { checkPassword, needsSetup } from "@/lib/auth";
import { createSession, setSessionCookie, refreshSession, getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const { password, pwaInstalled } = await req.json();

  if (await needsSetup()) {
    return errorResponse("Setup required", 400);
  }

  if (!password) return errorResponse("Password required");

  const valid = await checkPassword(password);
  if (!valid) {
    logActivity({ action: "login_failed", details: "Wrong password entered", req });
    return errorResponse("Incorrect password", 401);
  }

  const { token, sessionId } = await createSession(req, pwaInstalled);
  await setSessionCookie(token);

  logActivity({ action: "login", details: "User logged in", sessionId, req, pwaInstalled });

  return jsonResponse({ success: true, sessionId });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401);

  const newToken = await refreshSession(session);
  await setSessionCookie(newToken);
  return jsonResponse({ success: true });
}
