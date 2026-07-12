"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Upload, Lock } from "lucide-react";
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
    saveTimer.current = setTimeout(() => {
      saveAutoLock(minutes);
    }, 400);
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

  const handleBackup = () => {
    window.open("/api/backup", "_blank");
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("This will replace all current data. Continue?")) return;

    const formData = new FormData();
    formData.append("backup", file);
    const res = await fetch("/api/backup", { method: "POST", body: formData });
    if (res.ok) {
      setMessage("Restore complete. Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
      <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl m-4 animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {message && (
            <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-sm text-center">
              {message}
            </div>
          )}

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

          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Backup & Restore</h3>
            <div className="flex gap-2">
              <button
                onClick={handleBackup}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-hover)] text-sm text-[var(--text-primary)]"
              >
                <Download className="w-4 h-4" /> Backup
              </button>
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-hover)] text-sm text-[var(--text-primary)] cursor-pointer">
                <Upload className="w-4 h-4" /> Restore
                <input type="file" accept=".zip" onChange={handleRestore} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
