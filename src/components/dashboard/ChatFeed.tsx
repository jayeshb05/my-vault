"use client";

import {
  Star,
  Pin,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  File,
  Copy,
  CheckSquare,
  X,
  Eye,
} from "lucide-react";
import { cn, formatFileSize, getDateGroup, getCategoryLabel } from "@/lib/utils";
import type { VaultItem } from "@/lib/types";
import { copyVaultItem } from "@/lib/clipboard";
import { useState, useEffect, useRef, useCallback } from "react";

interface ChatFeedProps {
  items: VaultItem[];
  isLoading: boolean;
  onDelete: (item: VaultItem) => void;
  onFavorite: (item: VaultItem) => void;
  onPin: (item: VaultItem) => void;
  onBulkDelete?: (items: VaultItem[]) => void;
  onPreview?: (item: VaultItem) => void;
}

interface ContextMenu {
  x: number;
  y: number;
  item: VaultItem;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function copyItem(item: VaultItem) {
  try {
    await copyVaultItem(item);
  } catch {
    // final fallback
    await navigator.clipboard.writeText(item.title);
  }
}

interface BubbleProps {
  item: VaultItem;
  selected?: boolean;
  multiSelect?: boolean;
}

function TextBubble({ item }: BubbleProps) {
  return (
    <div className="bg-[var(--bubble-out)] text-[var(--bubble-text)] rounded-lg rounded-tr-none px-3 py-2 shadow-sm max-w-[min(280px,82vw)]">
      {item.is_pinned && <Pin className="w-3 h-3 inline mr-1 opacity-70" />}
      {item.is_favorite && <Star className="w-3 h-3 inline mr-1 text-yellow-300 fill-yellow-300" />}
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
        {item.content || item.subtitle || item.title}
      </p>
      <div className="flex items-center justify-end gap-1 mt-1">
        <span className="text-[10px] opacity-70">{formatTime(item.created_at)}</span>
      </div>
    </div>
  );
}

function ImageBubble({ item, onCopy, onPreview }: BubbleProps & { onCopy: (item: VaultItem) => void; onPreview?: (item: VaultItem) => void }) {
  const url = `/api/files/download?id=${item.id}&action=preview`;
  const downloadUrl = `/api/files/download?id=${item.id}&action=download`;
  const [copying, setCopying] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopying(true);
    await onCopy(item);
    setTimeout(() => setCopying(false), 1200);
  };

  return (
    <div className="bg-[var(--bubble-out)] rounded-lg rounded-tr-none overflow-hidden shadow-sm w-[min(220px,72vw)]">
      <div
        className="relative cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onPreview?.(item); }}
      >
        <img
          src={url}
          alt={item.title}
          className="w-full h-[140px] sm:h-[160px] object-cover bg-black/20"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity bg-black/20">
          <Eye className="w-6 h-6 text-white drop-shadow" />
        </div>
      </div>
      <div className="px-2.5 py-1 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--bubble-text)] opacity-80 truncate">{item.title}</span>
        <span className="text-[10px] text-[var(--bubble-text)] opacity-70 shrink-0">{formatTime(item.created_at)}</span>
      </div>
      <div className="flex border-t border-white/10">
        <button
          onClick={handleCopy}
          className="flex-1 py-2 text-center text-xs text-[var(--bubble-link)] hover:bg-white/5 active:bg-white/10 border-r border-white/10 flex items-center justify-center gap-1"
        >
          <Copy className="w-3 h-3" />
          {copying ? "Copied!" : "Copy"}
        </button>
        <a
          href={downloadUrl}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 py-2 text-center text-xs text-[var(--bubble-link)] hover:bg-white/5 active:bg-white/10 flex items-center justify-center gap-1"
        >
          <Download className="w-3 h-3" /> Save
        </a>
      </div>
    </div>
  );
}

function PdfBubble({ item, onCopy, onPreview }: BubbleProps & { onCopy: (item: VaultItem) => void; onPreview?: (item: VaultItem) => void }) {
  const downloadUrl = `/api/files/download?id=${item.id}&action=download`;
  const [copying, setCopying] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(true);

  // Render first page of PDF to canvas thumbnail
  useEffect(() => {
    let cancelled = false;
    async function renderThumb() {
      try {
        const res = await fetch(`/api/files/download?id=${item.id}&action=preview`);
        if (!res.ok) return;
        const data = await res.arrayBuffer();

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const pdf = await pdfjs.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
  canvas: canvas,
  canvasContext: ctx,
  viewport,
} as any).promise;
        if (!cancelled) setThumbnail(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        // leave thumbnail null — show fallback icon
      } finally {
        if (!cancelled) setThumbLoading(false);
      }
    }
    renderThumb();
    return () => { cancelled = true; };
  }, [item.id]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopying(true);
    await onCopy(item);
    setTimeout(() => setCopying(false), 1200);
  };

  return (
    <div className="bg-[var(--bubble-out)] rounded-lg rounded-tr-none overflow-hidden shadow-sm w-[min(240px,78vw)]">
      {/* Thumbnail */}
      <div
        className="h-[130px] sm:h-[150px] overflow-hidden relative cursor-pointer bg-white"
        onClick={(e) => { e.stopPropagation(); onPreview?.(item); }}
      >
        {thumbLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f5]">
            <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {thumbnail ? (
          <img
            src={thumbnail}
            alt="PDF preview"
            className="w-full h-full object-cover object-top"
          />
        ) : !thumbLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f5f5f5] gap-2">
            <div className="w-10 h-10 rounded bg-red-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">PDF</span>
            </div>
          </div>
        ) : null}
        {/* Eye overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity bg-black/20">
          <Eye className="w-6 h-6 text-white drop-shadow" />
        </div>
      </div>

      {/* File info */}
      <div className="px-2.5 py-2 flex items-start gap-2 border-t border-white/10">
        <div className="w-8 h-8 rounded bg-red-500/90 flex items-center justify-center shrink-0">
          <span className="text-white text-[9px] font-bold">PDF</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--bubble-text)] font-medium truncate">{item.title}</p>
          <p className="text-[10px] text-[var(--bubble-text)] opacity-70">
            PDF · {formatFileSize(item.file_size!)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-white/10">
        <button
          onClick={handleCopy}
          className="flex-1 py-2 text-center text-xs text-[var(--bubble-link)] hover:bg-white/5 active:bg-white/10 border-r border-white/10 flex items-center justify-center gap-1"
        >
          <Copy className="w-3 h-3" />
          {copying ? "Copied!" : "Copy"}
        </button>
        <a
          href={downloadUrl}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 py-2 text-center text-xs text-[var(--bubble-link)] hover:bg-white/5 active:bg-white/10 flex items-center justify-center gap-1"
        >
          <Download className="w-3 h-3" /> Save
        </a>
      </div>
      <div className="px-2.5 pb-1 flex justify-end">
        <span className="text-[10px] text-[var(--bubble-text)] opacity-70">{formatTime(item.created_at)}</span>
      </div>
    </div>
  );
}

function FileBubble({ item, onCopy, onPreview }: BubbleProps & { onCopy: (item: VaultItem) => void; onPreview?: (item: VaultItem) => void }) {
  const downloadUrl = `/api/files/download?id=${item.id}&action=download`;
  const isExcel = item.category === "excel";
  const isWord = item.category === "word" || item.category === "doc";
  const Icon = isExcel ? FileSpreadsheet : isWord ? FileText : File;
  const color = isExcel ? "bg-green-600" : isWord ? "bg-blue-600" : "bg-gray-600";
  const [copying, setCopying] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopying(true);
    await onCopy(item);
    setTimeout(() => setCopying(false), 1200);
  };

  return (
    <div className="bg-[var(--bubble-out)] rounded-lg rounded-tr-none overflow-hidden shadow-sm w-[min(240px,78vw)]">
      <div
        className="px-2.5 py-2.5 flex items-start gap-2 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
        onClick={(e) => { e.stopPropagation(); onPreview?.(item); }}
      >
        <div className={cn("w-9 h-9 rounded flex items-center justify-center shrink-0", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--bubble-text)] font-medium truncate">{item.title}</p>
          <p className="text-[10px] text-[var(--bubble-text)] opacity-70">
            {getCategoryLabel(item.category!)} · {formatFileSize(item.file_size!)}
          </p>
        </div>
        <Eye className="w-3.5 h-3.5 text-[var(--bubble-text)] opacity-40 shrink-0 mt-0.5" />
      </div>
      <div className="flex border-t border-white/10">
        <button
          onClick={handleCopy}
          className="flex-1 py-2 text-center text-xs text-[var(--bubble-link)] hover:bg-white/5 active:bg-white/10 border-r border-white/10 flex items-center justify-center gap-1"
        >
          <Copy className="w-3 h-3" />
          {copying ? "Copied!" : "Copy"}
        </button>
        <a
          href={downloadUrl}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 py-2 text-center text-xs text-[var(--bubble-link)] hover:bg-white/5 active:bg-white/10 flex items-center justify-center gap-1"
        >
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
      <div className="px-2.5 pb-1 flex justify-end">
        <span className="text-[10px] text-[var(--bubble-text)] opacity-70">{formatTime(item.created_at)}</span>
      </div>
    </div>
  );
}

function ContextMenuPanel({
  menu,
  onClose,
  onCopy,
  onDelete,
  onStar,
  onSelect,
  onPreview,
}: {
  menu: ContextMenu;
  onClose: () => void;
  onCopy: (item: VaultItem) => void;
  onDelete: (item: VaultItem) => void;
  onStar: (item: VaultItem) => void;
  onSelect: () => void;
  onPreview: (item: VaultItem) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(menu.x, window.innerWidth - rect.width - 8);
    const y = Math.min(menu.y, window.innerHeight - rect.height - 8);
    el.style.left = `${Math.max(8, x)}px`;
    el.style.top = `${Math.max(8, y)}px`;
  }, [menu]);

  const isFile = menu.item.type === "file";
  const downloadUrl = isFile ? `/api/files/download?id=${menu.item.id}&action=download` : null;

  const menuItems: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    action?: () => void;
    href?: string;
    danger?: boolean;
    starred?: boolean;
  }> = [
    ...(isFile ? [{
      icon: Eye,
      label: "Preview",
      action: () => { onPreview(menu.item); onClose(); },
    }] : []),
    { icon: Copy, label: "Copy", action: () => { onCopy(menu.item); onClose(); } },
    ...(downloadUrl ? [{
      icon: Download,
      label: "Download",
      href: downloadUrl,
    }] : []),
    { icon: CheckSquare, label: "Select", action: () => { onSelect(); onClose(); } },
    { icon: Star, label: "Star", action: () => { onStar(menu.item); onClose(); }, starred: menu.item.is_favorite },
    { icon: Trash2, label: "Delete", action: () => { onDelete(menu.item); onClose(); }, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[180px] py-1.5 rounded-lg shadow-2xl border border-[var(--border)] bg-[var(--bg-card)] animate-fade-in"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map(({ icon: Icon, label, action, href, danger, starred }) =>
        href ? (
          <a
            key={label}
            href={href}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
            onClick={onClose}
          >
            <Icon className="w-4 h-4" />
            {label}
          </a>
        ) : (
          <button
            key={label}
            onClick={action}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-hover)] transition-colors",
              danger ? "text-red-500" : "text-[var(--text-primary)]",
              starred && "text-yellow-500"
            )}
          >
            <Icon className={cn("w-4 h-4", starred && "fill-yellow-500")} />
            {label}
          </button>
        )
      )}
    </div>
  );
}

export default function ChatFeed({
  items,
  isLoading,
  onDelete,
  onFavorite,
  onBulkDelete,
  onPreview,
}: ChatFeedProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [items.length, items[items.length - 1]?.id]);

  const exitMultiSelect = useCallback(() => {
    setMultiSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleContextMenu = (e: React.MouseEvent, item: VaultItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (multiSelectMode) {
      exitMultiSelect();
      return;
    }

    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleFeedContextMenu = (e: React.MouseEvent) => {
    if (multiSelectMode) {
      e.preventDefault();
      exitMultiSelect();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRowClick = (item: VaultItem) => {
    if (multiSelectMode) {
      toggleSelect(item.id);
    }
  };

  const startMultiSelect = (item: VaultItem) => {
    setMultiSelectMode(true);
    setSelectedIds(new Set([item.id]));
  };

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  const handleBulkCopy = async () => {
    if (selectedItems.length === 1) {
      await copyItem(selectedItems[0]);
    } else if (selectedItems.length > 1) {
      const text = selectedItems
        .map((i) => (i.type === "note" ? i.content || i.title : i.title))
        .join("\n\n");
      await navigator.clipboard.writeText(text);
    }
    exitMultiSelect();
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    onDelete(selectedItems[0]);
    if (selectedItems.length > 1) {
      selectedItems.slice(1).forEach((item) => onDelete(item));
    }
    exitMultiSelect();
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-sm text-[var(--text-muted)]">Type or paste below to save to your vault</p>
      </div>
    );
  }

  const sorted = [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const groups: Record<string, VaultItem[]> = {};
  sorted.forEach((item) => {
    const group = getDateGroup(item.created_at);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
  });

  const groupOrder = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Older"];

  const renderBubble = (item: VaultItem) => {
    if (item.type === "note") return <TextBubble item={item} />;
    if (item.category === "image") return <ImageBubble item={item} onCopy={copyItem} onPreview={onPreview} />;
    if (item.category === "pdf") return <PdfBubble item={item} onCopy={copyItem} onPreview={onPreview} />;
    return <FileBubble item={item} onCopy={copyItem} onPreview={onPreview} />;
  };

  const supportsContextMenu = (item: VaultItem) =>
    item.type === "note" ||
    item.category === "image" ||
    item.category === "pdf" ||
    item.category === "excel" ||
    item.type === "file";

  return (
    <>
      {multiSelectMode && (
        <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-2.5 bg-[var(--header-bg)] border-b border-[var(--border)]">
          <button
            onClick={exitMultiSelect}
            className="p-1.5 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-[var(--text-primary)] flex-1">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkCopy}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-red-500 hover:bg-red-500/10 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}

      <div
        ref={feedRef}
        className="px-3 py-4 space-y-3 chat-wallpaper min-h-[50vh]"
        onContextMenu={handleFeedContextMenu}
      >
        {groupOrder.map((group) => {
          const groupItems = groups[group];
          if (!groupItems?.length) return null;

          return (
            <div key={group} className="space-y-2">
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 rounded-lg bg-[var(--date-pill)] text-xs text-[var(--text-secondary)] shadow-sm">
                  {group === "Today" ? "Today" : group}
                </span>
              </div>
              {groupItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 w-full",
                      multiSelectMode && "cursor-pointer",
                      isSelected && multiSelectMode && "bg-[var(--accent)]/10 rounded-lg"
                    )}
                    onClick={() => handleRowClick(item)}
                    onContextMenu={(e) => supportsContextMenu(item) && handleContextMenu(e, item)}
                  >
                    {multiSelectMode && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ml-1",
                          isSelected
                            ? "bg-[var(--accent)] border-[var(--accent)]"
                            : "border-[var(--text-muted)] bg-transparent"
                        )}
                      >
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    )}

                    <div className="flex-1 flex justify-end min-w-0">
                      {renderBubble(item)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {contextMenu && (
        <ContextMenuPanel
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onCopy={(item) => copyItem(item)}
          onDelete={onDelete}
          onStar={onFavorite}
          onSelect={() => startMultiSelect(contextMenu.item)}
          onPreview={(item) => { onPreview?.(item); setContextMenu(null); }}
        />
      )}
    </>
  );
}
