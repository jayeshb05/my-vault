"use client";

import { Lock, Moon, Search, Settings, Shield, Sun, X } from "lucide-react";
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
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        openSearch();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setShowActivityCenter(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setShowActivityCenter]);

  // Close search on click/touch outside
  useEffect(() => {
    if (!searchOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        closeSearch();
      }
    };
    // Use capture so we catch it before other handlers
    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen]);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    handleSearch("");
  };

  const handleLogoClick = () => {
    logoClickCount.current++;
    clearTimeout(logoClickTimer.current ?? undefined);
    logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 1000);
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
    <header className="sticky top-0 z-40 bg-[var(--header-bg)]/90 backdrop-blur-2xl border-b border-[var(--border)]/60">
      <div className="max-w-3xl mx-auto px-3 py-2">
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)]/70 bg-[var(--bg-card)]/60 backdrop-blur-xl px-2 py-1.5 shadow-sm">

          {/* Logo */}
          {!searchOpen && (
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 shrink-0 rounded-xl px-2 py-1.5 transition-all active:scale-95 hover:bg-[var(--bg-hover)]"
            >
              <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className="font-bold text-sm text-[var(--text-primary)] hidden sm:block tracking-tight">Lily</span>
            </button>
          )}

          {/* Search */}
          <div className="flex-1 min-w-0" ref={searchContainerRef}>
            {searchOpen ? (
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent)]"
                    style={{ width: 15, height: 15 }} />
                  <input
                    ref={searchRef}
                    value={searchVal}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search everything…"
                    className="w-full pl-9 pr-3 py-2 rounded-full bg-[var(--bg-input)] border-2 border-[var(--accent)]/40 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    autoFocus
                  />
                </div>
                <button
                  onClick={closeSearch}
                  className="p-2 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] shrink-0 transition-all active:scale-90"
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>
            ) : (
              <button
                onClick={openSearch}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--bg-input)]/80 border border-[var(--border)] text-sm text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-input)] transition-all"
              >
                <Search style={{ width: 14, height: 14 }} className="shrink-0" />
                <span className="truncate text-[13px]">Search…</span>
              </button>
            )}
          </div>

          {/* Actions */}
          {!searchOpen && (
            <div className="flex items-center gap-0.5 shrink-0">
              <HeaderIconBtn onClick={() => setShowSettings(true)} label="Settings">
                <Settings style={{ width: 18, height: 18 }} />
              </HeaderIconBtn>
              <HeaderIconBtn onClick={toggleTheme} label="Toggle theme">
                {isDark
                  ? <Sun style={{ width: 18, height: 18 }} />
                  : <Moon style={{ width: 18, height: 18 }} />}
              </HeaderIconBtn>
              <HeaderIconBtn onClick={onLock} label="Lock vault">
                <Lock style={{ width: 18, height: 18 }} />
              </HeaderIconBtn>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderIconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150 active:scale-90"
    >
      {children}
    </button>
  );
}
