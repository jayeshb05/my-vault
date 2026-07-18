"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ChevronRight, Clock, Lock, Monitor, Moon, Shield, Smartphone, Sun, X, Download, Upload, Key } from "lucide-react";
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

/* ── Access Log sub-modal ────────────────────────────────────────────────── */
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
      <div className="relative w-full sm:max-w-md bg-[var(--sheet-bg)] rounded-t-3xl sm:rounded-3xl border border-[var(--border)]/60 shadow-2xl animate-slide-up max-h-[92dvh] flex flex-col">

        <div className="drag-handle sm:hidden" />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]/60 shrink-0">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] btn-press transition-colors">
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Shield style={{ width: 16, height: 16 }} className="text-[var(--accent)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Access Log</h2>
          </div>
          {accessAuthed && accessLogs.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-red-500 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-red-500/10 transition-colors btn-press"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {!accessAuthed ? (
            <form onSubmit={handleAuth} className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Enter your password to view access history.
              </p>
              <input
                type="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Your password"
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-input)] border-2 border-transparent text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              {accessError && (
                <p className="text-xs text-red-500 font-medium">{accessError}</p>
              )}
              <button
                type="submit"
                disabled={!accessPassword}
                className="w-full py-3 rounded-2xl gradient-accent text-white text-sm font-semibold disabled:opacity-50 btn-press shadow-[var(--btn-shadow)]"
              >
                View Access Log
              </button>
            </form>
          ) : (
            <>
              {confirmClear && (
                <div className="mb-4 p-4 rounded-2xl bg-red-500/8 border border-red-500/20 animate-scale-in">
                  <p className="text-sm text-red-500 font-semibold mb-1">Clear all access history?</p>
                  <p className="text-xs text-[var(--text-muted)] mb-3">This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={handleClearAll} disabled={clearing}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold disabled:opacity-60 btn-press">
                      {clearing ? "Clearing…" : "Yes, Clear All"}
                    </button>
                    <button onClick={() => setConfirmClear(false)}
                      className="flex-1 py-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] text-xs font-semibold border border-[var(--border)] btn-press">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {accessLoading ? (
                <div className="flex flex-col gap-3 pt-2">
                  {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
                </div>
              ) : accessLogs.length === 0 ? (
                <div className="text-center py-10">
                  <Shield style={{ width: 32, height: 32 }} className="text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-[var(--text-muted)]">No access history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accessLogs.map((log) => {
                    const isSuccess = log.action === "login";
                    return (
                      <div key={log.id} className={`flex items-start gap-3 p-3.5 rounded-2xl ${
                        isSuccess ? "bg-[var(--bg-input)]" : "bg-red-500/8 border border-red-500/15"
                      }`}>
                        <span className="text-base shrink-0 mt-0.5">{isSuccess ? "🟢" : "🔴"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${isSuccess ? "text-[var(--text-primary)]" : "text-red-500"}`}>
                              {isSuccess ? "Vault unlocked" : "Wrong password"}
                            </span>
                            {log.pwa_installed && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/12 text-[var(--accent)] font-semibold">
                                Shortcut
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{formatDate(log.created_at)}</p>
                          <p className="text-xs text-[var(--text-muted)] opacity-70">
                            {[log.browser, log.os].filter(Boolean).join(" · ")}
                            {log.ip_address && ` · ${log.ip_address}`}
                          </p>
                        </div>
                        <span className="shrink-0 mt-1 opacity-35">
                          {isMobile(log)
                            ? <Smartphone style={{ width: 14, height: 14 }} className="text-[var(--text-muted)]" />
                            : <Monitor style={{ width: 14, height: 14 }} className="text-[var(--text-muted)]" />}
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

/* ── Change Password sub-modal ───────────────────────────────────────────── */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("New passwords do not match"); return; }
    if (next.length < 4) { setError("Password must be at least 4 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(onClose, 1500);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to change password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[var(--sheet-bg)] rounded-t-3xl sm:rounded-3xl border border-[var(--border)]/60 shadow-2xl animate-slide-up flex flex-col">
        <div className="drag-handle sm:hidden" />
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]/60 shrink-0">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] btn-press transition-colors">
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Key style={{ width: 16, height: 16 }} className="text-[var(--accent)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Change Password</h2>
          </div>
        </div>
        <div className="p-5">
          {success ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Password changed!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Current password"
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-input)] border-2 border-transparent text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="New password"
                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-input)] border-2 border-transparent text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-input)] border-2 border-transparent text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
              <button
                type="submit"
                disabled={loading || !current || !next || !confirm}
                className="w-full py-3 rounded-2xl gradient-accent text-white text-sm font-semibold disabled:opacity-50 btn-press shadow-[var(--btn-shadow)]"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main SettingsModal ──────────────────────────────────────────────────── */
export default function SettingsModal() {
  const { showSettings, setShowSettings, theme, setTheme } = useVaultStore();
  const [autoLock, setAutoLock] = useState(15);
  const [savingLock, setSavingLock] = useState(false);
  const [showAccessLog, setShowAccessLog] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    if (showSettings) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          const mins = Number(data.settings?.auto_lock_minutes);
          if (Number.isFinite(mins) && mins > 0) setAutoLock(mins);
        })
        .catch(() => {});
    }
  }, [showSettings]);

  const handleTheme = useCallback(async (t: "light" | "dark") => {
    setTheme(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("vault-theme", t);
      if (t === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {});
  }, [setTheme]);

  const handleAutoLockChange = async (minutes: number) => {
    setAutoLock(minutes);
    setSavingLock(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_lock_minutes: minutes }),
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("vault-auto-lock-minutes", String(minutes));
        window.dispatchEvent(new CustomEvent("autolock-changed", { detail: { minutes } }));
      }
    } finally {
      setSavingLock(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch("/api/backup", { method: "GET" });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lily-backup-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/backup", { method: "POST", body: formData });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setRestoreLoading(false);
      e.target.value = "";
    }
  };

  const LOCK_OPTIONS = [1, 2, 5, 15, 30, 60];

  if (!showSettings) return null;
  if (showAccessLog) return <AccessLogModal onClose={() => setShowAccessLog(false)} />;
  if (showChangePassword) return <ChangePasswordModal onClose={() => setShowChangePassword(false)} />;

  return (
    <div className="fixed inset-0 z-[50] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
      <div className="relative w-full sm:max-w-md bg-[var(--sheet-bg)] rounded-t-3xl sm:rounded-3xl border border-[var(--border)]/60 shadow-2xl animate-slide-up max-h-[92dvh] flex flex-col">

        <div className="drag-handle sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/60 shrink-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] btn-press transition-colors"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Appearance */}
          <div className="px-5 pt-5 pb-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Appearance</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleTheme("dark")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all btn-press ${
                  theme === "dark"
                    ? "bg-[var(--accent)] text-white shadow-[var(--btn-shadow)]"
                    : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <Moon style={{ width: 15, height: 15 }} />
                Dark
              </button>
              <button
                onClick={() => handleTheme("light")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all btn-press ${
                  theme === "light"
                    ? "bg-[var(--accent)] text-white shadow-[var(--btn-shadow)]"
                    : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <Sun style={{ width: 15, height: 15 }} />
                Light
              </button>
            </div>
          </div>

          {/* Auto-lock */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Auto-lock</p>
              {savingLock && <div className="w-3 h-3 border border-[var(--accent)] border-t-transparent rounded-full animate-spin" />}
            </div>
            <div className="flex gap-2 flex-wrap">
              {LOCK_OPTIONS.map((min) => (
                <button
                  key={min}
                  onClick={() => handleAutoLockChange(min)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all btn-press ${
                    autoLock === min
                      ? "bg-[var(--accent)] text-white shadow-[var(--btn-shadow)]"
                      : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <Clock style={{ width: 11, height: 11 }} />
                  {min < 60 ? `${min}m` : "1h"}
                </button>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Security</p>
            <div className="rounded-2xl bg-[var(--bg-input)] overflow-hidden divide-y divide-[var(--border)]/40">
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors btn-press text-left"
              >
                <div className="flex items-center gap-3">
                  <Key style={{ width: 16, height: 16 }} className="text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Change Password</span>
                </div>
                <ChevronRight style={{ width: 16, height: 16 }} className="text-[var(--text-muted)]" />
              </button>
              <button
                onClick={() => setShowAccessLog(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors btn-press text-left"
              >
                <div className="flex items-center gap-3">
                  <Shield style={{ width: 16, height: 16 }} className="text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Access Log</span>
                </div>
                <ChevronRight style={{ width: 16, height: 16 }} className="text-[var(--text-muted)]" />
              </button>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="px-5 pt-4 pb-6">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Backup &amp; Restore</p>
            <div className="rounded-2xl bg-[var(--bg-input)] overflow-hidden divide-y divide-[var(--border)]/40">
              <button
                onClick={handleBackup}
                disabled={backupLoading}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors btn-press text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <Download style={{ width: 16, height: 16 }} className="text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {backupLoading ? "Creating backup…" : "Export Backup"}
                  </span>
                </div>
                <ChevronRight style={{ width: 16, height: 16 }} className="text-[var(--text-muted)]" />
              </button>
              <label className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors btn-press cursor-pointer">
                <div className="flex items-center gap-3">
                  <Upload style={{ width: 16, height: 16 }} className="text-[var(--text-muted)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {restoreLoading ? "Restoring…" : "Restore Backup"}
                  </span>
                </div>
                <ChevronRight style={{ width: 16, height: 16 }} className="text-[var(--text-muted)]" />
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleRestore}
                  disabled={restoreLoading}
                />
              </label>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 px-1">
              Backup exports all notes and file metadata. Files are stored in Supabase Storage and remain accessible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
