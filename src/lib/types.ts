export type ContentType = "note" | "file";
export type FileCategory = "text" | "image" | "pdf" | "excel" | "word" | "doc" | "zip" | "video" | "other";

export interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned: number;
  is_favorite: number;
  created_at: string;
  updated_at: string;
}

export interface VaultFile {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  file_size: number;
  category: FileCategory;
  is_favorite: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  content_type: string | null;
  content_id: string | null;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  pwa_installed: number;
  session_id: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  login_at: string;
  logout_at: string | null;
  duration_seconds: number | null;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  pwa_installed: number;
}

export interface AppSettings {
  password_hash: string;
  auto_lock_minutes: number;
  theme: "light" | "dark" | "system";
  setup_complete: number;
}

export type FilterTab = "all" | "text" | "images" | "docs" | "pdf" | "excel" | "favorites";

export interface VaultItem {
  id: string;
  type: ContentType;
  title: string;
  subtitle?: string;
  content?: string;
  category?: FileCategory;
  mime_type?: string;
  file_size?: number;
  is_pinned: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchResult extends VaultItem {
  highlight?: string;
  matchField?: string;
}
