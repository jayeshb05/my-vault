"use client";

import { useEffect, useCallback, useState } from "react";
import { useVaultStore } from "@/store/vault-store";
import Header from "@/components/dashboard/Header";
import FilterTabs from "@/components/dashboard/FilterTabs";
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
  } = useVaultStore();

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

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
    try {
      if (text.trim()) {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });
        if (!res.ok) return false;
      }
      for (const att of attachments) {
        const formData = new FormData();
        formData.append("file", att.file);
        formData.append("source", "clipboard");
        const res = await fetch("/api/files", { method: "POST", body: formData });
        if (!res.ok) return false;
      }
      if (!text.trim() && attachments.length === 0) return false;
      await refreshItems();
      return true;
    } catch {
      return false;
    }
  };

  const doDelete = async (toDelete: VaultItem[]) => {
    for (const item of toDelete) {
      const endpoint = item.type === "note" ? `/api/notes?id=${item.id}` : `/api/files?id=${item.id}`;
      await fetch(endpoint, { method: "DELETE" });
    }
    await refreshItems();
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

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setPendingDelete(null);
    await doDelete(pendingDelete.items);
  };

  const handleFavorite = async (item: VaultItem) => {
    const endpoint = item.type === "note" ? "/api/notes" : "/api/files";
    await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, action: "favorite" }),
    });
    await refreshItems();
  };

  const handlePin = async (item: VaultItem) => {
    if (item.type !== "note") return;
    await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, action: "pin" }),
    });
    await refreshItems();
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

  const displayItems = isSearching ? searchResults : items;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      for (const file of Array.from(e.dataTransfer.files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("source", "upload");
        await fetch("/api/files", { method: "POST", body: formData });
      }
      await refreshItems();
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
