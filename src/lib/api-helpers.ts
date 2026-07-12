import { NextRequest, NextResponse } from "next/server";
import { getSession, isSessionExpired } from "./session";

export async function requireAuth(req: NextRequest) {
  const session = await getSession();
  if (!session?.authenticated) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  if (await isSessionExpired(session)) {
    return { error: NextResponse.json({ error: "Session expired" }, { status: 401 }), session: null };
  }

  return { error: null, session };
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
