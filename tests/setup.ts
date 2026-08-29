/**
 * Vitest setup: point the app at a throwaway test database before any
 * module is loaded, then reset and re-seed base fixtures before each file.
 */

process.env.DATABASE_URL = "file:./data/test.db";
process.env.AUTH_SECRET = "test-session-secret";

const { resetDatabase } = await import("../server/db/client");
const { seedBaseData } = await import("./fixtures");

resetDatabase();
seedBaseData();

export {};
