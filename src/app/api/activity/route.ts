import { NextRequest } from "next/server";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { getActivityLogs, getSessions } from "@/lib/activity";
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
    return jsonResponse({ sessions: getSessions() });
  }

  const logs = getActivityLogs({ filter, search, limit, offset });
  return jsonResponse({ logs });
}
