"use client";

import { useState, useEffect, useRef } from "react";
import { X, Download, Star, Trash2, Copy, ArrowLeft } from "lucide-react";
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
  const [closing, setClosing] = useState(false);

  // Image gesture state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastPan = useRef({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);

  // Swipe-down gesture state
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const currentDelta = useRef(0);
  const isDragging = useRef(false);

  // Back button support
  useEffect(() => {
    if (!showFilePreview) return;
    window.history.pushState({ filePreview: true }, "");
    const handlePopState = () => triggerClose();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showFilePreview]);

  // Reset closing state when modal opens
  useEffect(() => {
    if (showFilePreview) setClosing(false);
  }, [showFilePreview]);

  if (!showFilePreview || !selectedItem || selectedItem.type !== "file") return null;

  const { id, title, category, mime_type, file_size } = selectedItem;
  const previewUrl = `/api/files/download?id=${id}&action=preview`;
  const downloadUrl = `/api/files/download?id=${id}&action=download`;

  // Animate sheet down then close
  const triggerClose = () => {
    if (closing) return;
    const sheet = sheetRef.current;
    if (sheet) {
      setClosing(true);
      sheet.style.transition = "transform 0.28s cubic-bezier(0.4,0,1,1)";
      sheet.style.transform = "translateY(110%)";
      setTimeout(() => {
        setShowFilePreview(false);
        setClosing(false);
        if (sheet) {
          sheet.style.transform = "";
          sheet.style.transition = "";
        }
        // reset image transform
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }, 280);
    } else {
      setShowFilePreview(false);
    }
  };

  const handleClose = () => {
    if (window.history.state?.filePreview) window.history.back();
    else triggerClose();
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

  // ── Swipe-down gesture ──────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    currentDelta.current = 0;
    isDragging.current = false;

    if (e.touches.length === 2) {
      // start pinch
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      lastDistance.current = Math.hypot(dx, dy);
      lastCenter.current = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
    } else {
      lastDistance.current = null;
      lastCenter.current = null;
    }

    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transition = "none";
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If two fingers — pinch-to-zoom
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy);
      if (lastDistance.current && lastCenter.current) {
        const deltaScale = dist / lastDistance.current;
        const nextScale = Math.max(1, Math.min(5, scale * deltaScale));
        // compute movement to keep center stable
        const center = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
        const dxCenter = center.x - lastCenter.current.x;
        const dyCenter = center.y - lastCenter.current.y;
        setScale(nextScale);
        setTranslate((prev) => ({ x: prev.x + dxCenter, y: prev.y + dyCenter }));
        lastDistance.current = dist;
        lastCenter.current = center;
      } else {
        lastDistance.current = dist;
        lastCenter.current = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
      }
      return;
    }

    // Single finger — if zoomed, pan image; otherwise treat as sheet drag
    if (e.touches.length === 1 && scale > 1) {
      const t = e.touches[0];
      const dx = t.clientX - (lastPan.current.x || t.clientX);
      const dy = t.clientY - (lastPan.current.y || t.clientY);
      lastPan.current = { x: t.clientX, y: t.clientY };
      setTranslate((p) => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }

    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta < 0) return; // only allow downward drag when not zooming

    currentDelta.current = delta;
    isDragging.current = true;

    const sheet = sheetRef.current;
    if (sheet) {
      const resistance = delta > 150 ? 150 + (delta - 150) * 0.4 : delta;
      sheet.style.transform = `translateY(${resistance}px)`;
    }
  };

  const handleTouchEnd = () => {
    const sheet = sheetRef.current;

    // Reset lastPan for next gesture
    lastPan.current = { x: 0, y: 0 };

    // If we were pinching, just clear pinch state
    if (lastDistance.current) {
      lastDistance.current = null;
      lastCenter.current = null;
      return;
    }

    if (!isDragging.current) {
      // detect double tap to zoom
      const now = Date.now();
      if (now - lastTap.current < 300) {
        // double tap
        const newScale = scale > 1 ? 1 : 2;
        setScale(newScale);
        if (newScale === 1) setTranslate({ x: 0, y: 0 });
      }
      lastTap.current = now;
      return;
    }

    const delta = currentDelta.current;
    const elapsed = Date.now() - touchStartTime.current;
    const velocity = delta / elapsed; // px/ms

    const shouldClose = delta > 120 || velocity > 0.5;

    if (shouldClose) {
      triggerClose();
    } else {
      if (sheet) {
        sheet.style.transition = "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)";
        sheet.style.transform = "translateY(0)";
        setTimeout(() => {
          if (sheet) sheet.style.transition = "";
        }, 350);
      }
    }

    isDragging.current = false;
  };
  // ────────────────────────────────────────────────────────────────────────

  const renderPreview = () => {
    if (category === "image" || mime_type?.startsWith("image/")) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={previewUrl}
            alt={title}
            draggable={false}
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transition: lastDistance.current ? "none" : "transform 0.08s",
              touchAction: "none",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
            onTouchStart={(e) => e.stopPropagation()}
          />
        </div>
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full sm:max-w-3xl h-[92dvh] sm:h-[88dvh] bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col animate-slide-up"
        style={{ willChange: "transform", touchAction: "pan-y" }}
        onTouchStartCapture={handleTouchStart}
        onTouchMoveCapture={handleTouchMove}
        onTouchEndCapture={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--border)] sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]" title="Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 pr-2">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] truncate">{title}</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {getCategoryLabel(category!)} · {formatFileSize(file_size!)}
              </p>
            </div>
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

        {/* Preview area — allow internal scroll only when not at top */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
          {renderPreview()}
        </div>
      </div>

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
