import { ApiError, route } from "@/server/http";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { listMyRegistrations } from "@/server/services/tournaments";

export const dynamic = "force-dynamic";

/** GET /api/me/tournament-registrations — the user's team registrations. */
export const GET = route(async (req) => {
  const user = await getSessionUserFromRequest(req);
  if (!user) throw ApiError.unauthorized("Sign in to see your registrations");
  const registrations = listMyRegistrations(user);
  return Response.json({ registrations });
});
