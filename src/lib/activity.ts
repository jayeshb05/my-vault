import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import { parseUserAgent } from "./utils";

export type ActivityAction =
  | "login"
  | "logout"
  | "upload"
  | "download"
  | "preview"
  | "note_create"
  | "note_edit"
  | "note_delete"
  | "note_copy"
  | "note_duplicate"
  | "note_pin"
  | "file_rename"
  | "file_delete"
  | "file_favorite"
  | "search"
  | "filter"
  | "share_upload"
  | "clipboard_paste"
  | "camera_upload"
  | "password_change"
  | "lock"
  | "unlock"
  | "backup"
  | "restore";

interface LogOptions {
  action: ActivityAction;
  details?: string;
  contentType?: string;
  contentId?: string;
  sessionId?: string;
  req?: Request;
  pwaInstalled?: boolean;
}

export function logActivity(opts: LogOptions) {
  const db = getDb();
  const id = uuidv4();
  let browser: string | null = null;
  let os: string | null = null;
  let device: string | null = null;
  let ip: string | null = null;

  if (opts.req) {
    const ua = opts.req.headers.get("user-agent") ?? "";
    const parsed = parseUserAgent(ua);
    browser = parsed.browser;
    os = parsed.os;
    device = parsed.device;
    ip =
      opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      opts.req.headers.get("x-real-ip") ??
      null;
  }

  db.prepare(
    `INSERT INTO activity_logs
     (id, action, details, content_type, content_id, device_name, browser, os, ip_address, pwa_installed, session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    opts.action,
    opts.details ?? "",
    opts.contentType ?? null,
    opts.contentId ?? null,
    device,
    browser,
    os,
    ip,
    opts.pwaInstalled ? 1 : 0,
    opts.sessionId ?? null
  );

  return id;
}

export function getActivityLogs(options: {
  filter?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const { filter, search, limit = 100, offset = 0 } = options;

  let query = "SELECT * FROM activity_logs WHERE 1=1";
  const params: (string | number)[] = [];

  if (filter && filter !== "all") {
    const filterMap: Record<string, string[]> = {
      uploads: ["upload", "share_upload", "camera_upload", "clipboard_paste"],
      downloads: ["download"],
      notes: ["note_create", "note_edit", "note_delete", "note_copy", "note_duplicate", "note_pin"],
      images: ["upload"],
      pdf: ["upload", "preview"],
      excel: ["upload", "preview"],
      docs: ["upload", "preview"],
      searches: ["search"],
      auth: ["login", "logout", "lock", "unlock", "password_change"],
      deleted: ["note_delete", "file_delete"],
    };

    const actions = filterMap[filter];
    if (actions) {
      query += ` AND action IN (${actions.map(() => "?").join(",")})`;
      params.push(...actions);
    }
  }

  if (search) {
    query += " AND (details LIKE ? OR action LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

export function getActivityCount(filter?: string, search?: string): number {
  const db = getDb();
  let query = "SELECT COUNT(*) as count FROM activity_logs WHERE 1=1";
  const params: string[] = [];

  if (search) {
    query += " AND (details LIKE ? OR action LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const result = db.prepare(query).get(...params) as { count: number };
  return result.count;
}

export function getSessions(limit = 50) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sessions ORDER BY login_at DESC LIMIT ?")
    .all(limit);
}
