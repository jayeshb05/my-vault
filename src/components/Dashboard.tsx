"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useVaultStore } from "@/store/vault-store";
import Header from "@/components/dashboard/Header";
import FilterTabs, { clientFilter } from "@/components/dashboard/FilterTabs";
import ChatFeed from "@/components/dashboard/ChatFeed";
import BottomComposeBar, { type Attachment } from "@/components/dashboard/BottomComposeBar";
import ActivityCenter from "@/components/modals/ActivityCenter";
import SettingsModal from "@/components/modals/SettingsModal";
import FilePreview from "@/components/modals/FilePreview";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { VaultItem } from "@/lib/types";

interface DashboardProps {
  onLock: () => void;
}

interface PendingDelete {
  items: VaultItem[];
  message: string;
}

export default function Dashboard({ onLock }: DashboardProps) {
  const {
    items,
    filter,
    searchResults,
    isSearching,
    isLoading,
    refreshItems,
    setSearchQuery,
    setSearchResults,
    setIsSearching,
    setSelectedItem,
    setShowFilePreview,
    setShowNoteEditor,
    setEditingNoteId,
    optimisticAdd,
    optimisticRemove,
    optimisticUpdate,
  } = useVaultStore();

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  // ── Auto-lock on inactivity ──────────────────────────────────────────────
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLockMinutesRef = useRef<number>(
    typeof window !== "undefined"
      ? (() => {
          const saved = Number(localStorage.getItem("vault-auto-lock-minutes"));
          return Number.isFinite(saved) && saved > 0 ? saved : 2;
        })()
      : 2
  );

  const resetLockTimer = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    const ms = autoLockMinutesRef.current * 60 * 1000;
    lockTimerRef.current = setTimeout(() => {
      onLock();
    }, ms);
  }, [onLock]);

  // Load auto-lock setting and start the timer
  useEffect(() => {
    const applySavedSetting = (minutes: number) => {
      autoLockMinutesRef.current = minutes;
      if (typeof window !== "undefined") {
        localStorage.setItem("vault-auto-lock-minutes", String(minutes));
      }
      resetLockTimer();
    };

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const serverMinutes = Number(data.settings?.auto_lock_minutes);
        if (Number.isFinite(serverMinutes) && serverMinutes > 0) {
          applySavedSetting(serverMinutes);
        } else {
          resetLockTimer();
        }
      })
      .catch(() => resetLockTimer());
  }, [resetLockTimer]);

  // Listen for setting changes from SettingsModal (instant, no need to re-fetch)
  useEffect(() => {
    const handler = (e: Event) => {
      const { minutes } = (e as CustomEvent).detail;
      autoLockMinutesRef.current = minutes;
      resetLockTimer(); // restart timer with new duration immediately
    };
    window.addEventListener("autolock-changed", handler);
    return () => window.removeEventListener("autolock-changed", handler);
  }, [resetLockTimer]);

  // Reset timer on any user activity
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    const onActivity = () => resetLockTimer();
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [resetLockTimer]);
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    refreshItems();
    fetch("/api/auth/login", { method: "PUT" }).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/auth/login", { method: "PUT" }).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshItems]);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results ?? []);
      }
    } catch {
      setSearchResults([]);
    }
  }, [setSearchQuery, setIsSearching, setSearchResults]);

  const handleSend = async (text: string, attachments: Attachment[]): Promise<boolean> => {
    if (!text.trim() && attachments.length === 0) return false;
    const now = new Date().toISOString();

    // Optimistically add text note instantly
    if (text.trim()) {
      const tempId = `temp-note-${Date.now()}`;
      optimisticAdd({
        id: tempId,
        type: "note",
        title: text.trim().slice(0, 80),
        content: text.trim(),
        is_pinned: false,
        is_favorite: false,
        created_at: now,
        updated_at: now,
      });
      fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
        .then((res) => { if (res.ok) refreshItems(); })
        .catch(() => {});
    }

    // Optimistically add file attachments instantly
    for (const att of attachments) {
      const tempId = `temp-file-${Date.now()}-${Math.random()}`;
      const isImage = att.file.type.startsWith("image/");
      const isPdf = att.file.type === "application/pdf";
      optimisticAdd({
        id: tempId,
        type: "file",
        title: att.file.name,
        category: isImage ? "image" : isPdf ? "pdf" : "other",
        mime_type: att.file.type,
        file_size: att.file.size,
        is_pinned: false,
        is_favorite: false,
        created_at: now,
        updated_at: now,
      });
      const formData = new FormData();
      formData.append("file", att.file);
      formData.append("source", "clipboard");
      fetch("/api/files", { method: "POST", body: formData })
        .then((res) => { if (res.ok) refreshItems(); })
        .catch(() => {});
    }

    return true;
  };

  const doDelete = (toDelete: VaultItem[]) => {
    // Remove from UI instantly
    optimisticRemove(toDelete.map((i) => i.id));
    // Fire deletes in background
    for (const item of toDelete) {
      const endpoint = item.type === "note" ? `/api/notes?id=${item.id}` : `/api/files?id=${item.id}`;
      fetch(endpoint, { method: "DELETE" }).catch(() => {});
    }
  };

  const handleDelete = (item: VaultItem) => {
    setPendingDelete({
      items: [item],
      message: `"${item.title}" will be permanently deleted.`,
    });
  };

  const handleBulkDelete = (toDelete: VaultItem[]) => {
    setPendingDelete({
      items: toDelete,
      message: `${toDelete.length} item${toDelete.length > 1 ? "s" : ""} will be permanently deleted.`,
    });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const toDelete = pendingDelete.items;
    setPendingDelete(null);
    doDelete(toDelete);
  };

  const handleFavorite = async (item: VaultItem) => {
    // Optimistic update instantly
    optimisticUpdate(item.id, { is_favorite: !item.is_favorite });
    const endpoint = item.type === "note" ? "/api/notes" : "/api/files";
    fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, action: "favorite" }),
    }).catch(() => {
      // Revert on failure
      optimisticUpdate(item.id, { is_favorite: item.is_favorite });
    });
  };

  const handlePin = async (item: VaultItem) => {
    if (item.type !== "note") return;
    // Optimistic update instantly
    optimisticUpdate(item.id, { is_pinned: !item.is_pinned });
    fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, action: "pin" }),
    }).catch(() => {
      // Revert on failure
      optimisticUpdate(item.id, { is_pinned: item.is_pinned });
    });
  };

  const handlePreview = (item: VaultItem) => {
    setSelectedItem(item);
    if (item.type === "note") {
      setEditingNoteId(item.id);
      setShowNoteEditor(true);
    } else {
      setShowFilePreview(true);
    }
  };

  // Apply client-side filter instantly; API refresh provides fresh server data
  const displayItems = isSearching ? searchResults : clientFilter(items, filter);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      const now = new Date().toISOString();
      for (const file of Array.from(e.dataTransfer.files)) {
        const tempId = `temp-file-${Date.now()}-${Math.random()}`;
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";
        optimisticAdd({
          id: tempId,
          type: "file",
          title: file.name,
          category: isImage ? "image" : isPdf ? "pdf" : "other",
          mime_type: file.type,
          file_size: file.size,
          is_pinned: false,
          is_favorite: false,
          created_at: now,
          updated_at: now,
        });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("source", "upload");
        fetch("/api/files", { method: "POST", body: formData })
          .then((res) => { if (res.ok) refreshItems(); })
          .catch(() => {});
      }
    }
  };

  return (
    <div
      className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Header onLock={onLock} onSearch={handleSearch} />

      {!isSearching && (
        <div className="shrink-0 sticky top-0 z-20 bg-[var(--bg-primary)]">
          <FilterTabs />
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-28">
        <ChatFeed
          items={displayItems}
          isLoading={isLoading}
          onDelete={handleDelete}
          onFavorite={handleFavorite}
          onPin={handlePin}
          onBulkDelete={handleBulkDelete}
          onPreview={handlePreview}
        />
      </main>

      <BottomComposeBar onSend={handleSend} />
      <ActivityCenter />
      <SettingsModal />
      <FilePreview />

      {/* Custom delete confirmation dialog */}
      {pendingDelete && (
        <ConfirmDialog
          message={pendingDelete.message}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
