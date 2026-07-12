"use client";

import {
  FileText,
  Image,
  File,
  Star,
  Pin,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  Copy,
  Edit,
} from "lucide-react";
import { useVaultStore } from "@/store/vault-store";
import { cn, formatFileSize, formatDate, getDateGroup, getCategoryLabel } from "@/lib/utils";
import type { VaultItem } from "@/lib/types";
import { useState } from "react";

interface ContentGridProps {
  items: VaultItem[];
  isLoading: boolean;
  onDelete: (item: VaultItem) => void;
  onFavorite: (item: VaultItem) => void;
  onPin: (item: VaultItem) => void;
}

function getIcon(item: VaultItem) {
  if (item.type === "note") return FileText;
  if (item.category === "image") return Image;
  return File;
}

export default function ContentGrid({ items, isLoading, onDelete, onFavorite, onPin }: ContentGridProps) {
  const { setSelectedItem, setShowNoteEditor, setShowFilePreview, setEditingNoteId } = useVaultStore();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">Your vault is empty</h3>
        <p className="text-sm text-[var(--text-muted)]">Create a note or upload a file to get started</p>
      </div>
    );
  }

  const groups: Record<string, VaultItem[]> = {};
  items.forEach((item) => {
    const group = getDateGroup(item.updated_at);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
  });

  const groupOrder = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Older"];

  const handleOpen = (item: VaultItem) => {
    setSelectedItem(item);
    if (item.type === "note") {
      setEditingNoteId(item.id);
      setShowNoteEditor(true);
    } else {
      setShowFilePreview(true);
    }
  };

  return (
    <div className="px-4 pb-8 space-y-6">
      {groupOrder.map((group) => {
        const groupItems = groups[group];
        if (!groupItems?.length) return null;

        return (
          <div key={group}>
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              {group}
            </h2>
            <div className="grid gap-2">
              {groupItems.map((item) => {
                const Icon = getIcon(item);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative flex items-center gap-3 p-3 rounded-xl",
                      "bg-[var(--bg-card)] border border-[var(--border)]",
                      "hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow-card)]",
                      "transition-all duration-200 cursor-pointer"
                    )}
                    onClick={() => handleOpen(item)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      item.type === "note" ? "bg-blue-500/10" : "bg-[var(--accent)]/10"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        item.type === "note" ? "text-blue-500" : "text-[var(--accent)]"
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {item.title}
                        </h3>
                        {item.is_pinned && <Pin className="w-3 h-3 text-[var(--accent)] shrink-0" />}
                        {item.is_favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {item.type === "file"
                          ? `${getCategoryLabel(item.category!)} · ${formatFileSize(item.file_size!)}`
                          : item.subtitle}
                      </p>
                    </div>

                    <span className="text-xs text-[var(--text-muted)] shrink-0 hidden sm:block">
                      {formatDate(item.updated_at)}
                    </span>

                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === item.id ? null : item.id); }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpen === item.id && (
                        <div className="absolute right-0 top-8 z-50 w-44 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg py-1 animate-fade-in">
                          {item.type === "note" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpen(item); setMenuOpen(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                            >
                              <Edit className="w-4 h-4" /> Edit
                            </button>
                          )}
                          {item.type === "file" && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setShowFilePreview(true); setMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                              >
                                <Eye className="w-4 h-4" /> Preview
                              </button>
                              <a
                                href={`/api/files/download?id=${item.id}&action=download`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                              >
                                <Download className="w-4 h-4" /> Download
                              </a>
                            </>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onFavorite(item); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                          >
                            <Star className="w-4 h-4" /> Favorite
                          </button>
                          {item.type === "note" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onPin(item); setMenuOpen(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                            >
                              <Pin className="w-4 h-4" /> Pin
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(item); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
