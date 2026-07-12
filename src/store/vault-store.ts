import { create } from "zustand";
import type { VaultItem, FilterTab } from "@/lib/types";

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
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  items: [],
  filter: "all",
  searchQuery: "",
  searchResults: [],
  isSearching: false,
  isLoading: true,
  theme: "system",
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
