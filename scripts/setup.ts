/**
 * One-command project setup: create/migrate the SQLite database and seed
 * demo data. Usage: npm run setup [--reset]
 *   --reset  delete the database file first (fresh start)
 */

import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--reset")) {
    for (const file of ["data/dev.db", "data/dev.db-wal", "data/dev.db-shm"]) {
      const p = path.join(process.cwd(), file);
      if (fs.existsSync(p)) fs.rmSync(p);
    }
    console.log("Removed existing database.");
  }

  const { getDb } = await import("../server/db/client");
  const { seedDemoData } = await import("../server/db/seed-demo");

  getDb();
  seedDemoData({ reset: true });
  console.log("Seeded Turferz database:");
  console.log("  • 2 sports, 10 turfs, 4 tournaments");
  console.log("  • demo login → demo@turferz.app / demo1234");
  console.log("Setup complete. Run `npm run dev` to start Turferz.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
