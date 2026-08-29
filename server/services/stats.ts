import { getDb, one } from "../db/client";
import { listTournaments } from "../repositories/tournaments";

export interface PlatformStats {
  turfCount: number;
  cityCount: number;
  tournamentCount: number;
  bookingCount: number;
}

/** Counts used on the landing page. */
export function getPlatformStats(): PlatformStats {
  const db = getDb();
  const turfCount =
    (one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM turfs WHERE is_active = 1")?.n ?? 0);
  const cityCount =
    (one<{ n: number }>(db, "SELECT COUNT(DISTINCT city) AS n FROM turfs WHERE is_active = 1")?.n ?? 0);
  const bookingCount =
    (one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM bookings WHERE status = 'CONFIRMED'")?.n ?? 0);
  const tournamentCount = listTournaments({}).length;
  return { turfCount, cityCount, bookingCount, tournamentCount };
}
