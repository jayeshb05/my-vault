"use client";

import { useState, useRef } from "react";
import { Paperclip, Plus, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Attachment {
  id: string;
  file: File;
  preview?: string;
}

interface BottomComposeBarProps {
  onSend: (text: string, attachments: Attachment[]) => Promise<boolean>;
}

export default function BottomComposeBar({ onSend }: BottomComposeBarProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    const newAttachments: Attachment[] = Array.from(files).map((file) => {
      const att: Attachment = { id: `${Date.now()}-${Math.random()}`, file };
      if (file.type.startsWith("image/")) {
        att.preview = URL.createObjectURL(file);
      }
      return att;
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
    setError("");
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const resetInput = () => {
    setText("");
    setError("");
    attachments.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    setAttachments([]);
    if (inputRef.current) inputRef.current.style.height = "42px";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const handleSend = async () => {
    if (sending) return;
    if (!text.trim() && attachments.length === 0) return;
    setSending(true);
    setError("");
    try {
      const success = await onSend(text.trim(), attachments);
      if (success) {
        resetInput();
      } else {
        setError("Failed. Please unlock and try again.");
      }
    } catch {
      setError("Failed. Please try again.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = text.trim().length > 0 || attachments.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 compose-bar safe-bottom">
      {/* Error */}
      {error && (
        <p className="text-center text-xs text-red-500 py-1.5 px-3 bg-red-500/8">{error}</p>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-3 pt-2.5 overflow-x-auto scrollbar-hide max-w-3xl mx-auto">
          {attachments.map((att) => (
            <div key={att.id} className="relative shrink-0 animate-scale-in">
              {att.preview ? (
                <img
                  src={att.preview}
                  alt=""
                  className="w-16 h-16 object-cover rounded-xl border border-[var(--border)]"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] flex flex-col items-center justify-center p-1.5 gap-1">
                  <Paperclip style={{ width: 14, height: 14 }} className="text-[var(--text-muted)]" />
                  <span className="text-[9px] text-[var(--text-muted)] truncate w-full text-center font-medium">
                    {att.file.name.split(".").pop()?.toUpperCase()}
                  </span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm btn-press"
              >
                <X style={{ width: 11, height: 11 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2.5 max-w-3xl mx-auto">
        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-10 h-10 rounded-full bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all shrink-0 mb-0.5 btn-press"
          title="Attach file"
        >
          <Plus style={{ width: 18, height: 18 }} />
        </button>

        {/* Text input */}
        <div className="flex-1 rounded-[20px] border border-[var(--border)] bg-[var(--compose-input)] shadow-sm focus-within:border-[var(--accent)]/50 focus-within:shadow-[0_0_0_3px_var(--input-focus-ring)] transition-all duration-200">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Type or paste anything…"
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent px-4 py-2.5 text-sm",
              "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
              "focus:outline-none max-h-32 overflow-y-auto leading-relaxed"
            )}
            style={{ minHeight: "42px" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "42px";
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
            }}
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !canSend}
          className={cn(
            "w-10 h-10 rounded-full shrink-0 mb-0.5 flex items-center justify-center transition-all duration-200",
            canSend
              ? "gradient-accent text-white fab"
              : "bg-[var(--bg-input)] text-[var(--text-muted)] opacity-50 border border-[var(--border)]",
            sending && "opacity-70"
          )}
          title="Send"
        >
          <Send style={{ width: sending ? 15 : 17, height: sending ? 15 : 17 }}
            className={sending ? "animate-pulse" : ""} />
        </button>

        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
