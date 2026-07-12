import { needsSetup } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  const session = await getSession();
  return jsonResponse({
    setupRequired: needsSetup(),
    authenticated: !!session?.authenticated,
  });
}
