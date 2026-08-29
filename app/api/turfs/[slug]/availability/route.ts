import { readQuery, route } from "@/server/http";
import { availabilityQuerySchema } from "@/lib/validation";
import { getAvailability } from "@/server/services/availability";

export const dynamic = "force-dynamic";

/** GET /api/turfs/[slug]/availability?date=YYYY-MM-DD — hourly slot statuses. */
export const GET = route<{ params: Promise<{ slug: string }> }>(async (req, ctx) => {
  const { slug } = await ctx.params;
  const { date } = readQuery(req, availabilityQuerySchema);
  const availability = getAvailability(slug, date);
  return Response.json({ availability });
});
