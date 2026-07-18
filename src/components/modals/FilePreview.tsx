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
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const lastPan = useRef({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const lastTapPos = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isPinching = useRef(false);

  // Swipe-down gesture state — shared across whole overlay
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const currentDelta = useRef(0);
  const isDragging = useRef(false);
  const gestureTarget = useRef<"swipe" | "pinch" | "pan" | "none">("none");

  // Keep refs in sync
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { translateRef.current = translate; }, [translate]);

  // Back button support
  useEffect(() => {
    if (!showFilePreview) return;
    window.history.pushState({ filePreview: true }, "");
    const handlePopState = () => triggerClose();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFilePreview]);

  // Reset state when modal opens
  useEffect(() => {
    if (showFilePreview) {
      setClosing(false);
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      scaleRef.current = 1;
      translateRef.current = { x: 0, y: 0 };
    }
  }, [showFilePreview]);

  if (!showFilePreview || !selectedItem || selectedItem.type !== "file") return null;

  const { id, title, category, mime_type, file_size, created_at } = selectedItem;
  const previewUrl = `/api/files/download?id=${id}&action=preview`;
  const downloadUrl = `/api/files/download?id=${id}&action=download`;
  const isImage = category === "image" || mime_type?.startsWith("image/");

  const formatPreviewMeta = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} • ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  };

  const previewMeta = formatPreviewMeta(created_at);

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

  // ── Unified touch gesture handlers (attached to entire overlay) ──────────

  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;
    touchStartTime.current = Date.now();
    currentDelta.current = 0;
    isDragging.current = false;
    gestureTarget.current = "none";

    if (touches.length === 2) {
      // Start pinch — always on image
      isPinching.current = true;
      gestureTarget.current = "pinch";
      const t0 = touches[0];
      const t1 = touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      lastDistance.current = Math.hypot(dx, dy);
      lastCenter.current = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      // Stop sheet dragging when pinching
      const sheet = sheetRef.current;
      if (sheet) sheet.style.transition = "none";
    } else if (touches.length === 1) {
      isPinching.current = false;
      lastDistance.current = null;
      lastCenter.current = null;
      touchStartY.current = touches[0].clientY;
      touchStartX.current = touches[0].clientX;
      lastTapPos.current = { x: touches[0].clientX, y: touches[0].clientY };
      lastPan.current = { x: touches[0].clientX, y: touches[0].clientY };

      const sheet = sheetRef.current;
      if (sheet) sheet.style.transition = "none";
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 2 && isImage) {
      // Pinch-to-zoom
      e.stopPropagation();
      const t0 = touches[0];
      const t1 = touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy);
      const center = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };

      if (lastDistance.current && lastCenter.current) {
        const deltaScale = dist / lastDistance.current;
        const cur = scaleRef.current;
        const nextScale = Math.max(1, Math.min(5, cur * deltaScale));
        const dxCenter = center.x - lastCenter.current.x;
        const dyCenter = center.y - lastCenter.current.y;
        scaleRef.current = nextScale;
        translateRef.current = {
          x: translateRef.current.x + dxCenter,
          y: translateRef.current.y + dyCenter,
        };
        setScale(nextScale);
        setTranslate({ ...translateRef.current });
      }
      lastDistance.current = dist;
      lastCenter.current = center;
      gestureTarget.current = "pinch";
      return;
    }

    if (touches.length === 1) {
      const t = touches[0];
      const dy = t.clientY - touchStartY.current;
      const dx = t.clientX - touchStartX.current;

      // If zoomed in and image, pan image
      if (isImage && scaleRef.current > 1 && gestureTarget.current !== "swipe") {
        const pdx = t.clientX - lastPan.current.x;
        const pdy = t.clientY - lastPan.current.y;
        lastPan.current = { x: t.clientX, y: t.clientY };
        translateRef.current = {
          x: translateRef.current.x + pdx,
          y: translateRef.current.y + pdy,
        };
        setTranslate({ ...translateRef.current });
        gestureTarget.current = "pan";
        return;
      }

      // Determine gesture type early
      if (gestureTarget.current === "none") {
        if (Math.abs(dy) > 8 && dy > 0 && Math.abs(dy) > Math.abs(dx)) {
          gestureTarget.current = "swipe";
        } else if (Math.abs(dx) > 8 || (dy < 0)) {
          gestureTarget.current = "none"; // not a downward swipe
          return;
        }
      }

      if (gestureTarget.current === "swipe") {
        const delta = Math.max(0, dy);
        currentDelta.current = delta;
        isDragging.current = true;
        const sheet = sheetRef.current;
        if (sheet) {
          const resistance = delta > 150 ? 150 + (delta - 150) * 0.4 : delta;
          sheet.style.transform = `translateY(${resistance}px)`;
        }
      }

      lastPan.current = { x: t.clientX, y: t.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const sheet = sheetRef.current;

    // Finished pinching
    if (gestureTarget.current === "pinch") {
      lastDistance.current = null;
      lastCenter.current = null;
      isPinching.current = false;
      gestureTarget.current = "none";
      return;
    }

    // Finished panning (zoomed image)
    if (gestureTarget.current === "pan") {
      gestureTarget.current = "none";
      return;
    }

    if (!isDragging.current && gestureTarget.current !== "swipe") {
      // Detect double-tap to zoom (image only)
      if (isImage) {
        const now = Date.now();
        const prev = lastTap.current;
        const tapPos = lastTapPos.current;
        if (now - prev < 300 && tapPos) {
          const img = imgRef.current;
          const curScale = scaleRef.current;
          const newScale = curScale > 1 ? 1 : 2.5;
          if (img) {
            const rect = img.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const px = tapPos.x - cx;
            const py = tapPos.y - cy;
            const tx = translateRef.current.x + (curScale - newScale) * px / curScale;
            const ty = translateRef.current.y + (curScale - newScale) * py / curScale;
            if (newScale === 1) {
              setScale(1);
              setTranslate({ x: 0, y: 0 });
              scaleRef.current = 1;
              translateRef.current = { x: 0, y: 0 };
            } else {
              setScale(newScale);
              setTranslate({ x: tx, y: ty });
              scaleRef.current = newScale;
              translateRef.current = { x: tx, y: ty };
            }
          } else {
            const newS = scaleRef.current > 1 ? 1 : 2.5;
            setScale(newS);
            if (newS === 1) { setTranslate({ x: 0, y: 0 }); scaleRef.current = 1; translateRef.current = { x: 0, y: 0 }; }
          }
          lastTap.current = 0; // reset so triple-tap doesn't re-trigger
          gestureTarget.current = "none";
          return;
        }
        lastTap.current = now;
        lastTapPos.current = null;
      }
      gestureTarget.current = "none";
      return;
    }

    // Swipe-down: decide to close or spring back
    const delta = currentDelta.current;
    const elapsed = Date.now() - touchStartTime.current;
    const velocity = delta / Math.max(elapsed, 1);
    const shouldClose = delta > 100 || velocity > 0.45;

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
    gestureTarget.current = "none";
  };
  // ─────────────────────────────────────────────────────────────────────────

  const renderPreview = () => {
    if (isImage) {
      return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <img
            ref={imgRef}
            src={previewUrl}
            alt={title}
            draggable={false}
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transition: isPinching.current ? "none" : "transform 0.1s ease-out",
              touchAction: "none",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              willChange: "transform",
              userSelect: "none",
            }}
          />
          {scale > 1 && (
            <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              {Math.round(scale * 100)}%
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-black/55 px-3 py-2 backdrop-blur-sm pointer-events-none">
            <p className="text-sm font-medium text-white truncate">{title}</p>
            <p className="text-xs text-white/80">{previewMeta}</p>
          </div>
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
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {/* Backdrop — clicking closes, touch swipe handled by overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full sm:max-w-3xl h-screen sm:h-[88dvh] bg-[var(--bg-card)] rounded-none sm:rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col animate-slide-up"
        style={{ willChange: "transform" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--border)] sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-2 py-2 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] shrink-0" title="Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 pr-1">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">{title}</h2>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {getCategoryLabel(category!)} · {formatFileSize(file_size!)}{previewMeta ? ` · ${previewMeta}` : ""}
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

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0" style={{ touchAction: isImage ? "none" : "auto" }}>
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
