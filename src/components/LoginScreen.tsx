"use client";

import { useEffect, useState } from "react";
import { Lock, Eye, EyeOff, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginScreenProps {
  onSuccess: () => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => setSetupRequired(data.setupRequired))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError("");

    try {
      const endpoint = setupRequired ? "/api/auth/setup" : "/api/auth/login";
      const isPWA = window.matchMedia("(display-mode: standalone)").matches;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, pwaInstalled: isPWA }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-20 w-64 h-64 rounded-full bg-[var(--accent)]/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] mb-4 shadow-lg shadow-[var(--accent)]/30">
            <Shield className="w-10 h-10 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-2">Lily</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {setupRequired ? "Create your vault password" : "Fast, private, and beautifully simple"}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)]/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Secure • Smooth • Fast
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)]/80 p-7 shadow-[var(--shadow-card)] backdrop-blur-xl animate-slide-up"
        >
          <div className="mb-5">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {setupRequired ? "Create Password" : "Password"}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={setupRequired ? "Choose a strong password" : "Enter your password"}
                className={cn(
                  "w-full pl-11 pr-11 py-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-transparent",
                  "transition-all duration-200"
                )}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {setupRequired && (
              <p className="text-xs text-[var(--text-muted)] mt-2">Minimum 6 characters</p>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className={cn(
              "w-full py-3.5 rounded-2xl font-medium text-white transition-all duration-200",
              "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "active:scale-[0.98]"
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {setupRequired ? "Setting up..." : "Unlocking..."}
              </span>
            ) : setupRequired ? (
              "Create Vault"
            ) : (
              "Unlock Vault"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Your private workspace. Secured and encrypted.
        </p>
      </div>
    </div>
  );
}
