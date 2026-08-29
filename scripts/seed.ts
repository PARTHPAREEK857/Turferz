/**
 * Seed the local database with demo data (runs through `npm run setup`).
 * Tournament dates are computed relative to the coming weekends, so the
 * demo always shows live, bookable events.
 */

import "dotenv/config";
import { seedDemoData } from "../server/db/seed-demo";

const isDirectRun = process.argv[1]?.includes("seed");
if (isDirectRun) {
  try {
    seedDemoData({ reset: true });
    console.log("Seeded Turferz database:");
    console.log("  • 2 sports, 10 turfs, 4 tournaments");
    console.log("  • demo login → demo@turferz.app / demo1234");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
