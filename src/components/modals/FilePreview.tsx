"use client";

import { useState, useEffect, useRef } from "react";
import { X, Download, Star, Trash2, Copy } from "lucide-react";
import { useVaultStore } from "@/store/vault-store";
import { formatFileSize, getCategoryLabel } from "@/lib/utils";
import { copyVaultItem } from "@/lib/clipboard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState("Loading...");
  useEffect(() => {
    fetch(url).then((r) => r.text()).then(setText).catch(() => setText("Failed to load"));
  }, [url]);
  return (
    <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)] font-mono bg-[var(--bg-input)] p-4 rounded-lg h-full overflow-auto">
      {text}
    </pre>
  );
}

export default function FilePreview() {
  const { showFilePreview, setShowFilePreview, selectedItem, refreshItems } = useVaultStore();
  const [copying, setCopying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Swipe-down to close
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);

  // Back button support
  useEffect(() => {
    if (!showFilePreview) return;

    // Push a state so back button can pop it
    window.history.pushState({ filePreview: true }, "");

    const handlePopState = () => setShowFilePreview(false);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showFilePreview, setShowFilePreview]);

  if (!showFilePreview || !selectedItem || selectedItem.type !== "file") return null;

  const { id, title, category, mime_type, file_size } = selectedItem;
  const previewUrl = `/api/files/download?id=${id}&action=preview`;
  const downloadUrl = `/api/files/download?id=${id}&action=download`;

  const handleClose = () => {
    // If we pushed a history state, pop it
    if (window.history.state?.filePreview) window.history.back();
    else setShowFilePreview(false);
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await fetch(`/api/files?id=${id}`, { method: "DELETE" });
    await refreshItems();
    handleClose();
  };

  const handleFavorite = async () => {
    await fetch("/api/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "favorite" }),
    });
    await refreshItems();
  };

  const handleCopy = async () => {
    setCopying(true);
    try { await copyVaultItem(selectedItem); } catch { /* ignore */ }
    setTimeout(() => setCopying(false), 1400);
  };

  // Touch handlers for swipe-down
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    touchDeltaY.current = delta;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
      sheetRef.current.style.transition = "none";
    }
  };

  const handleTouchEnd = () => {
    if (touchDeltaY.current > 100) {
      // Swiped down enough — close
      handleClose();
    } else {
      // Snap back
      if (sheetRef.current) {
        sheetRef.current.style.transform = "";
        sheetRef.current.style.transition = "transform 0.3s ease";
      }
    }
  };

  const renderPreview = () => {
    if (category === "image" || mime_type?.startsWith("image/")) {
      return (
        <img
          src={previewUrl}
          alt={title}
          className="max-w-full max-h-full object-contain mx-auto rounded-lg"
        />
      );
    }
    if (category === "pdf" || mime_type === "application/pdf") {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full rounded-lg border border-[var(--border)]"
          title={title}
        />
      );
    }
    if (category === "text" || mime_type?.startsWith("text/")) {
      return <TextPreview url={previewUrl} />;
    }
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
        <p className="text-[var(--text-secondary)] text-sm text-center px-4">
          Preview not available for this file type
        </p>
        <a
          href={downloadUrl}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium active:opacity-80"
        >
          <Download className="w-4 h-4" /> Download File
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full sm:max-w-3xl h-[92dvh] sm:h-[88dvh] bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col animate-slide-up"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle — mobile */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--border)] sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] truncate">{title}</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {getCategoryLabel(category!)} · {formatFileSize(file_size!)}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] text-[var(--text-muted)]" title="Copy">
              {copying ? <span className="text-[10px] font-medium text-[var(--accent)] px-1">✓</span> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={handleFavorite} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] text-[var(--text-muted)]" title="Favourite">
              <Star className="w-4 h-4" />
            </button>
            <a href={downloadUrl} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] text-[var(--text-muted)]" title="Download">
              <Download className="w-4 h-4" />
            </a>
            <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-lg hover:bg-red-500/10 active:bg-red-500/10 text-red-500" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] text-[var(--text-muted)]" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
          {renderPreview()}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          message={`"${title}" will be permanently deleted.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
