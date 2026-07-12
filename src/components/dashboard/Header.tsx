"use client";

import {
  Shield,
  Search,
  Lock,
  Sun,
  Moon,
  X,
  Settings,
} from "lucide-react";
import { useVaultStore } from "@/store/vault-store";
import { useEffect, useRef, useState } from "react";

interface HeaderProps {
  onLock: () => void;
  onSearch: (q: string) => void;
}

export default function Header({ onLock, onSearch }: HeaderProps) {
  const { theme, setTheme, setShowActivityCenter, setShowSettings } = useVaultStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setShowActivityCenter(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setShowActivityCenter]);

  const handleLogoClick = () => {
    logoClickCount.current++;
    clearTimeout(logoClickTimer.current ?? undefined);
    logoClickTimer.current = setTimeout(() => {
      logoClickCount.current = 0;
    }, 1000);
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      setShowActivityCenter(true);
    }
  };

  const handleSearch = (val: string) => {
    setSearchVal(val);
    onSearch(val);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    if (next === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("vault-theme", next);
  };

  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-40 bg-[var(--header-bg)]/95 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="max-w-3xl mx-auto px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 shrink-0 select-none"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[var(--text-primary)] hidden sm:block">My Vault</span>
          </button>

          <div className="flex-1 min-w-0">
            {searchOpen ? (
              <div className="flex items-center gap-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    ref={searchRef}
                    value={searchVal}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search everything..."
                    className="w-full pl-9 pr-3 py-2 rounded-full bg-[var(--compose-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => { setSearchOpen(false); handleSearch(""); }}
                  className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--compose-input)] border border-[var(--border)] text-sm text-[var(--text-muted)] hover:border-[var(--accent)]/50 transition-colors"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span className="truncate">Search everything...</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={onLock}
              className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              title="Lock vault"
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
