"use client";

import { useVaultStore } from "@/store/vault-store";
import { cn } from "@/lib/utils";
import type { FilterTab } from "@/lib/types";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "text", label: "Text" },
  { id: "images", label: "Images" },
  { id: "docs", label: "Docs" },
  { id: "pdf", label: "PDF" },
  { id: "excel", label: "Excel" },
  { id: "favorites", label: "Favorites" },
];

export default function FilterTabs() {
  const { filter, setFilter, refreshItems } = useVaultStore();

  const handleFilter = (tab: FilterTab) => {
    setFilter(tab);
    setTimeout(() => refreshItems(), 0);
  };

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide px-4 py-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleFilter(tab.id)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
            filter === tab.id
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
