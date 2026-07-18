"use client";

import {
  CheckSquare, Copy, Download, Eye, File,
  FileSpreadsheet, FileText, Pin, Star, Trash2, X,
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

interface ContextMenu { x: number; y: number; item: VaultItem; }

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function copyItem(item: VaultItem) {
  try { await copyVaultItem(item); } catch { await navigator.clipboard.writeText(item.title); }
}

/* ── Text bubble ────────────────────────────────────────────────────────── */
function TextBubble({ item }: { item: VaultItem }) {
  return (
    <div className="bg-[var(--bubble-out)] text-[var(--bubble-text)] rounded-[16px] rounded-tr-[4px] px-3.5 py-2.5 shadow-sm max-w-[min(300px,84vw)]">
      {item.is_pinned && <Pin className="inline mr-1 opacity-60" style={{ width: 11, height: 11 }} />}
      {item.is_favorite && <Star className="inline mr-1 text-yellow-400 fill-yellow-400" style={{ width: 11, height: 11 }} />}
      <p className="text-[13.5px] whitespace-pre-wrap break-words leading-relaxed">
        {item.content || item.subtitle || item.title}
      </p>
      <div className="flex justify-end mt-1">
        <span className="text-[10px] opacity-60 tabular-nums">{formatTime(item.created_at)}</span>
      </div>
    </div>
  );
}

/* ── Image bubble ───────────────────────────────────────────────────────── */
function ImageBubble({ item, onCopy, onPreview }: {
  item: VaultItem;
  onCopy: (item: VaultItem) => void;
  onPreview?: (item: VaultItem) => void;
}) {
  const url = `/api/files/download?id=${item.id}&action=preview`;
  const downloadUrl = `/api/files/download?id=${item.id}&action=download`;
  const [copying, setCopying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopying(true);
    await onCopy(item);
    setTimeout(() => setCopying(false), 1200);
  };

  return (
    <div className="bg-[var(--bubble-out)] rounded-[16px] rounded-tr-[4px] overflow-hidden shadow-sm w-[min(220px,72vw)]">
      <div className="relative cursor-pointer" onClick={(e) => { e.stopPropagation(); onPreview?.(item); }}>
        {!loaded && <div className="skeleton absolute inset-0 h-[145px]" />}
        <img
          src={url}
          alt={item.title}
          className={cn(
            "w-full h-[145px] object-cover bg-black/10 transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          draggable={false}
          onLoad={() => setLoaded(true)}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity bg-black/20 rounded-t-[14px]">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Eye style={{ width: 16, height: 16 }} className="text-white" />
          </div>
        </div>
      </div>
      <div className="px-3 py-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--bubble-text)] opacity-75 truncate">{item.title}</span>
        <span className="text-[10px] text-[var(--bubble-text)] opacity-55 shrink-0 tabular-nums">{formatTime(item.created_at)}</span>
      </div>
      <div className="flex border-t border-black/8">
        <button onClick={handleCopy} className="bubble-action-btn border-r border-black/8">
          <Copy style={{ width: 11, height: 11 }} />
          {copying ? "Copied!" : "Copy"}
        </button>
        <a href={downloadUrl} onClick={(e) => e.stopPropagation()} className="bubble-action-btn">
          <Download style={{ width: 11, height: 11 }} /> Save
        </a>
      </div>
    </div>
  );
}

/* ── PDF bubble ─────────────────────────────────────────────────────────── */
function PdfBubble({ item, onCopy, onPreview }: {
  item: VaultItem;
  onCopy: (item: VaultItem) => void;
  onPreview?: (item: VaultItem) => void;
}) {
  const downloadUrl = `/api/files/download?id=${item.id}&action=download`;
  const [copying, setCopying] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function renderThumb() {
      try {
        const res = await fetch(`/api/files/download?id=${item.id}&action=preview`);
        if (!res.ok) return;
        const data = await res.arrayBuffer();
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url
        ).toString();
        const pdf = await pdfjs.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.75 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
        if (!cancelled) setThumbnail(canvas.toDataURL("image/jpeg", 0.82));
      } catch { /* ignore */ } finally {
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
    <div className="bg-[var(--bubble-out)] rounded-[16px] rounded-tr-[4px] overflow-hidden shadow-sm w-[min(240px,78vw)]">
      <div className="h-[130px] overflow-hidden relative cursor-pointer bg-white" onClick={(e) => { e.stopPropagation(); onPreview?.(item); }}>
        {thumbLoading && <div className="skeleton absolute inset-0" />}
        {thumbnail ? (
          <img src={thumbnail} alt="PDF preview" className="w-full h-full object-cover object-top" />
        ) : !thumbLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fafafa] gap-2">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-sm">
              <span className="text-white text-[10px] font-bold">PDF</span>
            </div>
          </div>
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity bg-black/20">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Eye style={{ width: 16, height: 16 }} className="text-white" />
          </div>
        </div>
      </div>
      <div className="px-3 py-2 flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
          <span className="text-white text-[8px] font-bold">PDF</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-[var(--bubble-text)] font-medium truncate">{item.title}</p>
          <p className="text-[10px] text-[var(--bubble-text)] opacity-60">{formatFileSize(item.file_size!)}</p>
        </div>
        <span className="text-[10px] text-[var(--bubble-text)] opacity-55 tabular-nums shrink-0">{formatTime(item.created_at)}</span>
      </div>
      <div className="flex border-t border-black/8">
        <button onClick={handleCopy} className="bubble-action-btn border-r border-black/8">
          <Copy style={{ width: 11, height: 11 }} />
          {copying ? "Copied!" : "Copy"}
        </button>
        <a href={downloadUrl} onClick={(e) => e.stopPropagation()} className="bubble-action-btn">
          <Download style={{ width: 11, height: 11 }} /> Save
        </a>
      </div>
    </div>
  );
}

/* ── File bubble ────────────────────────────────────────────────────────── */
function FileBubble({ item, onCopy, onPreview }: {
  item: VaultItem;
  onCopy: (item: VaultItem) => void;
  onPreview?: (item: VaultItem) => void;
}) {
  const downloadUrl = `/api/files/download?id=${item.id}&action=download`;
  const isExcel = item.category === "excel";
  const isWord = item.category === "word" || item.category === "doc";
  const Icon = isExcel ? FileSpreadsheet : isWord ? FileText : File;
  const color = isExcel ? "bg-green-600" : isWord ? "bg-blue-600" : "bg-slate-500";
  const [copying, setCopying] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopying(true);
    await onCopy(item);
    setTimeout(() => setCopying(false), 1200);
  };

  return (
    <div className="bg-[var(--bubble-out)] rounded-[16px] rounded-tr-[4px] overflow-hidden shadow-sm w-[min(240px,78vw)]">
      <div
        className="px-3 py-3 flex items-center gap-2.5 cursor-pointer hover:bg-black/5 active:bg-black/10 transition-colors"
        onClick={(e) => { e.stopPropagation(); onPreview?.(item); }}
      >
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", color)}>
          <Icon style={{ width: 18, height: 18 }} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] text-[var(--bubble-text)] font-medium truncate">{item.title}</p>
          <p className="text-[10px] text-[var(--bubble-text)] opacity-60">
            {getCategoryLabel(item.category!)} · {formatFileSize(item.file_size!)}
          </p>
        </div>
      </div>
      <div className="px-3 pb-1.5 flex justify-end">
        <span className="text-[10px] text-[var(--bubble-text)] opacity-55 tabular-nums">{formatTime(item.created_at)}</span>
      </div>
      <div className="flex border-t border-black/8">
        <button onClick={handleCopy} className="bubble-action-btn border-r border-black/8">
          <Copy style={{ width: 11, height: 11 }} />
          {copying ? "Copied!" : "Copy"}
        </button>
        <a href={downloadUrl} onClick={(e) => e.stopPropagation()} className="bubble-action-btn">
          <Download style={{ width: 11, height: 11 }} /> Save
        </a>
      </div>
    </div>
  );
}

/* ── Context menu panel ─────────────────────────────────────────────────── */
function ContextMenuPanel({
  menu, onClose, onCopy, onDelete, onStar, onSelect, onPreview,
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
  const isStarred = menu.item.is_favorite;

  const entries: Array<{
    icon: React.ElementType;
    label: string;
    action?: () => void;
    href?: string;
    danger?: boolean;
    active?: boolean;
  }> = [
    ...(isFile ? [{ icon: Eye, label: "Preview", action: () => { onPreview(menu.item); onClose(); } }] : []),
    { icon: Copy, label: "Copy", action: () => { onCopy(menu.item); onClose(); } },
    ...(downloadUrl ? [{ icon: Download, label: "Download", href: downloadUrl }] : []),
    { icon: CheckSquare, label: "Select", action: () => { onSelect(); onClose(); } },
    { icon: Star, label: isStarred ? "Unstar" : "Star", action: () => { onStar(menu.item); onClose(); }, active: isStarred },
    { icon: Trash2, label: "Delete", action: () => { onDelete(menu.item); onClose(); }, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[100] context-menu animate-pop-in"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {entries.map(({ icon: Icon, label, action, href, danger, active }, i) =>
        href ? (
          <a key={label} href={href} className="context-menu-item" onClick={onClose}>
            <Icon style={{ width: 16, height: 16 }} className="text-[var(--text-muted)]" />
            {label}
          </a>
        ) : (
          <button
            key={label}
            onClick={action}
            className={cn(
              "context-menu-item",
              danger && "text-red-500",
              active && "text-yellow-500"
            )}
          >
            <Icon style={{ width: 16, height: 16 }} className={cn(
              danger ? "text-red-500" : active ? "text-yellow-500 fill-yellow-500" : "text-[var(--text-muted)]"
            )} />
            {label}
          </button>
        )
      )}
    </div>
  );
}

/* ── Loading skeleton ────────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="px-3 py-4 space-y-3">
      {[200, 120, 260, 90, 180].map((w, i) => (
        <div key={i} className="flex justify-end">
          <div className="skeleton loading-bubble" style={{ width: `${w}px` }} />
        </div>
      ))}
    </div>
  );
}

/* ── Main ChatFeed ───────────────────────────────────────────────────────── */
export default function ChatFeed({
  items, isLoading, onDelete, onFavorite, onBulkDelete, onPreview,
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
    if (multiSelectMode) { exitMultiSelect(); return; }
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const startMultiSelect = (item: VaultItem) => {
    setMultiSelectMode(true);
    setSelectedIds(new Set([item.id]));
  };

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  const handleBulkCopy = async () => {
    if (selectedItems.length === 1) { await copyItem(selectedItems[0]); }
    else if (selectedItems.length > 1) {
      const text = selectedItems.map((i) => (i.type === "note" ? i.content || i.title : i.title)).join("\n\n");
      await navigator.clipboard.writeText(text);
    }
    exitMultiSelect();
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    onBulkDelete?.(selectedItems);
    exitMultiSelect();
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.id)));
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  if (isLoading && items.length === 0) return <LoadingSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mb-4 opacity-80 animate-float">
          <FileText style={{ width: 28, height: 28 }} className="text-white" />
        </div>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          Type, paste, or share anything to save it here
        </p>
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
  const groupOrder = ["Older", "Last 30 Days", "Last 7 Days", "Yesterday", "Today"];

  const renderBubble = (item: VaultItem) => {
    if (item.type === "note") return <TextBubble item={item} />;
    if (item.category === "image") return <ImageBubble item={item} onCopy={copyItem} onPreview={onPreview} />;
    if (item.category === "pdf") return <PdfBubble item={item} onCopy={copyItem} onPreview={onPreview} />;
    return <FileBubble item={item} onCopy={copyItem} onPreview={onPreview} />;
  };

  return (
    <>
      {/* Multi-select toolbar */}
      {multiSelectMode && (
        <div className="sticky top-0 z-30 flex items-center gap-2 px-3 py-2.5 bg-[var(--accent)] text-white animate-slide-down">
          <button onClick={exitMultiSelect} className="p-1.5 rounded-full hover:bg-white/20 transition-colors btn-press">
            <X style={{ width: 18, height: 18 }} />
          </button>
          <span className="text-sm font-medium flex-1">{selectedIds.size} selected</span>
          <button onClick={handleSelectAll} className="px-3 py-1.5 rounded-full text-sm hover:bg-white/20 transition-colors">
            {selectedIds.size === items.length ? "None" : "All"}
          </button>
          <button onClick={handleBulkCopy} disabled={!selectedIds.size} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm hover:bg-white/20 disabled:opacity-40 transition-colors btn-press">
            <Copy style={{ width: 14, height: 14 }} /> Copy
          </button>
          <button onClick={handleBulkDelete} disabled={!selectedIds.size} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm hover:bg-white/20 disabled:opacity-40 transition-colors btn-press">
            <Trash2 style={{ width: 14, height: 14 }} /> Delete
          </button>
        </div>
      )}

      <div ref={feedRef} className="px-3 py-4 chat-wallpaper min-h-[50vh]"
        onContextMenu={(e) => { if (multiSelectMode) { e.preventDefault(); exitMultiSelect(); } }}>
        {groupOrder.map((group) => {
          const groupItems = groups[group];
          if (!groupItems?.length) return null;
          return (
            <div key={group} className="space-y-1.5 mb-2">
              <div className="flex justify-center my-3">
                <span className="px-3.5 py-1 rounded-full bg-[var(--date-pill)] text-xs text-[var(--text-secondary)] shadow-sm font-medium backdrop-blur-sm border border-[var(--border)]/40">
                  {group}
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
                      isSelected && multiSelectMode && "bg-[var(--accent)]/10 rounded-2xl px-1"
                    )}
                    onClick={() => multiSelectMode && toggleSelect(item.id)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    {multiSelectMode && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-150 ml-1",
                          isSelected ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--text-muted)]"
                        )}
                      >
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    )}
                    <div className="flex-1 flex justify-end min-w-0 py-0.5">
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
          onCopy={copyItem}
          onDelete={onDelete}
          onStar={onFavorite}
          onSelect={() => startMultiSelect(contextMenu.item)}
          onPreview={(item) => { onPreview?.(item); setContextMenu(null); }}
        />
      )}
    </>
  );
}
