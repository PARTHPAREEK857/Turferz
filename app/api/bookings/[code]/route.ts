import { ApiError, route } from "@/server/http";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { getMyBooking } from "@/server/services/bookings";

export const dynamic = "force-dynamic";

/** GET /api/bookings/[code] — one of the user's own bookings. */
export const GET = route<{ params: Promise<{ code: string }> }>(async (req, ctx) => {
  const user = await getSessionUserFromRequest(req);
  if (!user) throw ApiError.unauthorized("Sign in to see your bookings");
  const { code } = await ctx.params;
  return Response.json({ booking: getMyBooking(user, code) });
});
