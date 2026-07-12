import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FileCategory } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "Last 7 Days";
  if (diffDays <= 30) return "Last 30 Days";
  return "Older";
}

export function detectCategory(mimeType: string, fileName: string): FileCategory {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  )
    return "excel";
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    ["doc", "docx", "odt", "rtf"].includes(ext)
  )
    return "word";
  if (mimeType.startsWith("text/") || ["txt", "md", "markdown"].includes(ext)) return "text";
  if (mimeType.includes("zip") || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "zip";
  if (mimeType.startsWith("video/")) return "video";
  if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint") ||
    ["ppt", "pptx"].includes(ext)
  )
    return "doc";
  return "other";
}

export function getCategoryLabel(category: FileCategory): string {
  const labels: Record<FileCategory, string> = {
    text: "Text",
    image: "Image",
    pdf: "PDF",
    excel: "Excel",
    word: "Word",
    doc: "Document",
    zip: "Archive",
    video: "Video",
    other: "File",
  };
  return labels[category] ?? "File";
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

export function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  if (ua.includes("Android")) {
    os = "Android";
    device = "Android";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
    device = ua.includes("iPad") ? "iPad" : "iPhone";
  } else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os, device };
}

export function generateTitle(content: string, maxLen = 60): string {
  const cleaned = content.replace(/<[^>]*>/g, "").trim();
  if (!cleaned) return "Untitled Note";
  const firstLine = cleaned.split("\n")[0];
  return firstLine.length > maxLen ? firstLine.slice(0, maxLen) + "…" : firstLine;
}
