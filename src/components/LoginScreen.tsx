"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
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
  const [shake, setShake] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => setSetupRequired(data.setupRequired))
      .catch(() => {});
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

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
        triggerShake();
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Connection error. Please try again.");
      triggerShake();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-5 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-24 w-80 h-80 rounded-full bg-[var(--accent)]/12 blur-[80px]" />
        <div className="absolute -bottom-24 -left-20 w-96 h-96 rounded-full bg-sky-400/8 blur-[90px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[var(--accent)]/6 blur-[100px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo area */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative inline-block mb-5">
            <div className="w-22 h-22 rounded-[28px] gradient-accent flex items-center justify-center shadow-2xl animate-float"
              style={{ width: 88, height: 88 }}>
              <Shield className="w-11 h-11 text-white" strokeWidth={1.6} />
            </div>
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-[28px] gradient-accent opacity-30 blur-xl scale-110" />
          </div>
          <h1 className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight mb-1.5">Lily</h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {setupRequired ? "Create your vault password to get started" : "Your private vault"}
          </p>
        </div>

        {/* Card */}
        <div
          className={cn(
            "rounded-[24px] border border-[var(--glass-border)] bg-[var(--modal-bg)] p-6 shadow-2xl backdrop-blur-xl animate-slide-up",
            shake && "animate-[shake_0.4s_ease-in-out]"
          )}
          style={shake ? {
            animation: "none",
            transform: "translateX(0)",
          } : {}}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-2">
                {setupRequired ? "Create Password" : "Password"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-muted)]"
                  style={{ width: 18, height: 18 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder={setupRequired ? "Choose a strong password" : "Enter your password"}
                  className={cn(
                    "w-full pl-10 pr-11 py-3.5 rounded-2xl text-sm",
                    "bg-[var(--bg-input)] border-2 border-transparent",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                    "focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-card)]",
                    "transition-all duration-200",
                    error && "border-red-400/60 focus:border-red-400"
                  )}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff style={{ width: 18, height: 18 }} />
                    : <Eye style={{ width: 18, height: 18 }} />}
                </button>
              </div>
              {setupRequired && (
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 ml-1">Minimum 6 characters</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 animate-scale-in">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm text-red-500 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className={cn(
                "w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all duration-200",
                "gradient-accent shadow-[var(--btn-shadow)]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                "active:scale-[0.97] hover:brightness-105"
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  {setupRequired ? "Setting up…" : "Unlocking…"}
                </span>
              ) : setupRequired ? "Create Vault" : "Unlock Vault"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[var(--text-muted)] mt-5">
          End-to-end private · No data leaves your device
        </p>
      </div>
    </div>
  );
}
