import { ApiError, readJsonBody, route } from "@/server/http";
import { createBookingSchema } from "@/lib/validation";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { createBooking, listMyBookings } from "@/server/services/bookings";

export const dynamic = "force-dynamic";

/** GET /api/bookings — the signed-in user's bookings (history). */
export const GET = route(async (req) => {
  const user = await getSessionUserFromRequest(req);
  if (!user) throw ApiError.unauthorized("Sign in to see your bookings");
  const bookings = listMyBookings(user);
  return Response.json({ bookings });
});

/** POST /api/bookings — create a booking for an available slot. */
export const POST = route(async (req) => {
  const user = await getSessionUserFromRequest(req);
  if (!user) throw ApiError.unauthorized("Sign in to book a slot");
  const input = await readJsonBody(req, createBookingSchema);
  const booking = createBooking({ user, ...input });
  return Response.json({ booking }, { status: 201 });
});
