"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginScreen from "@/components/LoginScreen";
import { Shield, CheckCircle, Loader2, FileText, File } from "lucide-react";

interface ShareMeta {
  title: string | null;
  text: string | null;
  url: string | null;
  fileCount: number;
  fileNames: string[];
}

// Redirect delay after "Saved!" — short enough to feel instant
const REDIRECT_DELAY = 800;

export default function SharePage() {
  const router = useRouter();

  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("vault-auth-session") === "1";
  });
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState("");
  const [shareMeta, setShareMeta] = useState<ShareMeta | null>(null);

  const processTextShare = async (meta: ShareMeta) => {
    const content = [meta.title, meta.text, meta.url].filter(Boolean).join("\n");
    if (!content.trim()) {
      setDone(true);
      setTimeout(() => router.push("/"), REDIRECT_DELAY);
      return;
    }

    setUploading(true);
    try {
      sessionStorage.removeItem("share_data");
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setSavedCount(1);
      setDone(true);
      setTimeout(() => router.push("/"), REDIRECT_DELAY);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.has("done")) {
      const total = parseInt(params.get("total") || "1");
      const filesSaved = parseInt(params.get("files_saved") || "0");
      setSavedCount(total);
      setShareMeta({ title: null, text: null, url: null, fileCount: filesSaved, fileNames: [] });
      setAuthenticated(sessionStorage.getItem("vault-auth-session") === "1");
      if (sessionStorage.getItem("vault-auth-session") === "1") {
        setDone(true);
        setTimeout(() => router.push("/"), REDIRECT_DELAY);
      }
      return;
    }

    if (params.has("error")) {
      setError("Something went wrong saving the shared content.");
      return;
    }

    const meta: ShareMeta = {
      title: params.get("title"),
      text: params.get("text"),
      url: params.get("url"),
      fileCount: 0,
      fileNames: [],
    };

    const hasText = meta.title || meta.text || meta.url;
    if (hasText) {
      sessionStorage.setItem("share_data", JSON.stringify(meta));
    }
    setShareMeta(meta);

    if (sessionStorage.getItem("vault-auth-session") === "1") {
      setAuthenticated(true);
      processTextShare(meta);
    }

    const handleBeforeUnload = () => {
      sessionStorage.removeItem("vault-auth-session");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [router]);

  const handleAuth = () => {
    sessionStorage.setItem("vault-auth-session", "1");
    setAuthenticated(true);
    const stored = sessionStorage.getItem("share_data");
    const meta = stored ? JSON.parse(stored) : shareMeta;
    processTextShare(meta || { title: null, text: null, url: null, fileCount: 0, fileNames: [] });
  };

  if (!authenticated) {
    return <LoginScreen onSuccess={handleAuth} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
      <div className="w-full max-w-sm text-center">
        {/* App branding */}
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Shield className="w-8 h-8 text-white" />
        </div>

        {uploading && (
          <>
            <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Saving to Lily…</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">Just a moment</p>
          </>
        )}

        {done && (
          <>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Saved to Lily!</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              {savedCount > 1 ? `${savedCount} items saved` : "Item saved"} · Redirecting…
            </p>

            {shareMeta && (
              <div className="mt-4 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-left">
                {shareMeta.fileCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <File className="w-4 h-4 shrink-0 text-[var(--accent)]" />
                    <span className="truncate">
                      {shareMeta.fileCount} file{shareMeta.fileCount > 1 ? "s" : ""} received
                    </span>
                  </div>
                )}
                {(shareMeta.title || shareMeta.text) && (
                  <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)] mt-1">
                    <FileText className="w-4 h-4 shrink-0 text-[var(--accent)] mt-0.5" />
                    <span className="truncate line-clamp-2">
                      {shareMeta.title || shareMeta.text}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!uploading && !done && !error && (
          <>
            <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Processing…</h2>
          </>
        )}

        {error && (
          <>
            <Shield className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{error}</h2>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium"
            >
              Go to Vault
            </button>
          </>
        )}
      </div>
    </div>
  );
}
