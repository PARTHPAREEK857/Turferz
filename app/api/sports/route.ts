import { getSportList } from "@/server/services/tournaments";
import { route } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/sports — active sports (cricket, football, ...). */
export const GET = route(async () => {
  const sports = getSportList();
  return Response.json({ sports });
});
