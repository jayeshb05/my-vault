"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Lock } from "lucide-react";
import { useVaultStore } from "@/store/vault-store";

export default function SettingsModal() {
  const { showSettings, setShowSettings } = useVaultStore();
  const [autoLock, setAutoLock] = useState(15);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showSettings) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) setAutoLock(data.settings.auto_lock_minutes);
        });
    }
  }, [showSettings]);

  const saveAutoLock = useCallback(async (minutes: number) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_lock_minutes: minutes }),
    });
    setShowSettings(false);
  }, [setShowSettings]);

  const handleAutoLockChange = (minutes: number) => {
    setAutoLock(minutes);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveAutoLock(minutes), 400);
  };

  if (!showSettings) return null;

  const handleChangePassword = async () => {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setShowSettings(false), 1000);
    } else {
      setMessage(data.error || "Failed");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col">

        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--border)] sm:hidden" />

        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto">
          {message && (
            <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-sm text-center">
              {message}
            </div>
          )}

          {/* Auto Lock */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
              <Lock className="w-4 h-4" /> Auto-lock after inactivity
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={autoLock}
                onChange={(e) => handleAutoLockChange(Number(e.target.value))}
                className="flex-1 accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-secondary)] w-16 text-right">{autoLock} min</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Saves automatically when you adjust</p>
          </div>

          {/* Change Password */}
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Change Password</h3>
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
              placeholder="New password"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] mb-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword}
              className="text-sm text-[var(--accent)] hover:underline disabled:opacity-50"
            >
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Lock, Smartphone, Share, MoreHorizontal, PlusSquare, Globe } from "lucide-react";
import { useVaultStore } from "@/store/vault-store";

export default function SettingsModal() {
  const { showSettings, setShowSettings } = useVaultStore();
  const [autoLock, setAutoLock] = useState(15);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showSettings) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) setAutoLock(data.settings.auto_lock_minutes);
        });

      const ua = navigator.userAgent;
      setIsIOS(/iPhone|iPad|iPod/.test(ua));
      setIsAndroid(/Android/.test(ua));
      setIsPWA(window.matchMedia("(display-mode: standalone)").matches);
    }
  }, [showSettings]);

  const saveAutoLock = useCallback(async (minutes: number) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_lock_minutes: minutes }),
    });
    setShowSettings(false);
  }, [setShowSettings]);

  const handleAutoLockChange = (minutes: number) => {
    setAutoLock(minutes);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveAutoLock(minutes), 400);
  };

  if (!showSettings) return null;

  const handleChangePassword = async () => {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setShowSettings(false), 1000);
    } else {
      setMessage(data.error || "Failed");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col">

        {/* Drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--border)] sm:hidden" />

        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto">
          {message && (
            <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-sm text-center">
              {message}
            </div>
          )}

          {/* ── Install App ─────────────────────────────────────── */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
              <Smartphone className="w-4 h-4" /> Install App on Your Phone
            </h3>

            {isPWA ? (
              <div className="p-3 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] text-sm text-center">
                ✅ Already installed as an app!
              </div>
            ) : (
              <div className="space-y-3">
                {/* Android instructions */}
                {(isAndroid || (!isIOS && !isAndroid)) && (
                  <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-[var(--accent)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">Android (Chrome)</span>
                    </div>
                    <ol className="text-xs text-[var(--text-secondary)] space-y-1.5 list-none">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        Open this site in <strong>Chrome</strong>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        Tap the <MoreHorizontal className="w-3 h-3 inline" /> menu (top right)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        Tap <strong>"Add to Home screen"</strong>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                        Tap <strong>"Install"</strong> — done! ✅
                      </li>
                    </ol>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2">
                      After installing, you can share files directly from WhatsApp, gallery, or file manager to this app.
                    </p>
                  </div>
                )}

                {/* iOS instructions */}
                {(isIOS || (!isIOS && !isAndroid)) && (
                  <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Share className="w-4 h-4 text-[var(--accent)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">iPhone / iPad (Safari)</span>
                    </div>
                    <ol className="text-xs text-[var(--text-secondary)] space-y-1.5 list-none">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        Open this site in <strong>Safari</strong>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        Tap the <Share className="w-3 h-3 inline" /> Share button (bottom bar)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        Scroll down → tap <PlusSquare className="w-3 h-3 inline" /> <strong>"Add to Home Screen"</strong>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                        Tap <strong>"Add"</strong> — done! ✅
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Auto Lock ───────────────────────────────────────── */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
              <Lock className="w-4 h-4" /> Auto-lock after inactivity
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={autoLock}
                onChange={(e) => handleAutoLockChange(Number(e.target.value))}
                className="flex-1 accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-secondary)] w-16 text-right">{autoLock} min</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Saves automatically when you adjust</p>
          </div>

          {/* ── Change Password ─────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Change Password</h3>
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
              placeholder="New password"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] mb-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword}
              className="text-sm text-[var(--accent)] hover:underline disabled:opacity-50"
            >
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
