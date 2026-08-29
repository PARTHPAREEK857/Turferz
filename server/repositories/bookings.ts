import { getDb, all, one } from "../db/client";
import type { BookingStatus } from "@/lib/types";

export interface BookingRecord {
  id: string;
  code: string;
  userId: string;
  turfId: string;
  sportId: string | null;
  date: string;
  startMinutes: number;
  endMinutes: number;
  status: BookingStatus;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RawBookingRow {
  id: string;
  code: string;
  user_id: string;
  turf_id: string;
  sport_id: string | null;
  date: string;
  start_minutes: number;
  end_minutes: number;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function map(row: RawBookingRow): BookingRecord {
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    turfId: row.turf_id,
    sportId: row.sport_id,
    date: row.date,
    startMinutes: row.start_minutes,
    endMinutes: row.end_minutes,
    status: row.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
    totalAmount: row.total_amount,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SlotTakenError extends Error {
  constructor() {
    super("This slot was just booked by someone else");
    this.name = "SlotTakenError";
  }
}

/** Insert a booking. The trg_bookings_no_overlap_insert trigger is the hard
 *  guarantee against double booking; the service checks first for friendly errors. */
export function insertBooking(input: {
  code: string;
  userId: string;
  turfId: string;
  sportId: string | null;
  date: string;
  startMinutes: number;
  endMinutes: number;
  totalAmount: number;
  notes: string | null;
}): BookingRecord {
  const db = getDb();
  const now = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO bookings (id, code, user_id, turf_id, sport_id, date, start_minutes, end_minutes,
        status, total_amount, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      input.code,
      input.userId,
      input.turfId,
      input.sportId,
      input.date,
      input.startMinutes,
      input.endMinutes,
      input.totalAmount,
      input.notes,
      now,
      now,
    );
  } catch (err) {
    const message = (err as Error).message ?? "";
    if (message.includes("SLOT_TAKEN")) throw new SlotTakenError();
    if (message.includes("bookings.code"))
      throw Object.assign(new Error("Booking code collision, please retry"), { code: "CODE_COLLISION" });
    throw err;
  }
  const row = one<RawBookingRow>(db, "SELECT * FROM bookings WHERE code = ?", input.code);
  return map(row!);
}

export function findBookingByCode(code: string): BookingRecord | undefined {
  const row = one<RawBookingRow>(getDb(), "SELECT * FROM bookings WHERE code = ?", code.toUpperCase());
  return row ? map(row) : undefined;
}

export function updateBookingStatus(id: string, status: BookingStatus): BookingRecord | undefined {
  const db = getDb();
  db.prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?").run(
    status,
    new Date().toISOString(),
    id,
  );
  const row = one<RawBookingRow>(db, "SELECT * FROM bookings WHERE id = ?", id);
  return row ? map(row) : undefined;
}

/** CONFIRMED bookings for a turf on a date that overlap [start, end) minutes. */
export function findOverlapping(
  turfId: string,
  date: string,
  startMinutes: number,
  endMinutes: number,
): BookingRecord[] {
  const rows = all<RawBookingRow>(
    getDb(),
    `SELECT * FROM bookings
     WHERE turf_id = ? AND date = ? AND status = 'CONFIRMED'
       AND start_minutes < ? AND end_minutes > ?`,
    turfId,
    date,
    endMinutes,
    startMinutes,
  );
  return rows.map(map);
}

export function findConfirmedByTurfAndDate(turfId: string, date: string): BookingRecord[] {
  const rows = all<RawBookingRow>(
    getDb(),
    "SELECT * FROM bookings WHERE turf_id = ? AND date = ? AND status = 'CONFIRMED' ORDER BY start_minutes",
    turfId,
    date,
  );
  return rows.map(map);
}

export interface BookingWithTurf extends BookingRecord {
  turf: {
    slug: string;
    name: string;
    city: string;
    area: string;
    image: TurfImageLite | null;
  };
}

interface TurfImageLite {
  url: string;
  alt: string | null;
}

const LIST_SELECT = `
  SELECT b.*, t.slug AS turf_slug, t.name AS turf_name, t.city AS turf_city, t.area AS turf_area,
    (SELECT url FROM turf_images ti WHERE ti.turf_id = t.id ORDER BY ti.sort_order LIMIT 1) AS turf_image,
    (SELECT alt FROM turf_images ti WHERE ti.turf_id = t.id ORDER BY ti.sort_order LIMIT 1) AS turf_image_alt
  FROM bookings b JOIN turfs t ON t.id = b.turf_id`;

function mapWithTurf(row: Record<string, unknown>): BookingWithTurf {
  const base = map(row as unknown as RawBookingRow);
  return {
    ...base,
    turf: {
      slug: row.turf_slug as string,
      name: row.turf_name as string,
      city: row.turf_city as string,
      area: row.turf_area as string,
      image:
        row.turf_image != null
          ? { url: row.turf_image as string, alt: (row.turf_image_alt as string | null) ?? null }
          : null,
    },
  };
}

/** All bookings of a user, newest match date first. */
export function listBookingsByUser(userId: string): BookingWithTurf[] {
  const rows = all<Record<string, unknown>>(getDb(), `${LIST_SELECT} WHERE b.user_id = ? ORDER BY b.date DESC, b.start_minutes DESC`, userId);
  return rows.map(mapWithTurf);
}

/** Single booking by its code, joined with turf info. */
export function findBookingWithTurfByCode(code: string): BookingWithTurf | undefined {
  const row = one<Record<string, unknown>>(getDb(), `${LIST_SELECT} WHERE b.code = ?`, code.toUpperCase());
  return row ? mapWithTurf(row) : undefined;
}

export function countBookings(): number {
  const row = one<{ n: number }>(getDb(), "SELECT COUNT(*) AS n FROM bookings WHERE status = 'CONFIRMED'");
  return row?.n ?? 0;
}
