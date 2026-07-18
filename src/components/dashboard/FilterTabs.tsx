"use client";

import { useVaultStore } from "@/store/vault-store";
import { cn } from "@/lib/utils";
import type { FilterTab } from "@/lib/types";
import { FileText, Image, File, FileSpreadsheet, Star, LayoutGrid } from "lucide-react";

const TABS: { id: FilterTab; label: string; icon: React.ElementType }[] = [
  { id: "all",       label: "All",       icon: LayoutGrid },
  { id: "text",      label: "Text",      icon: FileText },
  { id: "images",    label: "Images",    icon: Image },
  { id: "docs",      label: "Docs",      icon: File },
  { id: "pdf",       label: "PDF",       icon: File },
  { id: "excel",     label: "Excel",     icon: FileSpreadsheet },
  { id: "favorites", label: "Starred",   icon: Star },
];

export default function FilterTabs() {
  const { filter, setFilter, refreshItems } = useVaultStore();

  const handleFilter = (tab: FilterTab) => {
    if (tab === filter) return;
    setFilter(tab);
    // Use requestAnimationFrame for instant feel — refresh after paint
    requestAnimationFrame(() => refreshItems());
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-3 py-2.5">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = filter === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleFilter(tab.id)}
            className={cn(
              "filter-tab flex items-center gap-1.5 shrink-0 btn-press",
              active
                ? "gradient-accent text-white shadow-[var(--btn-shadow)]"
                : "bg-[var(--tab-inactive-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon
              style={{ width: 13, height: 13 }}
              className={active ? "text-white" : ""}
            />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
