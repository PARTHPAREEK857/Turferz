import { ApiError, route } from "@/server/http";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { cancelMyBooking } from "@/server/services/bookings";

export const dynamic = "force-dynamic";

/** POST /api/bookings/[code]/cancel — cancel a future booking. */
export const POST = route<{ params: Promise<{ code: string }> }>(async (req, ctx) => {
  const user = await getSessionUserFromRequest(req);
  if (!user) throw ApiError.unauthorized("Sign in to manage your bookings");
  const { code } = await ctx.params;
  return Response.json({ booking: cancelMyBooking(user, code) });
});
