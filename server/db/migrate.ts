import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Applies the schema in server/db/schema.sql.
 * Tracks applied version in PRAGMA user_version. Idempotent.
 */
export function applyMigrations(db: DatabaseSync): void {
  const schemaPath = path.join(process.cwd(), "server", "db", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  const current = db.prepare("PRAGMA user_version").get() as { user_version: number };
  const target = 1; // bump when adding future migrations

  db.exec("BEGIN IMMEDIATE");
  try {
    if (current.user_version < 1) {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${target}`);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
