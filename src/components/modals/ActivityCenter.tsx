"use client";

import { useState, useEffect } from "react";
import { X, Shield, Search, Download, Filter } from "lucide-react";
import { useVaultStore } from "@/store/vault-store";
import { cn, formatDate, getDateGroup } from "@/lib/utils";

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  created_at: string;
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "uploads", label: "Uploads" },
  { id: "downloads", label: "Downloads" },
  { id: "notes", label: "Notes" },
  { id: "searches", label: "Searches" },
  { id: "auth", label: "Auth" },
  { id: "deleted", label: "Deleted" },
];

export default function ActivityCenter() {
  const { showActivityCenter, setShowActivityCenter } = useVaultStore();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showActivityCenter && authenticated) {
      loadLogs();
    }
  }, [showActivityCenter, authenticated, filter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter, ...(search && { q: search }) });
      const res = await fetch(`/api/activity?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthenticated(true);
    } else {
      setError("Incorrect password");
    }
  };

  const handleClose = () => {
    setShowActivityCenter(false);
    setAuthenticated(false);
    setPassword("");
    setLogs([]);
  };

  const handleExport = () => {
    const csv = [
      "Date,Action,Details,Device,Browser,OS,IP",
      ...logs.map((l) =>
        `"${l.created_at}","${l.action}","${l.details}","${l.device_name}","${l.browser}","${l.os}","${l.ip_address}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vault-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!showActivityCenter) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col m-4 animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Activity Center</h2>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!authenticated ? (
          <form onSubmit={handleAuth} className="p-6">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Re-enter your password to access activity logs.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-3"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button type="submit" className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium">
              Verify
            </button>
          </form>
        ) : (
          <>
            <div className="p-4 border-b border-[var(--border)] space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadLogs()}
                  placeholder="Search activity..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                      filter === f.id
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
              >
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] py-8">No activity recorded</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    logs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
                      const group = getDateGroup(log.created_at);
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(log);
                      return acc;
                    }, {})
                  ).map(([group, groupLogs]) => (
                    <div key={group}>
                      <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">{group}</h3>
                      <div className="space-y-1">
                        {groupLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm"
                          >
                            <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[var(--text-primary)]">{log.details || log.action}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {log.browser} · {log.os} · {formatDate(log.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
