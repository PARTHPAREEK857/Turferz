import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { applyMigrations } from "./migrate";

/**
 * SQLite database client built on Node's built-in `node:sqlite` module —
 * no external database engine or native dependency required.
 *
 * The connection is synchronous and process-wide (cached on globalThis so
 * Next.js hot reloads reuse it). All write paths that must be atomic run
 * inside `withTransaction`, which takes an IMMEDIATE write lock; together
 * with the trg_bookings_no_overlap_* triggers this makes double bookings
 * impossible even under concurrent requests.
 */

export type DbRow = Record<string, unknown>;

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL?.trim() || "file:./data/dev.db";
  const file = raw.startsWith("file:") ? raw.slice(5) : raw;
  if (path.isAbsolute(file)) return file;
  return path.join(process.cwd(), file.replace(/^\.?\//, ""));
}

declare global {
  var __turferzDb: DatabaseSync | undefined;
}

function openDatabase(): DatabaseSync {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(dbPath);
  } catch (err) {
    throw new Error(
      `Turferz could not open its database at ${dbPath}: ${(err as Error).message}`,
    );
  }
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  applyMigrations(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__turferzDb) {
    globalThis.__turferzDb = openDatabase();
  }
  return globalThis.__turferzDb;
}

/** Test-only: use a throwaway database for this process. */
export function useTestDatabase(): void {
  globalThis.__turferzDb?.close();
  globalThis.__turferzDb = undefined;
  process.env.DATABASE_URL = "file:./data/test.db";
}

/** Test-only: delete all rows from every table, preserving schema. */
export function resetDatabase(): void {
  const db = getDb();
  const tables = [
    "tournament_registrations",
    "tournaments",
    "bookings",
    "turf_images",
    "turf_sports",
    "turfs",
    "sports",
    "users",
  ] as const;
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const table of tables) db.exec(`DELETE FROM ${table}`);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/**
 * Run `fn` inside a write transaction. Calls cannot nest; inner calls reuse
 * the outer transaction.
 */
export function withTransaction<T>(fn: () => T): T {
  const db = getDb();
  if (db.isTransaction) return fn();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* connection already rolled back */
    }
    throw err;
  }
}

// --- tiny typed query helpers -------------------------------------------

export type SQLParam = string | number | bigint | null;

export function all<T = DbRow>(db: DatabaseSync, sql: string, ...params: SQLParam[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function one<T = DbRow>(db: DatabaseSync, sql: string, ...params: SQLParam[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}
