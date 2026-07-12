"use client";

import { useState, useEffect } from "react";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";
import { CheckCircle } from "lucide-react";

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sharedToast, setSharedToast] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch("/api/auth/status", { signal: controller.signal });
        clearTimeout(timeout);

        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data.authenticated) setAuthenticated(true);
        }
      } catch {
        // Server slow or unavailable — show login screen anyway
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    init();

    // Only register service worker in production
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const savedTheme = localStorage.getItem("vault-theme");
    if (savedTheme === "light") document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");

    // Show toast if redirected after a share
    const params = new URLSearchParams(window.location.search);
    if (params.has("shared")) {
      setSharedToast(true);
      // Clean URL without reload
      window.history.replaceState({}, "", "/");
      setTimeout(() => setSharedToast(false), 3000);
    }

    return () => { cancelled = true; };
  }, []);

  const handleLock = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onSuccess={() => setAuthenticated(true)} />;
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
