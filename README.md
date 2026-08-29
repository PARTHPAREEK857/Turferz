# TURFERZ ⚡

**Book sports turfs by the hour. Own the weekend with recreational tournaments.**

Turferz is a sports platform for discovering and booking artificial-turf venues (cricket & football at launch), plus first-class weekend tournaments organised for recreational teams.

This repository contains the complete product: frontend, backend API, database, authentication, booking engine with double-booking protection, tournament system, and an automated test suite.

---

## Quick start

```bash
npm install     # install dependencies
npm run setup   # create + migrate + seed the SQLite database
npm run dev     # start the dev server on http://localhost:3000
```

**Demo account** (created by the seed): `demo@turferz.app` / `demo1234` — comes with an upcoming booking, a past booking, and a registered tournament team.

> Requires Node 22+ (uses the built-in `node:sqlite` module; npm scripts pass the required flag automatically). On Node 24+ no experimental flag is needed.

## What's inside

| Capability | Status |
| --- | --- |
| Turf discovery (sport / city / search / price sort) | ✅ |
| Turf detail pages (gallery, amenities, pricing, timings) | ✅ |
| Live hourly availability (venue timezone aware, IST) | ✅ |
| Booking with 1–2 h duration, instant confirmation + booking code | ✅ |
| **Double-booking prevention** (transactional check + database trigger) | ✅ |
| Booking history, upcoming/past split, cancellation | ✅ |
| Tournaments: listings, detail, capacity meter, deadlines | ✅ |
| Team registration (squad-size rules, unique team names, one team per user) | ✅ |
| Auth: email/password, JWT session cookies (httpOnly), bcrypt hashes | ✅ |
| Validation with shared Zod schemas (same rules client & server) | ✅ |
| Responsive UI (mobile-first), loading/empty/error/success states | ✅ |
| Automated tests (53 across time, availability, booking, tournaments, API) | ✅ |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm start` | Production build / serve |
| `npm run setup` | Create/migrate/seed the database (`--reset` wipes it first) |
| `npm test` | Run the vitest suite |
| `npm run lint` | ESLint (Next.js + TypeScript rules) |

## Architecture

```
app/                    UI pages (React Server Components) + REST API route handlers
  api/…                 Thin HTTP handlers → services
components/             UI kit + feature components (client-side interactivity)
lib/                    Shared code used by both client and server
  validation.ts         Zod schemas (single source of truth for rules)
  time.ts               Venue-timezone (IST) date/time helpers
  api-client.ts         Typed fetch wrapper for the frontend
server/
  db/schema.sql         SQLite schema: constraints, indexes, overlap-prevention triggers
  db/client.ts          Connection singleton, transactions, migrations
  repositories/         Data access (users, turfs, bookings, tournaments)
  services/             Business logic (availability, bookings, tournaments, auth, stats)
  auth/                 Password hashing (bcryptjs) + JWT sessions (jose)
scripts/                setup + seed (demo data computed relative to upcoming weekends)
tests/                  Vitest suites incl. end-to-end API tests
data/                   SQLite database files (git-ignored)
```

**Key design decisions**

- **One Next.js app** serves UI + API — a single deploy, no CORS, server components fetch through services directly (no self-HTTP).
- **SQLite via Node's built-in `node:sqlite`** — zero external database engine; WAL mode + `BEGIN IMMEDIATE` transactions for safe concurrent writes. The schema is standard SQL and portable to PostgreSQL later.
- **Double bookings are impossible by construction**: the service checks conflicts inside a write transaction (friendly error), and a `BEFORE INSERT` trigger rejects any overlapping `CONFIRMED` booking at the database level (hard guarantee).
- **Venue timezone correctness**: booking dates/slots are evaluated in Asia/Kolkata regardless of server timezone.
- **Sports are data**, not code — adding pickleball or padel is a row in `sports` + a turf link; no schema change.

## API overview

| Method & path | Purpose |
| --- | --- |
| `POST /api/auth/register` · `login` · `logout` · `GET /api/auth/me` | Account + session |
| `GET /api/sports` | Active sports |
| `GET /api/turfs?sport=&city=&q=&maxPrice=&sort=` | Discover turfs |
| `GET /api/turfs/[slug]` | Turf detail |
| `GET /api/turfs/[slug]/availability?date=YYYY-MM-DD` | Hourly slot statuses |
| `POST /api/bookings` | Create booking (auth) |
| `GET /api/bookings` · `GET /api/bookings/[code]` | Booking history |
| `POST /api/bookings/[code]/cancel` | Cancel a future booking |
| `GET /api/tournaments?sport=` | Upcoming tournaments |
| `GET /api/tournaments/[slug]` | Detail + caller's registration |
| `POST /api/tournaments/[slug]/register` | Register a team (auth) |
| `GET /api/me/tournament-registrations` | My teams |
| `GET /api/health` | Health + DB check |

Errors use a consistent envelope: `{ "error": { "code", "message", "fieldErrors?" } }`.

## Testing

`npm test` runs 53 tests against a throwaway database:

- **time** — IST conversion, calendar validation, formatting
- **availability** — slot generation, booked/past marking, window rules
- **booking** — creation, conflicts (same/partial overlap), opening hours, alignment, lead time, cancellation semantics, DB trigger
- **tournament** — registration, capacity, deadlines, duplicate users/team names, squad bounds
- **api** — end-to-end HTTP flows through the real route handlers (auth cookies, validation shapes, 401/409 handling)

## Roadmap (foundations already in place)

Payments · reviews & ratings · turf-owner accounts and dashboards · admin console · tournament fixtures, standings & live scoring · teams & player profiles · notifications · location-based search · offers/memberships.

The schema (`role`, `status`, join tables, nullable `sport_id` on bookings) is intentionally shaped so none of these require re-architecting.
