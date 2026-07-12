import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { getVaultItems } from "@/lib/notes";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const filter = req.nextUrl.searchParams.get("filter") ?? "all";
  const items = getVaultItems(filter);
  return jsonResponse({ items });
}
