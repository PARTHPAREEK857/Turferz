import { route } from "@/server/http";
import { getTurfDetail } from "@/server/services/turfs";

export const dynamic = "force-dynamic";

/** GET /api/turfs/[slug] — turf detail. */
export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, ctx) => {
  const { slug } = await ctx.params;
  return Response.json({ turf: getTurfDetail(slug) });
});
