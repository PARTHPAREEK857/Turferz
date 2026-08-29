import { readQuery, route } from "@/server/http";
import { tournamentsQuerySchema } from "@/lib/validation";
import { listUpcomingTournaments } from "@/server/services/tournaments";

export const dynamic = "force-dynamic";

/** GET /api/tournaments?sport= — upcoming published tournaments. */
export const GET = route(async (req) => {
  const { sport } = readQuery(req, tournamentsQuerySchema);
  const tournaments = listUpcomingTournaments(sport);
  return Response.json({ tournaments, count: tournaments.length });
});
