import { getDb, all, type SQLParam } from "../db/client";
import type { TurfDetail, TurfImage, TurfListItem } from "@/lib/types";

export interface TurfRecord {
  id: string;
  slug: string;
  name: string;
  city: string;
  area: string;
  address: string;
  description: string;
  surface: string;
  pricePerHour: number;
  openHour: number;
  closeHour: number;
  amenities: string[];
  isActive: boolean;
  sports: { id: string; slug: string; name: string }[];
  images: TurfImage[];
}

interface RawTurfRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  area: string;
  address: string;
  description: string;
  surface: string;
  price_per_hour: number;
  open_hour: number;
  close_hour: number;
  amenities: string;
  is_active: number;
}

function baseSelect(): string {
  return `SELECT t.id, t.slug, t.name, t.city, t.area, t.address, t.description, t.surface,
          t.price_per_hour, t.open_hour, t.close_hour, t.amenities, t.is_active
          FROM turfs t`;
}

function assemble(rows: RawTurfRow[]): TurfRecord[] {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(", ");

  const sportRows = all<{ turf_id: string; sport_id: string; slug: string; name: string }>(
    db,
    `SELECT ts.turf_id, ts.sport_id, s.slug, s.name
     FROM turf_sports ts JOIN sports s ON s.id = ts.sport_id
     WHERE ts.turf_id IN (${placeholders}) ORDER BY s.sort_order, s.name`,
    ...ids,
  );
  const imageRows = all<{ turf_id: string; url: string; alt: string | null }>(
    db,
    `SELECT turf_id, url, alt FROM turf_images
     WHERE turf_id IN (${placeholders}) ORDER BY sort_order`,
    ...ids,
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    area: row.area,
    address: row.address,
    description: row.description,
    surface: row.surface,
    pricePerHour: row.price_per_hour,
    openHour: row.open_hour,
    closeHour: row.close_hour,
    amenities: safeParseAmenities(row.amenities),
    isActive: row.is_active === 1,
    sports: sportRows
      .filter((s) => s.turf_id === row.id)
      .map((s) => ({ id: s.sport_id, slug: s.slug, name: s.name })),
    images: imageRows
      .filter((i) => i.turf_id === row.id)
      .map((i) => ({ url: i.url, alt: i.alt })),
  }));
}

function safeParseAmenities(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export interface TurfFilters {
  sportSlug?: string;
  city?: string;
  q?: string;
  maxPrice?: number;
  sort?: "popular" | "price-asc" | "price-desc";
  activeOnly?: boolean;
}

export function listTurfs(filters: TurfFilters = {}): TurfRecord[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: SQLParam[] = [];

  if (filters.activeOnly !== false) clauses.push("t.is_active = 1");
  if (filters.city) {
    clauses.push("t.city = ? COLLATE NOCASE");
    params.push(filters.city);
  }
  if (filters.maxPrice) {
    clauses.push("t.price_per_hour <= ?");
    params.push(filters.maxPrice);
  }
  if (filters.q) {
    clauses.push("(t.name LIKE ? COLLATE NOCASE OR t.area LIKE ? COLLATE NOCASE OR t.city LIKE ? COLLATE NOCASE)");
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  if (filters.sportSlug) {
    clauses.push(
      `EXISTS (SELECT 1 FROM turf_sports ts JOIN sports s ON s.id = ts.sport_id
               WHERE ts.turf_id = t.id AND s.slug = ?)`,
    );
    params.push(filters.sportSlug);
  }

  const orderBy =
    filters.sort === "price-asc"
      ? "t.price_per_hour ASC, t.name"
      : filters.sort === "price-desc"
        ? "t.price_per_hour DESC, t.name"
        : "t.name";

  const sql = `${baseSelect()}${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY ${orderBy}`;
  return assemble(all<RawTurfRow>(db, sql, ...params));
}

export function findTurfBySlug(slug: string, includeInactive = false): TurfRecord | undefined {
  const db = getDb();
  const rows = all<RawTurfRow>(
    db,
    `${baseSelect()} WHERE t.slug = ?${includeInactive ? "" : " AND t.is_active = 1"}`,
    slug,
  );
  return assemble(rows)[0];
}

export function listCities(): string[] {
  const rows = all<{ city: string }>(getDb(), "SELECT DISTINCT city FROM turfs WHERE is_active = 1 ORDER BY city");
  return rows.map((r) => r.city);
}

/** Map a turf record to the shape returned by list endpoints. */
export function toListItem(turf: TurfRecord): TurfListItem {
  return {
    id: turf.id,
    slug: turf.slug,
    name: turf.name,
    city: turf.city,
    area: turf.area,
    surface: turf.surface,
    pricePerHour: turf.pricePerHour,
    sports: turf.sports.map((s) => ({ slug: s.slug, name: s.name })),
    image: turf.images[0] ?? null,
  };
}

/** Map a turf record to the full detail shape. */
export function toDetail(turf: TurfRecord): TurfDetail {
  return {
    ...toListItem(turf),
    address: turf.address,
    description: turf.description,
    openHour: turf.openHour,
    closeHour: turf.closeHour,
    amenities: turf.amenities,
    images: turf.images,
  };
}
