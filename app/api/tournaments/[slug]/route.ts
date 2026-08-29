import { route } from "@/server/http";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { getTournamentDetail } from "@/server/services/tournaments";

export const dynamic = "force-dynamic";

/** GET /api/tournaments/[slug] — details + the caller's registration. */
export const GET = route<{ params: Promise<{ slug: string }> }>(async (req, ctx) => {
  const { slug } = await ctx.params;
  const user = await getSessionUserFromRequest(req);
  return Response.json({ tournament: getTournamentDetail(slug, user) });
});
