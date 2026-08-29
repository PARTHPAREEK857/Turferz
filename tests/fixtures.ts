import bcrypt from "bcryptjs";
import { getDb } from "../server/db/client";

/** Deterministic ids so tests can reference fixtures directly. */
export const IDS = {
  sportCricket: "sport-cricket",
  sportFootball: "sport-football",
  turf: "turf-main",
  turf2: "turf-alt",
  alice: "user-alice",
  bob: "user-bob",
};

export const PASSWORD = "password123";

export interface FixtureTournament {
  id: string;
  slug: string;
}

export function seedBaseData(): void {
  const db = getDb();
  const now = new Date().toISOString();

  // hash once for speed (bcrypt is deliberately slow; rounds=4 for tests)
  const hash = bcrypt.hashSync(PASSWORD, 4);

  for (const [id, name, email] of [
    [IDS.alice, "Alice Test", "alice@test.dev"],
    [IDS.bob, "Bob Test", "bob@test.dev"],
  ] as const) {
    db.prepare(
      "INSERT INTO users (id, name, email, phone, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'USER', ?, ?)",
    ).run(id, name, email, "9876543210", hash, now, now);
  }

  db.prepare(
    "INSERT INTO sports (id, slug, name, tagline, icon, sort_order, is_active, created_at) VALUES (?, 'cricket', 'Cricket', null, 'cricket', 1, 1, ?)",
  ).run(IDS.sportCricket, now);
  db.prepare(
    "INSERT INTO sports (id, slug, name, tagline, icon, sort_order, is_active, created_at) VALUES (?, 'football', 'Football', null, 'football', 2, 1, ?)",
  ).run(IDS.sportFootball, now);

  // main test turf: 00:00–24:00 (max flexibility), ₹1000/hr
  db.prepare(
    `INSERT INTO turfs (id, slug, name, city, area, address, description, surface, price_per_hour,
      open_hour, close_hour, amenities, is_active, created_at, updated_at)
     VALUES (?, 'test-turf', 'Test Turf', 'Test City', 'Test Area', '1 Test Street', 'desc', 'Astro turf',
      1000, 0, 24, '[]', 1, ?, ?)`,
  ).run(IDS.turf, now, now);
  db.prepare("INSERT INTO turf_sports (turf_id, sport_id) VALUES (?, ?)").run(IDS.turf, IDS.sportCricket);
  db.prepare("INSERT INTO turf_sports (turf_id, sport_id) VALUES (?, ?)").run(IDS.turf, IDS.sportFootball);
  db.prepare(
    "INSERT INTO turf_images (id, turf_id, url, alt, sort_order) VALUES ('img-1', ?, '/images/turfs/box-park-cricket.jpg', 'Test Turf', 0)",
  ).run(IDS.turf);

  // second turf: 8:00–22:00, ₹500/hr (boundary testing)
  db.prepare(
    `INSERT INTO turfs (id, slug, name, city, area, address, description, surface, price_per_hour,
      open_hour, close_hour, amenities, is_active, created_at, updated_at)
     VALUES (?, 'test-turf-alt', 'Alt Turf', 'Test City', 'Alt Area', '2 Test Street', 'desc', 'Astro turf',
      500, 8, 22, '[]', 1, ?, ?)`,
  ).run(IDS.turf2, now, now);
  db.prepare("INSERT INTO turf_sports (turf_id, sport_id) VALUES (?, ?)").run(IDS.turf2, IDS.sportFootball);

  insertTournament({ slug: "test-cup", daysAhead: 30 });
}

/** Insert a PUBLISHED tournament starting now + daysAhead days. */
export function insertTournament(opts: {
  slug: string;
  daysAhead?: number;
  maxTeams?: number;
  deadlineInPast?: boolean;
}): FixtureTournament {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `t-${opts.slug}`;
  const startEpoch = Date.now() + (opts.daysAhead ?? 1) * 24 * 60 * 60 * 1000;
  const startsAt = new Date(startEpoch).toISOString();
  const endsAt = new Date(startEpoch + 5 * 60 * 60 * 1000).toISOString();
  const deadline = new Date(
    opts.deadlineInPast ? Date.now() - 60 * 60 * 1000 : startEpoch + 60 * 60 * 1000,
  ).toISOString();
  db.prepare(
    `INSERT INTO tournaments (id, slug, title, description, sport_id, turf_id, starts_at, ends_at,
      registration_deadline, format, entry_fee, prize_details, max_teams, min_players, max_players,
      banner_url, status, created_at, updated_at)
     VALUES (?, ?, ?, 'desc', ?, ?, ?, ?, ?, 'knockout', 500, 'prize', ?, 6, 12, null, 'PUBLISHED', ?, ?)`,
  ).run(
    id,
    opts.slug,
    `Tournament ${opts.slug}`,
    IDS.sportCricket,
    IDS.turf,
    startsAt,
    endsAt,
    deadline,
    opts.maxTeams ?? 10,
    now,
    now,
  );
  return { id, slug: opts.slug };
}

export function sessionUser(id: string, name: string) {
  return { id, name, email: `${name.toLowerCase()}@test.dev`, phone: "9876543210", role: "USER" as const };
}
