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
    <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
      <button
        onClick={handleNewNote}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-all active:scale-95 shrink-0"
      >
        <Plus className="w-4 h-4" />
        New Note
      </button>

      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-all active:scale-95 shrink-0"
      >
        <Upload className="w-4 h-4" />
        Upload
      </button>

      <button
        onClick={onPaste}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-all active:scale-95 shrink-0"
      >
        <Clipboard className="w-4 h-4" />
        Paste
      </button>

      <button
        onClick={() => cameraRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-all active:scale-95 shrink-0"
      >
        <Camera className="w-4 h-4" />
        Camera
      </button>

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onUpload(e.target.files, "upload")}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && onUpload(e.target.files, "camera")}
      />
    </div>
  );
}
