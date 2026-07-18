"use client";

import { useVaultStore } from "@/store/vault-store";
import { cn } from "@/lib/utils";
import type { FilterTab, VaultItem } from "@/lib/types";
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

/** Client-side filter — runs instantly without waiting for the API */
export function clientFilter(items: VaultItem[], tab: FilterTab): VaultItem[] {
  if (tab === "all") return items;
  if (tab === "favorites") return items.filter((i) => i.is_favorite);
  if (tab === "text") return items.filter((i) => i.type === "note");
  if (tab === "images") return items.filter((i) => i.category === "image");
  if (tab === "pdf") return items.filter((i) => i.category === "pdf");
  if (tab === "excel") return items.filter((i) => i.category === "excel");
  if (tab === "docs") return items.filter((i) =>
    i.type === "note" ||
    ["word", "doc", "text", "other"].includes(i.category ?? "")
  );
  return items;
}

export default function FilterTabs() {
  const { filter, setFilter, refreshItems } = useVaultStore();

  const handleFilter = (tab: FilterTab) => {
    if (tab === filter) return;
    // Set filter immediately — client-side filtering kicks in at once
    setFilter(tab);
    // Kick off background API refresh for any server-side filtered data
    refreshItems();
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
