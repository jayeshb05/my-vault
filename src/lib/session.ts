import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import { parseUserAgent } from "./utils";
import { COOKIE_NAME, type SessionPayload, signSession, verifySessionToken } from "./session-edge";

const ACTIVITY_COOKIE = "vault_activity_auth";

function getSecret(): Uint8Array {
  const secret = process.env.VAULT_SECRET || "my-vault-default-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export type { SessionPayload };

export async function createSession(
  req: Request,
  pwaInstalled = false
): Promise<{ token: string; sessionId: string }> {
  const sessionId = uuidv4();
  const ua = req.headers.get("user-agent") ?? "";
  const { browser, os, device } = parseUserAgent(ua);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const db = getDb();
  db.prepare(
    `INSERT INTO sessions (id, login_at, device_name, browser, os, ip_address, pwa_installed)
     VALUES (?, datetime('now'), ?, ?, ?, ?, ?)`
  ).run(sessionId, device, browser, os, ip, pwaInstalled ? 1 : 0);

  const token = await signSession({
    sessionId,
    authenticated: true,
    lastActivity: Date.now(),
  });

  return { token, sessionId };
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  return verifySessionToken(token);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(ACTIVITY_COOKIE);
}

export async function refreshSession(session: SessionPayload): Promise<string> {
  return signSession({
    ...session,
    lastActivity: Date.now(),
  });
}

export async function endSession(sessionId: string) {
  const db = getDb();
  const session = db
    .prepare(`SELECT login_at FROM sessions WHERE id = ? AND logout_at IS NULL`)
    .get(sessionId) as { login_at: string } | undefined;

  if (session) {
    const loginTime = new Date(session.login_at).getTime();
    const duration = Math.floor((Date.now() - loginTime) / 1000);
    db.prepare(
      `UPDATE sessions SET logout_at = datetime('now'), duration_seconds = ? WHERE id = ?`
    ).run(duration, sessionId);
  }
}

export async function isSessionExpired(session: SessionPayload): Promise<boolean> {
  const db = getDb();
  const settings = db.prepare("SELECT auto_lock_minutes FROM settings WHERE id = 1").get() as
    | { auto_lock_minutes: number }
    | undefined;

  const lockMinutes = settings?.auto_lock_minutes ?? 15;
  const lockMs = lockMinutes * 60 * 1000;
  return Date.now() - session.lastActivity > lockMs;
}

export async function setActivityAuth(password: string): Promise<boolean> {
  const { checkPassword } = await import("./auth");
  const valid = await checkPassword(password);
  if (!valid) return false;

  const cookieStore = await cookies();
  const token = await new SignJWT({ activityAuth: true, at: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30m")
    .sign(getSecret());

  cookieStore.set(ACTIVITY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 30,
    path: "/",
  });
  return true;
}

export async function hasActivityAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACTIVITY_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return !!(payload as { activityAuth?: boolean }).activityAuth;
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
