import { needsSetup } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  const [setupRequired, session] = await Promise.all([
    needsSetup(),
    getSession(),
  ]);
  return jsonResponse({
    setupRequired,
    authenticated: !!session?.authenticated,
  });
}
