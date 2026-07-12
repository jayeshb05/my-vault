"use client";

import { useState, useEffect } from "react";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

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

    // Only register service worker in production (avoids dev reload/cache issues)
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const savedTheme = localStorage.getItem("vault-theme");
    if (savedTheme === "light") document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");

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

  return <Dashboard onLock={handleLock} />;
}
