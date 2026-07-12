"use client";

import { useState, useRef } from "react";
import { Plus, Send, X, Paperclip } from "lucide-react";
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
    if (inputRef.current) {
      inputRef.current.style.height = "42px";
    }
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
        setError("Failed to send. Please unlock and try again.");
      }
    } catch {
      setError("Failed to send. Please try again.");
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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--compose-bg)] border-t border-[var(--border)] safe-bottom">
      {error && (
        <p className="text-center text-xs text-red-500 py-1 px-3">{error}</p>
      )}

      {attachments.length > 0 && (
        <div className="flex gap-2 px-3 pt-2 overflow-x-auto scrollbar-hide max-w-3xl mx-auto">
          {attachments.map((att) => (
            <div key={att.id} className="relative shrink-0">
              {att.preview ? (
                <img src={att.preview} alt="" className="w-16 h-16 object-cover rounded-lg" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-[var(--bg-hover)] flex flex-col items-center justify-center p-1">
                  <Paperclip className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-[9px] text-[var(--text-muted)] truncate w-full text-center mt-1">
                    {att.file.name.split(".").pop()}
                  </span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2 max-w-3xl mx-auto">
        {/* Input bar with + inside on the left */}
        <div className="flex-1 flex items-end rounded-3xl bg-[var(--compose-input)] min-h-[42px]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="pl-3 pr-1 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 self-end"
            title="Attach file"
          >
            <Plus className="w-5 h-5" />
          </button>

          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Type or paste anything..."
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent py-2.5 pr-3 text-sm",
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

        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !canSend}
          className={cn(
            "p-2.5 rounded-full shrink-0 mb-0.5 transition-all",
            canSend
              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              : "text-[var(--text-muted)] opacity-50",
            sending && "opacity-70"
          )}
          title="Send"
        >
          <Send className="w-5 h-5" />
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
