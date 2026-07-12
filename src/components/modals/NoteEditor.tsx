"use client";

import { useState, useEffect } from "react";
import { X, Save, Pin, Star, Copy, Trash2 } from "lucide-react";
import { useVaultStore } from "@/store/vault-store";
import { cn } from "@/lib/utils";

export default function NoteEditor() {
  const {
    showNoteEditor,
    setShowNoteEditor,
    editingNoteId,
    setEditingNoteId,
    refreshItems,
  } = useVaultStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showNoteEditor && editingNoteId) {
      fetch(`/api/notes?id=${editingNoteId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.note) {
            setTitle(data.note.title);
            setContent(data.note.content);
          }
        });
    } else if (showNoteEditor) {
      setTitle("");
      setContent("");
    }
  }, [showNoteEditor, editingNoteId]);

  const handleClose = () => {
    setShowNoteEditor(false);
    setEditingNoteId(null);
    setTitle("");
    setContent("");
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);

    try {
      if (editingNoteId) {
        await fetch("/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingNoteId, title, content }),
        });
      } else {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
      }
      await refreshItems();
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingNoteId || !confirm("Delete this note?")) return;
    await fetch(`/api/notes?id=${editingNoteId}`, { method: "DELETE" });
    await refreshItems();
    handleClose();
  };

  const handlePin = async () => {
    if (!editingNoteId) return;
    await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingNoteId, action: "pin" }),
    });
    await refreshItems();
  };

  const handleFavorite = async () => {
    if (!editingNoteId) return;
    await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingNoteId, action: "favorite" }),
    });
    await refreshItems();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  if (!showNoteEditor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="flex-1 text-lg font-semibold bg-transparent text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
          />
          <div className="flex items-center gap-1">
            {editingNoteId && (
              <>
                <button onClick={handlePin} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><Pin className="w-4 h-4" /></button>
                <button onClick={handleFavorite} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><Star className="w-4 h-4" /></button>
                <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><Copy className="w-4 h-4" /></button>
                <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing or paste from WhatsApp..."
          className="flex-1 p-4 bg-transparent text-[var(--text-primary)] resize-none focus:outline-none placeholder:text-[var(--text-muted)] min-h-[300px] leading-relaxed"
          autoFocus
        />

        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
          <button onClick={handleClose} className="px-4 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white",
              "bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            )}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
