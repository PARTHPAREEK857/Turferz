import { route } from "@/server/http";
import { getSessionUserFromRequest } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

/** GET /api/auth/me — current session user (null when signed out). */
export const GET = route(async (req) => {
  const user = await getSessionUserFromRequest(req);
  return Response.json({ user });
});
