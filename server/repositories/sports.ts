import { getDb, all } from "../db/client";
import type { Sport } from "@/lib/types";

interface RawSportRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  icon: string | null;
}

export function listActiveSports(): Sport[] {
  const rows = all<RawSportRow>(
    getDb(),
    "SELECT id, slug, name, tagline, icon FROM sports WHERE is_active = 1 ORDER BY sort_order, name",
  );
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, tagline: r.tagline, icon: r.icon }));
}

export function findSportBySlug(slug: string): Sport | undefined {
  const row = all<RawSportRow>(
    getDb(),
    "SELECT id, slug, name, tagline, icon FROM sports WHERE slug = ?",
    slug,
  )[0];
  return row ? { id: row.id, slug: row.slug, name: row.name, tagline: row.tagline, icon: row.icon } : undefined;
}
