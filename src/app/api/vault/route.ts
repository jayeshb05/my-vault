import { NextRequest } from "next/server";
import { requireAuth, jsonResponse } from "@/lib/api-helpers";
import { getVaultItems } from "@/lib/notes";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const filter = req.nextUrl.searchParams.get("filter") ?? "all";
  const items = await getVaultItems(filter);
  return jsonResponse({ items });
}
