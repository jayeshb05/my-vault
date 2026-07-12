import { create } from "zustand";
import type { VaultItem, FilterTab } from "@/lib/types";

// Read theme from localStorage at module load time (SSR-safe)
function getInitialTheme(): "light" | "dark" | "system" {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("vault-theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark"; // default to dark
}

interface VaultStore {
  items: VaultItem[];
  filter: FilterTab;
  searchQuery: string;
  searchResults: VaultItem[];
  isSearching: boolean;
  isLoading: boolean;
  theme: "light" | "dark" | "system";
  selectedItem: VaultItem | null;
  showNoteEditor: boolean;
  showFilePreview: boolean;
  showActivityCenter: boolean;
  showSettings: boolean;
  editingNoteId: string | null;

  setItems: (items: VaultItem[]) => void;
  setFilter: (filter: FilterTab) => void;
  setSearchQuery: (q: string) => void;
  setSearchResults: (results: VaultItem[]) => void;
  setIsSearching: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setSelectedItem: (item: VaultItem | null) => void;
  setShowNoteEditor: (v: boolean) => void;
  setShowFilePreview: (v: boolean) => void;
  setShowActivityCenter: (v: boolean) => void;
  setShowSettings: (v: boolean) => void;
  setEditingNoteId: (id: string | null) => void;
  refreshItems: () => Promise<void>;

  // Optimistic updates — instant UI, sync in background
  optimisticAdd: (item: VaultItem) => void;
  optimisticRemove: (ids: string[]) => void;
  optimisticUpdate: (id: string, patch: Partial<VaultItem>) => void;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  items: [],
  filter: "all",
  searchQuery: "",
  searchResults: [],
  isSearching: false,
  isLoading: true,
  theme: getInitialTheme(),
  selectedItem: null,
  showNoteEditor: false,
  showFilePreview: false,
  showActivityCenter: false,
  showSettings: false,
  editingNoteId: null,

  setItems: (items) => set({ items }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setTheme: (theme) => set({ theme }),
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setShowNoteEditor: (showNoteEditor) => set({ showNoteEditor }),
  setShowFilePreview: (showFilePreview) => set({ showFilePreview }),
  setShowActivityCenter: (showActivityCenter) => set({ showActivityCenter }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setEditingNoteId: (editingNoteId) => set({ editingNoteId }),

  // Add item to top of list instantly
  optimisticAdd: (item) => {
    const { items } = get();
    set({ items: [item, ...items] });
  },

  // Remove items instantly by id
  optimisticRemove: (ids) => {
    const idSet = new Set(ids);
    const { items, searchResults } = get();
    set({
      items: items.filter((i) => !idSet.has(i.id)),
      searchResults: searchResults.filter((i) => !idSet.has(i.id)),
    });
  },

  // Patch an item in place instantly
  optimisticUpdate: (id, patch) => {
    const { items } = get();
    set({ items: items.map((i) => i.id === id ? { ...i, ...patch } : i) });
  },

  refreshItems: async () => {
    const { filter, items } = get();
    if (items.length === 0) set({ isLoading: true });
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`/api/vault?filter=${filter}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        set({ items: data.items ?? [], isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
