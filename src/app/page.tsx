"use client";

import { useState, useEffect, useRef } from "react";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";
import { CheckCircle } from "lucide-react";
import { useVaultStore } from "@/store/vault-store";

export default function Home() {
  // Try to read cached auth state instantly — no spinner, no blank screen
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("vault-authed") === "1";
  });
  const [checking, setChecking] = useState(true);
  const [sharedToast, setSharedToast] = useState(false);
  const { refreshItems } = useVaultStore();
  const lastRefresh = useRef(0);

  // Refresh data at most once per 3 seconds (prevents duplicate calls)
  const maybeRefresh = () => {
    const now = Date.now();
    if (now - lastRefresh.current > 3000) {
      lastRefresh.current = now;
      refreshItems();
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Apply theme immediately (belt-and-suspenders alongside the inline script)
      const savedTheme = localStorage.getItem("vault-theme");
      if (savedTheme === "light") document.documentElement.classList.remove("dark");
      else document.documentElement.classList.add("dark");

      // Show share toast if redirected after a share
      const params = new URLSearchParams(window.location.search);
      if (params.has("shared")) {
        setSharedToast(true);
        window.history.replaceState({}, "", "/");
        setTimeout(() => setSharedToast(false), 3000);
      }

      // Register service worker
      if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }

      // Validate auth with server (fast, non-blocking for the UI)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch("/api/auth/status", { signal: controller.signal });
        clearTimeout(timeout);

        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            localStorage.setItem("vault-authed", "1");
            setAuthenticated(true);
          } else {
            localStorage.removeItem("vault-authed");
            setAuthenticated(false);
          }
        }
      } catch {
        // Network slow — keep whatever the cached state was
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Auto-refresh data when app comes to foreground (e.g. after sharing from WhatsApp)
  useEffect(() => {
    if (!authenticated) return;

    // Refresh immediately on mount when already authenticated
    maybeRefresh();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        maybeRefresh();
      }
    };

    // Also refresh when PWA is resumed via focus
    const handleFocus = () => maybeRefresh();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [authenticated]);

  const handleLock = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("vault-authed");
    setAuthenticated(false);
  };

  const handleLoginSuccess = () => {
    localStorage.setItem("vault-authed", "1");
    setAuthenticated(true);
  };

  // While checking server auth AND we have no cached session, show a minimal spinner
  // If we have cached auth, we show Dashboard immediately (no blank screen, no delay)
  if (checking && !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <Dashboard onLock={handleLock} />

      {/* Share success toast */}
      {sharedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white text-sm font-medium shadow-lg">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Saved to vault
          </div>
        </div>
      )}
    </>
  );
}
