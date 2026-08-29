import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "./schema";

/**
 * Applies the schema in server/db/schema.ts.
 * Tracks the applied version in PRAGMA user_version. Idempotent.
 */
export function applyMigrations(db: DatabaseSync): void {
  const current = db.prepare("PRAGMA user_version").get() as { user_version: number };
  const target = 1; // bump when adding future migrations

  db.exec("BEGIN IMMEDIATE");
  try {
    if (current.user_version < 1) {
      db.exec(SCHEMA_SQL);
      db.exec(`PRAGMA user_version = ${target}`);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
