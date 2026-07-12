"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Lock, Sun, Moon, Shield, ArrowLeft, Monitor, Smartphone } from "lucide-react";
import { useVaultStore } from "@/store/vault-store";
import { formatDate } from "@/lib/utils";

interface AccessLog {
  id: string;
  action: string;
  details: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  pwa_installed: boolean;
  created_at: string;
}

// ── Standalone Access Log popup ──────────────────────────────────────────────
function AccessLogModal({ onClose }: { onClose: () => void }) {
  const [accessPassword, setAccessPassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessAuthed, setAccessAuthed] = useState(false);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadAccessLogs = async () => {
    setAccessLoading(true);
    try {
      // Only fetch login success and login failed — nothing else
      const res = await fetch("/api/activity?filter=access&limit=100");
      if (res.ok) {
        const data = await res.json();
        setAccessLogs(data.logs ?? []);
      }
    } finally {
      setAccessLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessError("");
    const res = await fetch("/api/auth/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: accessPassword }),
    });
    if (res.ok) {
      setAccessAuthed(true);
      setAccessPassword("");
      loadAccessLogs();
    } else {
      setAccessError("Incorrect password");
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await fetch("/api/activity", { method: "DELETE" });
      setAccessLogs([]);
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  const isMobile = (log: AccessLog) =>
    log.os?.toLowerCase().includes("android") ||
    log.os?.toLowerCase().includes("ios") ||
    log.device_name?.toLowerCase().includes("mobile");

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92dvh] flex flex-col">

        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--border)] sm:hidden" />

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Shield className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Access Log</h2>
          </div>
          {accessAuthed && accessLogs.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-red-500 hover:text-red-400 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {!accessAuthed ? (
            <form onSubmit={handleAuth} className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                Re-enter your password 
              </p>
              <input
                type="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Your password"
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              {accessError && (
                <p className="text-xs text-red-500 font-medium">{accessError}</p>
              )}
              <button
                type="submit"
                disabled={!accessPassword}
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50 active:opacity-80"
              >
                View Access Log
              </button>
            </form>
          ) : (
            <>
              {/* Confirm clear dialog */}
              {confirmClear && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-500 font-medium mb-2">Clear all access history?</p>
                  <p className="text-xs text-[var(--text-muted)] mb-3">This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearAll}
                      disabled={clearing}
                      className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium disabled:opacity-60"
                    >
                      {clearing ? "Clearing…" : "Yes, Clear All"}
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 py-1.5 rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] text-xs font-medium border border-[var(--border)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {accessLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : accessLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">No access history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accessLogs.map((log) => {
                    const isSuccess = log.action === "login";
                    return (
                      <div
                        key={log.id}
                        className={`flex items-start gap-3 p-3 rounded-xl ${
                          isSuccess
                            ? "bg-[var(--bg-input)]"
                            : "bg-red-500/10 border border-red-500/20"
                        }`}
                      >
                        <span className="text-base leading-none shrink-0 mt-0.5">
                          {isSuccess ? "🟢" : "🔴"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-sm font-medium ${
                              isSuccess ? "text-[var(--text-primary)]" : "text-red-500"
                            }`}>
                              {isSuccess ? "Vault unlocked" : "Wrong password entered"}
                            </span>
                            {log.pwa_installed && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-medium">
                                Shortcut
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                            {formatDate(log.created_at)}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] opacity-70">
                            {[log.browser, log.os].filter(Boolean).join(" · ")}
                            {log.ip_address && ` · ${log.ip_address}`}
                          </p>
                        </div>
                        <span className="shrink-0 mt-1 opacity-40">
                          {isMobile(log)
                            ? <Smartphone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            : <Monitor className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Modal ──────────────────────────────────────────────────────
export default function SettingsModal() {
  const { showSettings, setShowSettings, theme, setTheme } = useVaultStore();
  const [autoLock, setAutoLock] = useState(2);
  const [sliderValue, setSliderValue] = useState(2);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [savingLock, setSavingLock] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showAccessLogModal, setShowAccessLogModal] = useState(false);

  useEffect(() => {
    if (showSettings) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) {
            const val = data.settings.auto_lock_minutes ?? 2;
            setAutoLock(val);
            setSliderValue(val);
          }
        });
    } else {
      setShowAccessLogModal(false);
    }
  }, [showSettings]);

  const saveAutoLock = useCallback(async (minutes: number) => {
    setSavingLock(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_lock_minutes: minutes }),
      });
      setAutoLock(minutes);
      window.dispatchEvent(new CustomEvent("autolock-changed", { detail: { minutes } }));
    } finally {
      setSavingLock(false);
    }
  }, []);

  const handleSliderRelease = () => {
    saveAutoLock(sliderValue);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 6) {
      setMessageType("error");
      setMessage("New password must be at least 6 characters");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setChangingPassword(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessageType("success");
        setMessage("Password updated! Use the new password next time.");
        setCurrentPassword("");
        setNewPassword("");
        setTimeout(() => setMessage(""), 4000);
      } else {
        setMessageType("error");
        setMessage(data.error || "Failed to change password");
        setTimeout(() => setMessage(""), 4000);
      }
    } catch {
      setMessageType("error");
      setMessage("Connection error. Please try again.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setChangingPassword(false);
    }
  };

  const applyTheme = (t: string) => {
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("vault-theme", t);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  const isDark = theme === "dark";

  if (!showSettings) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        />
        <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col">

          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--border)] sm:hidden" />

          <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-6 overflow-y-auto">

            {/* Appearance */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">Appearance</span>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {isDark ? "Dark" : "Light"}
              </button>
            </div>

            {/* Auto Lock */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
                <Lock className="w-4 h-4" /> Auto-lock after inactivity
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  onMouseUp={handleSliderRelease}
                  onTouchEnd={handleSliderRelease}
                  className="flex-1 accent-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--text-primary)] w-16 text-right tabular-nums">
                  {sliderValue} min
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {savingLock ? "Saving…" : "Slide and release to save"}
              </p>
            </div>

            {/* Change Password */}
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Change Password</h3>

              {message && (
                <div className={`p-2.5 rounded-lg text-sm mb-3 ${
                  messageType === "success"
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "bg-red-500/10 text-red-500"
                }`}>
                  {message}
                </div>
              )}

              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] mb-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                onKeyDown={(e) => { if (e.key === "Enter") handleChangePassword(); }}
              />
              <button
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || changingPassword}
                className="text-sm text-[var(--accent)] hover:underline disabled:opacity-50 font-medium"
              >
                {changingPassword ? "Updating…" : "Update Password"}
              </button>
            </div>

            {/* Access Log button */}
            <button
              onClick={() => setShowAccessLogModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-left"
            >
              <Shield className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">Access Log</p>
                <p className="text-xs text-[var(--text-muted)]"></p>
              </div>
              <span className="text-[var(--text-muted)] text-xs">›</span>
            </button>

          </div>
        </div>
      </div>

      {/* Access Log opens as its own popup on top */}
      {showAccessLogModal && (
        <AccessLogModal onClose={() => setShowAccessLogModal(false)} />
      )}
    </>
  );
}
