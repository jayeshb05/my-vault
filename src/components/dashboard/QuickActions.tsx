"use client";

import { Plus, Upload, Clipboard, Camera } from "lucide-react";
import { useVaultStore } from "@/store/vault-store";
import { useRef } from "react";

interface QuickActionsProps {
  onUpload: (files: FileList, source?: string) => void;
  onPaste: () => void;
}

export default function QuickActions({ onUpload, onPaste }: QuickActionsProps) {
  const { setShowNoteEditor, setEditingNoteId } = useVaultStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleNewNote = () => {
    setEditingNoteId(null);
    setShowNoteEditor(true);
  };

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Quick actions</p>
        <span className="text-[11px] text-[var(--text-muted)]">Fast • Smooth</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={handleNewNote}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white text-sm font-medium shadow-sm transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/80 text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-all active:scale-95 shrink-0"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>

        <button
          onClick={onPaste}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/80 text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-all active:scale-95 shrink-0"
        >
          <Clipboard className="w-4 h-4" />
          Paste
        </button>

        <button
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/80 text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-all active:scale-95 shrink-0"
        >
          <Camera className="w-4 h-4" />
          Camera
        </button>

        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          aria-label="Upload files"
          onChange={(e) => e.target.files && onUpload(e.target.files, "upload")}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-label="Capture image"
          onChange={(e) => e.target.files && onUpload(e.target.files, "camera")}
        />
      </div>
    </div>
  );
}
