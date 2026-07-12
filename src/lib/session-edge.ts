import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "vault_session";
const DEFAULT_LOCK_MS = 15 * 60 * 1000;

function getSecret(): Uint8Array {
  const secret = process.env.VAULT_SECRET || "my-vault-default-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sessionId: string;
  authenticated: boolean;
  lastActivity: number;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(session: SessionPayload, lockMinutes = 15): boolean {
  const lockMs = lockMinutes * 60 * 1000;
  return Date.now() - session.lastActivity > lockMs;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getSecret());
}

export { COOKIE_NAME, DEFAULT_LOCK_MS };
