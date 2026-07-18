const AUTH_SESSION_KEY = "vault-auth-session";
const AUTH_REMEMBER_KEY = "vault-auth-session-remember";
const AUTH_REMEMBER_TTL_MS = 15 * 60 * 1000;

export function readStoredAuth(): boolean {
  if (typeof window === "undefined") return false;

  const remembered = window.localStorage.getItem(AUTH_REMEMBER_KEY);
  if (remembered) {
    try {
      const parsed = JSON.parse(remembered) as { expiresAt?: number };
      if (typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now()) {
        return true;
      }
    } catch {
      // ignore malformed data
    }
    window.localStorage.removeItem(AUTH_REMEMBER_KEY);
  }

  return window.sessionStorage.getItem(AUTH_SESSION_KEY) === "1";
}

export function persistAuth(remember = true): void {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(AUTH_SESSION_KEY, "1");
  if (remember) {
    window.localStorage.setItem(
      AUTH_REMEMBER_KEY,
      JSON.stringify({ expiresAt: Date.now() + AUTH_REMEMBER_TTL_MS })
    );
  } else {
    window.localStorage.removeItem(AUTH_REMEMBER_KEY);
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  window.localStorage.removeItem(AUTH_REMEMBER_KEY);
}
