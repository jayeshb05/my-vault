import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth, jsonResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("auto_lock_minutes, theme, setup_complete")
    .eq("id", 1)
    .single();

  return jsonResponse({ settings });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { auto_lock_minutes, theme } = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (auto_lock_minutes !== undefined) updates.auto_lock_minutes = auto_lock_minutes;
  if (theme !== undefined) updates.theme = theme;

  const { data: settings } = await supabaseAdmin
    .from("settings")
    .update(updates)
    .eq("id", 1)
    .select("auto_lock_minutes, theme, setup_complete")
    .single();

  return jsonResponse({ settings });
}
