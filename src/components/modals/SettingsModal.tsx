"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ChevronRight, Clock, Lock, Monitor, Moon, Shield, Smartphone, Sun, X } from "lucide-react";
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
