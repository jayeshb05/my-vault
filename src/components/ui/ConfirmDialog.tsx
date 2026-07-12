"use client";

import { Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm mx-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl p-5 animate-slide-up">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
          <Trash2 className="w-5 h-5 text-red-500" />
        </div>

        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Delete item?</h3>
        <p className="text-sm text-[var(--text-muted)] mb-5">{message}</p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 active:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
