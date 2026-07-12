import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "./supabase";
import { parseUserAgent } from "./utils";

export type ActivityAction =
  | "login" | "logout" | "upload" | "download" | "preview"
  | "note_create" | "note_edit" | "note_delete" | "note_copy"
  | "note_duplicate" | "note_pin" | "file_rename" | "file_delete"
  | "file_favorite" | "search" | "filter" | "share_upload"
  | "clipboard_paste" | "camera_upload" | "password_change"
  | "lock" | "unlock" | "backup" | "restore";

interface LogOptions {
  action: ActivityAction;
  details?: string;
  contentType?: string;
  contentId?: string;
  sessionId?: string;
  req?: Request;
  pwaInstalled?: boolean;
}

// Fire-and-forget — we don't await this in hot paths
export function logActivity(opts: LogOptions): void {
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

  supabaseAdmin.from("activity_logs").insert({
    id,
    action: opts.action,
    details: opts.details ?? "",
    content_type: opts.contentType ?? null,
    content_id: opts.contentId ?? null,
    device_name: device,
    browser,
    os,
    ip_address: ip,
    pwa_installed: opts.pwaInstalled ?? false,
    session_id: opts.sessionId ?? null,
    created_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error("[activity]", error.message);
  });
}

export async function getActivityLogs(options: {
  filter?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { filter, search, limit = 100, offset = 0 } = options;

  let query = supabaseAdmin.from("activity_logs").select("*");

  if (filter && filter !== "all") {
    const filterMap: Record<string, string[]> = {
      uploads: ["upload", "share_upload", "camera_upload", "clipboard_paste"],
      downloads: ["download"],
      notes: ["note_create", "note_edit", "note_delete", "note_copy", "note_duplicate", "note_pin"],
      searches: ["search"],
      auth: ["login", "logout", "lock", "unlock", "password_change"],
      deleted: ["note_delete", "file_delete"],
    };
    const actions = filterMap[filter];
    if (actions) query = query.in("action", actions);
  }

  if (search) {
    query = query.or(`details.ilike.%${search}%,action.ilike.%${search}%`);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return [];
  return data ?? [];
}

export async function getSessions(limit = 50) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .order("login_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}
