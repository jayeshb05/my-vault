"use client";

import { useState, useEffect, useRef } from "react";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";
import { CheckCircle } from "lucide-react";
import { useVaultStore } from "@/store/vault-store";

export default function Home() {
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("vault-auth-session") === "1";
  });
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
    const init = async () => {
      const savedTheme = localStorage.getItem("vault-theme");
      if (savedTheme === "light") document.documentElement.classList.remove("dark");
      else document.documentElement.classList.add("dark");

      const params = new URLSearchParams(window.location.search);
      if (params.has("shared")) {
        setSharedToast(true);
        window.history.replaceState({}, "", "/");
        setTimeout(() => setSharedToast(false), 3000);
      }

      if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    };

    init();

    const handleBeforeUnload = () => {
      sessionStorage.removeItem("vault-auth-session");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
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
    sessionStorage.removeItem("vault-auth-session");
    setAuthenticated(false);
  };

  const handleLoginSuccess = () => {
    sessionStorage.setItem("vault-auth-session", "1");
    setAuthenticated(true);
  };

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
