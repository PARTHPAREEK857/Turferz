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
  const { seed } = await import("./seed");

  getDb(); // opens the database and applies migrations
  await seed();
  console.log("Setup complete. Run `npm run dev` to start Turferz.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
