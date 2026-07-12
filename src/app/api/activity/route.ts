import { NextRequest } from "next/server";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { getActivityLogs, getSessions, clearAccessLogs } from "@/lib/activity";
import { hasActivityAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const authorized = await hasActivityAuth();
  if (!authorized) {
    return errorResponse("Activity center requires password verification", 403);
  }

  const filter = req.nextUrl.searchParams.get("filter") ?? "all";
  const search = req.nextUrl.searchParams.get("q") ?? undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");
  const type = req.nextUrl.searchParams.get("type") ?? "logs";

  if (type === "sessions") {
    const sessions = await getSessions();
    return jsonResponse({ sessions });
  }

  const logs = await getActivityLogs({ filter, search, limit, offset });
  return jsonResponse({ logs });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const authorized = await hasActivityAuth();
  if (!authorized) {
    return errorResponse("Activity center requires password verification", 403);
  }

  // Only delete login + login_failed entries (access log entries)
  await clearAccessLogs();
  return jsonResponse({ success: true });
}
