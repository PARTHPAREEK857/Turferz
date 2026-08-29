import { route } from "@/server/http";
import { clearedSessionCookie } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout — clear the session. */
export const POST = route(async () => {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearedSessionCookie() } });
});
