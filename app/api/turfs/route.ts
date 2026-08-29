import { readQuery, route } from "@/server/http";
import { turfsQuerySchema } from "@/lib/validation";
import { discoverTurfs, getCities } from "@/server/services/turfs";

export const dynamic = "force-dynamic";

/** GET /api/turfs?sport=&city=&q=&maxPrice=&sort= — discover turfs. */
export const GET = route(async (req) => {
  const { sport, city, q, maxPrice, sort } = readQuery(req, turfsQuerySchema);
  const turfs = discoverTurfs({ sportSlug: sport, city, q, maxPrice, sort });
  const shouldIncludeCities = new URL(req.url).searchParams.get("cities") === "1";
  return Response.json({
    turfs,
    count: turfs.length,
    ...(shouldIncludeCities ? { cities: getCities() } : {}),
  });
});
