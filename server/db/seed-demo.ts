/**
 * Demo data seeding core — used by `npm run setup` (local) and by the
 * database client when booting on a fresh serverless instance (Vercel),
 * where the database file starts empty on every cold start.
 *
 * Synchronous (bcryptjs hashSync) so the db client can auto-seed on open.
 */

import bcrypt from "bcryptjs";
import { getDb, resetDatabase, withTransaction } from "./client";
import { insertBooking } from "../repositories/bookings";
import { insertRegistration } from "../repositories/tournaments";
import type { TournamentRecord } from "../repositories/tournaments";
import { addDays, istDateTimeToEpochMs, istToday } from "@/lib/time";

function uid(): string {
  return crypto.randomUUID();
}

function utcIso(date: string, hour: number, minute = 0): string {
  return new Date(istDateTimeToEpochMs(date, hour * 60 + minute)).toISOString();
}

/** Date of the coming weekend day at least `minDaysAhead` days out (IST). */
function nextWeekendDay(weekday: 0 | 6, minDaysAhead: number): string {
  const today = istToday();
  for (let offset = minDaysAhead; offset <= minDaysAhead + 13; offset++) {
    const date = addDays(today, offset);
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=Sun, 6=Sat
    if (dow === weekday) return date;
  }
  return addDays(today, minDaysAhead + 7);
}

function insertSport(slug: string, name: string, tagline: string, icon: string, sortOrder: number): string {
  const id = uid();
  getDb()
    .prepare(
      "INSERT INTO sports (id, slug, name, tagline, icon, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
    )
    .run(id, slug, name, tagline, icon, sortOrder, new Date().toISOString());
  return id;
}

interface SeedTurf {
  slug: string;
  name: string;
  city: string;
  area: string;
  address: string;
  description: string;
  surface: string;
  price: number;
  open: number;
  close: number;
  sports: string[];
  amenities: string[];
  images: string[];
}

function insertTurf(t: SeedTurf, sportIds: Map<string, string>): string {
  const id = uid();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO turfs (id, slug, name, city, area, address, description, surface,
        price_per_hour, open_hour, close_hour, amenities, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      id,
      t.slug,
      t.name,
      t.city,
      t.area,
      t.address,
      t.description,
      t.surface,
      t.price,
      t.open,
      t.close,
      JSON.stringify(t.amenities),
      now,
      now,
    );
  for (const sport of t.sports) {
    getDb().prepare("INSERT INTO turf_sports (turf_id, sport_id) VALUES (?, ?)").run(id, sportIds.get(sport)!);
  }
  t.images.forEach((url, index) => {
    getDb()
      .prepare("INSERT INTO turf_images (id, turf_id, url, alt, sort_order) VALUES (?, ?, ?, ?, ?)")
      .run(uid(), id, url, `${t.name} — photo ${index + 1}`, index);
  });
  return id;
}

function insertTournament(input: {
  slug: string;
  title: string;
  description: string;
  sportId: string;
  turfId: string;
  startDate: string;
  startHour: number;
  endHour: number;
  format: string;
  entryFee: number;
  prizeDetails: string;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: number;
  bannerUrl: string;
  seedTeams?: string[];
}): TournamentRecord {
  const id = uid();
  const startsAt = utcIso(input.startDate, input.startHour);
  const endsAt = utcIso(input.startDate, input.endHour);
  const deadline = new Date(
    istDateTimeToEpochMs(input.startDate, input.startHour * 60) - 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO tournaments (id, slug, title, description, sport_id, turf_id, starts_at, ends_at,
        registration_deadline, format, entry_fee, prize_details, max_teams, min_players, max_players,
        banner_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', ?, ?)`,
    )
    .run(
      id,
      input.slug,
      input.title,
      input.description,
      input.sportId,
      input.turfId,
      startsAt,
      endsAt,
      deadline,
      input.format,
      input.entryFee,
      input.prizeDetails,
      input.maxTeams,
      input.minPlayers,
      input.maxPlayers,
      input.bannerUrl,
      now,
      now,
    );
  // seed a few already-registered teams so capacity looks real
  (input.seedTeams ?? []).forEach((teamName, index) => {
    const teamUserId = uid();
    const phone = `98${String(10000000 + index * 111111).slice(0, 8)}`;
    getDb()
      .prepare(
        "INSERT INTO users (id, name, email, phone, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'USER', ?, ?)",
      )
      .run(
        teamUserId,
        `${teamName} Captain`,
        `captain-${input.slug}-${index + 1}@teams.turferz.app`,
        phone,
        "not-a-real-login-hash",
        now,
        now,
      );
    insertRegistration({
      tournamentId: id,
      userId: teamUserId,
      teamName,
      captainName: `${teamName} Captain`,
      contactPhone: phone,
      playerCount: input.minPlayers + (index % 3),
    });
  });
  return {
    id,
    slug: input.slug,
    title: input.title,
    description: input.description,
    sportId: input.sportId,
    turfId: input.turfId,
    startsAt,
    endsAt,
    registrationDeadline: deadline,
    format: input.format,
    entryFee: input.entryFee,
    prizeDetails: input.prizeDetails,
    maxTeams: input.maxTeams,
    minPlayers: input.minPlayers,
    maxPlayers: input.maxPlayers,
    bannerUrl: input.bannerUrl,
    status: "PUBLISHED",
  };
}

const COMMON_AMENITIES = ["Floodlights", "Washroom", "Changing room", "Drinking water", "Parking"];

const TURFS: SeedTurf[] = [
  {
    slug: "box-park-cricket-turf-andheri",
    name: "Box Park Cricket Turf",
    city: "Mumbai",
    area: "Andheri West",
    address: "Off Link Road, near Lokhandwala, Andheri West, Mumbai 400053",
    description:
      "Mumbai's favourite box-cricket cage. High-tensile netting on all sides, astro-turf pitch with proper bounce, and bright floodlights for late-night games. Tennis balls and bats available at the counter.",
    surface: "Astro turf box cricket (mesh cage)",
    price: 1200,
    open: 8,
    close: 24,
    sports: ["cricket"],
    amenities: [...COMMON_AMENITIES, "Equipment on rent", "Cafeteria", "CCTV", "Music system"],
    images: ["/images/turfs/box-park-cricket.jpg", "/images/turfs/cricket-night.jpg"],
  },
  {
    slug: "powai-arena-football-turf",
    name: "Powai Arena Football Turf",
    city: "Mumbai",
    area: "Powai",
    address: "Hiranandani Gardens, near Galleria mall, Powai, Mumbai 400076",
    description:
      "FIFA-quality 7-a-side astro turf tucked inside Powai's greens. True ball roll, shock-pad underlay, and dedicated spectator rails. Popular for corporate leagues and 5s nights.",
    surface: "FIFA-quality astro turf (7-a-side)",
    price: 1400,
    open: 6,
    close: 23,
    sports: ["football"],
    amenities: [...COMMON_AMENITIES, "Bibs & balls included", "Referee on request", "First aid", "CCTV"],
    images: ["/images/turfs/powai-arena-football.jpg", "/images/turfs/football-night.jpg"],
  },
  {
    slug: "malad-sports-hub",
    name: "Malad Sports Hub",
    city: "Mumbai",
    area: "Malad East",
    address: "Swami Vivekanand Road, Malad East, Mumbai 400097",
    description:
      "A dual-purpose rooftop turf that switches between box cricket and 5-a-side football. Rooftop breeze, zero gully-ball interruptions, and easy highway access.",
    surface: "Rooftop astro turf (cricket + 5-a-side football)",
    price: 1000,
    open: 7,
    close: 23,
    sports: ["cricket", "football"],
    amenities: [...COMMON_AMENITIES, "Equipment on rent", "Lift access", "CCTV"],
    images: ["/images/turfs/malad-sports-hub.jpg", "/images/turfs/cricket-night.jpg"],
  },
  {
    slug: "whitefield-cricket-box",
    name: "Whitefield Cricket Box",
    city: "Bengaluru",
    area: "Whitefield",
    address: "ITPL Main Road, behind Phoenix Marketcity, Whitefield, Bengaluru 560066",
    description:
      "Purpose-built box cricket right in Bengaluru's tech corridor. Book a lunch-hour over-session or a post-work match under the lights — 2 minutes from Phoenix Marketcity.",
    surface: "Astro turf box cricket",
    price: 900,
    open: 6,
    close: 23,
    sports: ["cricket"],
    amenities: [...COMMON_AMENITIES, "Equipment on rent", "Cafeteria", "CCTV"],
    images: ["/images/turfs/whitefield-cricket-box.jpg", "/images/turfs/box-park-cricket.jpg"],
  },
  {
    slug: "koramangala-kickzone",
    name: "Koramangala Kickzone",
    city: "Bengaluru",
    area: "Koramangala",
    address: "5th Block, Koramangala, Bengaluru 560095",
    description:
      "The home of Bengaluru 7s football. Tournament-grade turf, locker rooms, and a scoreboard that actually works. Hosts the Turferz weekend leagues.",
    surface: "Tournament-grade astro turf (7-a-side)",
    price: 1100,
    open: 6,
    close: 24,
    sports: ["football"],
    amenities: [...COMMON_AMENITIES, "Bibs & balls included", "Referee on request", "Scoreboard", "CCTV", "Cafeteria"],
    images: ["/images/turfs/koramangala-kickzone.jpg", "/images/turfs/football-night.jpg"],
  },
  {
    slug: "hsr-premier-turf",
    name: "HSR Premier Turf",
    city: "Bengaluru",
    area: "HSR Layout",
    address: "Sector 2, HSR Layout, Bengaluru 560102",
    description:
      "Two side-by-side pitches — a box-cricket cage and a 5s football turf — sharing a lounge. Ideal for friend groups that can't agree on one sport.",
    surface: "Astro turf (box cricket + 5-a-side football)",
    price: 1250,
    open: 6,
    close: 23,
    sports: ["cricket", "football"],
    amenities: [...COMMON_AMENITIES, "Equipment on rent", "Lounge", "CCTV"],
    images: ["/images/turfs/hsr-premier-turf.jpg", "/images/turfs/malad-sports-hub.jpg"],
  },
  {
    slug: "baner-bat-and-ball-turf",
    name: "Baner Bat & Ball Turf",
    city: "Pune",
    area: "Baner",
    address: "Baner Road, near Balewadi phata, Pune 411045",
    description:
      "Pune's most-booked tennis-ball cricket turf. Bowling machine slots on weekends, pitch-side seating for your friends, and legendary post-match misal.",
    surface: "Astro turf cricket (tennis & leather ball)",
    price: 850,
    open: 7,
    close: 23,
    sports: ["cricket"],
    amenities: [...COMMON_AMENITIES, "Bowling machine (weekends)", "Equipment on rent", "Cafeteria"],
    images: ["/images/turfs/baner-bat-and-ball.jpg", "/images/turfs/cricket-night.jpg"],
  },
  {
    slug: "kharadi-football-ground",
    name: "Kharadi Football Ground",
    city: "Pune",
    area: "Kharadi",
    address: "EON IT Park Road, Kharadi, Pune 411014",
    description:
      "A wide-open 7-a-side ground next to EON IT Park. No walls, no nets — just football the way it should be, with space for spectators and a proper warm-up zone.",
    surface: "Natural-style artificial grass (7-a-side)",
    price: 950,
    open: 6,
    close: 22,
    sports: ["football"],
    amenities: [...COMMON_AMENITIES, "Bibs & balls included", "Warm-up zone", "First aid"],
    images: ["/images/turfs/kharadi-football-ground.jpg", "/images/turfs/football-night.jpg"],
  },
  {
    slug: "noida-nets-cricket-arena",
    name: "Noida Nets Cricket Arena",
    city: "Noida",
    area: "Sector 62",
    address: "Block B, Sector 62, Noida 201301",
    description:
      "Four net lanes plus a full box-cricket arena. Pitch analysis mats, video-friendly floodlights, and the strongest cricket community in the NCR.",
    surface: "Astro turf cricket (nets + box arena)",
    price: 1000,
    open: 6,
    close: 24,
    sports: ["cricket"],
    amenities: [...COMMON_AMENITIES, "Practice nets", "Equipment on rent", "Video analysis", "CCTV"],
    images: ["/images/turfs/noida-nets-cricket.jpg", "/images/turfs/cricket-night.jpg"],
  },
  {
    slug: "gurugram-goals-football-turf",
    name: "Gurugram Goals Football Turf",
    city: "Gurugram",
    area: "Sector 29",
    address: "Leisure Valley Road, Sector 29, Gurugram 122001",
    description:
      "A rooftop 5-a-side pitch with skyline views and cooler evenings than the NCR average. Padded boards, professional lighting, and a café that does post-match cold coffees.",
    surface: "Rooftop astro turf (5-a-side, padded boards)",
    price: 1300,
    open: 6,
    close: 23,
    sports: ["football"],
    amenities: [...COMMON_AMENITIES, "Bibs & balls included", "Café", "CCTV", "Music system"],
    images: ["/images/turfs/gurugram-goals.jpg", "/images/turfs/football-night.jpg"],
  },
];

/** Seed demo data. With reset=true, wipes existing rows first. */
export function seedDemoData(options: { reset: boolean } = { reset: true }): void {
  if (options.reset) resetDatabase();
  const now = new Date().toISOString();

  // --- sports ---------------------------------------------------------
  const sportIds = new Map<string, string>();
  sportIds.set("cricket", insertSport("cricket", "Cricket", "Box cricket, tennis ball & leather ball", "cricket", 1));
  sportIds.set("football", insertSport("football", "Football", "5-a-side, 7-a-side & full-size turfs", "football", 2));

  // --- turfs ----------------------------------------------------------
  const turfIds = new Map<string, string>();
  for (const turf of TURFS) turfIds.set(turf.slug, insertTurf(turf, sportIds));

  // --- demo user ------------------------------------------------------
  const demoUserId = uid();
  const demoHash = bcrypt.hashSync("demo1234", 10);
  getDb()
    .prepare(
      "INSERT INTO users (id, name, email, phone, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'USER', ?, ?)",
    )
    .run(demoUserId, "Aarav Sharma", "demo@turferz.app", "9876543210", demoHash, now, now);

  // --- demo bookings (one upcoming, one past) -------------------------
  const today = istToday();
  const tomorrow = addDays(today, 1);
  const lastWeek = addDays(today, -7);

  const upcomingTurf = getDb()
    .prepare("SELECT id, price_per_hour FROM turfs WHERE slug = 'box-park-cricket-turf-andheri'")
    .get() as { id: string; price_per_hour: number };
  const pastTurf = getDb()
    .prepare("SELECT id, price_per_hour FROM turfs WHERE slug = 'koramangala-kickzone'")
    .get() as { id: string; price_per_hour: number };

  withTransaction(() => {
    insertBooking({
      code: "TZ-DEMO01",
      userId: demoUserId,
      turfId: upcomingTurf.id,
      sportId: sportIds.get("cricket")!,
      date: tomorrow,
      startMinutes: 20 * 60,
      endMinutes: 21 * 60,
      totalAmount: upcomingTurf.price_per_hour,
      notes: null,
    });
    insertBooking({
      code: "TZ-DEMO02",
      userId: demoUserId,
      turfId: pastTurf.id,
      sportId: sportIds.get("football")!,
      date: lastWeek,
      startMinutes: 19 * 60,
      endMinutes: 20 * 60,
      totalAmount: pastTurf.price_per_hour,
      notes: null,
    });
  });

  // --- tournaments (always on a coming weekend) ------------------------
  const sat1 = nextWeekendDay(6, 2);
  const sun1 = nextWeekendDay(0, 2);
  const sat2 = nextWeekendDay(6, 9);

  const cricketCup = insertTournament({
    slug: "turferz-weekend-cricket-cup",
    title: "Turferz Weekend Cricket Cup",
    description:
      "The flagship Turferz box-cricket knockout. 8 overs a side, tennis ball, umpires and scoresheets provided. Teams get a guaranteed 2 matches — group stage into knockout. Gather your society, office or college squad and settle it properly.",
    sportId: sportIds.get("cricket")!,
    turfId: turfIds.get("box-park-cricket-turf-andheri")!,
    startDate: sat1,
    startHour: 16,
    endHour: 23,
    format: "8-over box cricket · groups + knockout",
    entryFee: 1200,
    prizeDetails: "Winners: ₹8,000 + free turf hours · Runners-up: ₹4,000 · Best batter & bowler awards",
    maxTeams: 12,
    minPlayers: 6,
    maxPlayers: 11,
    bannerUrl: "/images/tournaments/cricket-cup.jpg",
    seedTeams: ["Andheri Avengers", "Link Road Legends", "Marine Drive Masters"],
  });

  insertTournament({
    slug: "turferz-7s-football-night",
    title: "Turferz 7s Football Night",
    description:
      "Seven-a-side under the Friday-night lights at Koramangala Kickzone. Referees, bibs and match balls included; 20-minute halves, knockout semis and final. Free entry for the winning team to the next Turferz league season.",
    sportId: sportIds.get("football")!,
    turfId: turfIds.get("koramangala-kickzone")!,
    startDate: sat1,
    startHour: 19,
    endHour: 23,
    format: "7-a-side · 2 groups + knockout",
    entryFee: 1800,
    prizeDetails: "Winners: ₹12,000 · Runners-up: ₹6,000 · Golden Boot & Golden Glove",
    maxTeams: 16,
    minPlayers: 7,
    maxPlayers: 12,
    bannerUrl: "/images/tournaments/football-7s.jpg",
    seedTeams: ["Koramangala FC", "HSR United", "Indiranagar XI", "Whitefield Wolves", "Jayanagar Jaguars"],
  });

  insertTournament({
    slug: "sunday-tennis-ball-bash",
    title: "Sunday Tennis-Ball Bash",
    description:
      "A chilled Sunday-morning tennis-ball tournament for casual squads. 6 overs a side, everyone bats, everyone bowls (yes, everyone). Perfect first tournament for friends who mostly play for the breakfast after.",
    sportId: sportIds.get("cricket")!,
    turfId: turfIds.get("baner-bat-and-ball-turf")!,
    startDate: sun1,
    startHour: 9,
    endHour: 13,
    format: "6-over tennis ball · knockout",
    entryFee: 800,
    prizeDetails: "Winners: ₹4,000 · Runners-up: ₹2,000 · Breakfast coupons for all finalists",
    maxTeams: 10,
    minPlayers: 6,
    maxPlayers: 11,
    bannerUrl: "/images/tournaments/cricket-cup.jpg",
    seedTeams: ["Baner Blasters", "Balewadi Boys"],
  });

  insertTournament({
    slug: "turferz-5s-corporate-football-cup",
    title: "Turferz 5s Corporate Football Cup",
    description:
      "Five-a-side football for office teams. IDs optional, banter mandatory. Company vs company across the NCR, with a trophy that will absolutely end up in your office reception.",
    sportId: sportIds.get("football")!,
    turfId: turfIds.get("gurugram-goals-football-turf")!,
    startDate: sat2,
    startHour: 17,
    endHour: 22,
    format: "5-a-side · round robin + final",
    entryFee: 1500,
    prizeDetails: "Winners: ₹10,000 + champions trophy · Runners-up: ₹5,000",
    maxTeams: 12,
    minPlayers: 5,
    maxPlayers: 9,
    bannerUrl: "/images/tournaments/football-5s.jpg",
    seedTeams: ["Sector 29 Strikers"],
  });

  // --- demo team registration ----------------------------------------
  insertRegistration({
    tournamentId: cricketCup.id,
    userId: demoUserId,
    teamName: "Lokhandwala Lions",
    captainName: "Aarav Sharma",
    contactPhone: "9876543210",
    playerCount: 9,
  });
}
