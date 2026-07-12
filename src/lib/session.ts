import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "./supabase";
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

  await supabaseAdmin.from("sessions").insert({
    id: sessionId,
    login_at: new Date().toISOString(),
    device_name: device,
    browser,
    os,
    ip_address: ip,
    pwa_installed: pwaInstalled,
  });

  const token = await signSession({
    sessionId,
    authenticated: true,
    lastActivity: Date.now(),
  });

  return { token, sessionId };
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
  return signSession({ ...session, lastActivity: Date.now() });
}

export async function endSession(sessionId: string) {
  const { data } = await supabaseAdmin
    .from("sessions")
    .select("login_at")
    .eq("id", sessionId)
    .is("logout_at", null)
    .single();

  if (data) {
    const duration = Math.floor((Date.now() - new Date(data.login_at).getTime()) / 1000);
    await supabaseAdmin
      .from("sessions")
      .update({ logout_at: new Date().toISOString(), duration_seconds: duration })
      .eq("id", sessionId);
  }
}

export async function isSessionExpired(session: SessionPayload): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("auto_lock_minutes")
    .eq("id", 1)
    .single();

  const lockMinutes = data?.auto_lock_minutes ?? 15;
  return Date.now() - session.lastActivity > lockMinutes * 60 * 1000;
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
