import { getDb, all, one, type SQLParam } from "../db/client";
import type { RegistrationStatus, TournamentStatus } from "@/lib/types";

export interface TournamentRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  sportId: string;
  turfId: string | null;
  startsAt: string;
  endsAt: string;
  registrationDeadline: string;
  format: string;
  entryFee: number;
  prizeDetails: string;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: number;
  bannerUrl: string | null;
  status: TournamentStatus;
}

interface RawTournamentRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  sport_id: string;
  turf_id: string | null;
  starts_at: string;
  ends_at: string;
  registration_deadline: string;
  format: string;
  entry_fee: number;
  prize_details: string;
  max_teams: number;
  min_players: number;
  max_players: number;
  banner_url: string | null;
  status: string;
}

function map(row: RawTournamentRow): TournamentRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    sportId: row.sport_id,
    turfId: row.turf_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    registrationDeadline: row.registration_deadline,
    format: row.format,
    entryFee: row.entry_fee,
    prizeDetails: row.prize_details,
    maxTeams: row.max_teams,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    bannerUrl: row.banner_url,
    status: normalizeStatus(row.status),
  };
}

function normalizeStatus(s: string): TournamentStatus {
  return (["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"] as const).includes(s as TournamentStatus)
    ? (s as TournamentStatus)
    : "PUBLISHED";
}

export interface TournamentFilters {
  sportSlug?: string;
  /** default: PUBLISHED + has not ended */
  upcomingOnly?: boolean;
  includeAllStatuses?: boolean;
}

export function listTournaments(filters: TournamentFilters = {}): TournamentRecord[] {
  const clauses: string[] = [];
  const params: SQLParam[] = [];
  if (!filters.includeAllStatuses) clauses.push("status = 'PUBLISHED'");
  if (filters.upcomingOnly !== false) {
    clauses.push("ends_at >= ?");
    params.push(new Date().toISOString());
  }
  if (filters.sportSlug) {
    clauses.push("sport_id IN (SELECT id FROM sports WHERE slug = ?)");
    params.push(filters.sportSlug);
  }
  const sql = `SELECT * FROM tournaments ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
               ORDER BY starts_at ASC`;
  return all<RawTournamentRow>(getDb(), sql, ...params).map(map);
}

export function findTournamentBySlug(slug: string): TournamentRecord | undefined {
  const row = one<RawTournamentRow>(getDb(), "SELECT * FROM tournaments WHERE slug = ?", slug);
  return row ? map(row) : undefined;
}

export function countConfirmedRegistrations(tournamentId: string): number {
  const row = one<{ n: number }>(
    getDb(),
    "SELECT COUNT(*) AS n FROM tournament_registrations WHERE tournament_id = ? AND status = 'CONFIRMED'",
    tournamentId,
  );
  return row?.n ?? 0;
}

export interface RegistrationRecord {
  id: string;
  tournamentId: string;
  userId: string;
  teamName: string;
  captainName: string;
  contactPhone: string;
  playerCount: number;
  status: RegistrationStatus;
  createdAt: string;
}

interface RawRegistrationRow {
  id: string;
  tournament_id: string;
  user_id: string;
  team_name: string;
  captain_name: string;
  contact_phone: string;
  player_count: number;
  status: string;
  created_at: string;
}

function mapRegistration(row: RawRegistrationRow): RegistrationRecord {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    userId: row.user_id,
    teamName: row.team_name,
    captainName: row.captain_name,
    contactPhone: row.contact_phone,
    playerCount: row.player_count,
    status: row.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
    createdAt: row.created_at,
  };
}

export class RegistrationConflictError extends Error {
  reason: "TEAM_NAME_TAKEN" | "ALREADY_REGISTERED";
  constructor(reason: "TEAM_NAME_TAKEN" | "ALREADY_REGISTERED") {
    super(
      reason === "TEAM_NAME_TAKEN"
        ? "That team name is already registered for this tournament"
        : "You have already registered a team for this tournament",
    );
    this.reason = reason;
  }
}

export function insertRegistration(input: {
  tournamentId: string;
  userId: string;
  teamName: string;
  captainName: string;
  contactPhone: string;
  playerCount: number;
}): RegistrationRecord {
  const db = getDb();
  const now = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO tournament_registrations (id, tournament_id, user_id, team_name, captain_name,
        contact_phone, player_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)`,
    ).run(
      crypto.randomUUID(),
      input.tournamentId,
      input.userId,
      input.teamName,
      input.captainName,
      input.contactPhone,
      input.playerCount,
      now,
      now,
    );
  } catch (err) {
    const message = (err as Error).message ?? "";
    if (message.includes("tournament_registrations.team_name"))
      throw new RegistrationConflictError("TEAM_NAME_TAKEN");
    if (message.includes("tournament_registrations.user_id"))
      throw new RegistrationConflictError("ALREADY_REGISTERED");
    throw err;
  }
  const created = all<RawRegistrationRow>(
    db,
    "SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ? AND status = 'CONFIRMED'",
    input.tournamentId,
    input.userId,
  )[0];
  return mapRegistration(created!);
}

export function findActiveRegistration(tournamentId: string, userId: string): RegistrationRecord | undefined {
  const row = one<RawRegistrationRow>(
    getDb(),
    "SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ? AND status = 'CONFIRMED'",
    tournamentId,
    userId,
  );
  return row ? mapRegistration(row) : undefined;
}

export function findRegistrationByTeamName(tournamentId: string, teamName: string): RegistrationRecord | undefined {
  const row = one<RawRegistrationRow>(
    getDb(),
    "SELECT * FROM tournament_registrations WHERE tournament_id = ? AND team_name = ? COLLATE NOCASE AND status = 'CONFIRMED'",
    tournamentId,
    teamName,
  );
  return row ? mapRegistration(row) : undefined;
}

export interface RegistrationWithTournament extends RegistrationRecord {
  tournament: {
    slug: string;
    title: string;
    city: string | null;
    startsAt: string;
  };
}

export function listRegistrationsByUser(userId: string): RegistrationWithTournament[] {
  const rows = all(
    getDb(),
    `SELECT r.*, tn.slug AS t_slug, tn.title AS t_title, tn.starts_at AS t_starts_at,
            (SELECT city FROM turfs WHERE id = tn.turf_id) AS t_city
     FROM tournament_registrations r JOIN tournaments tn ON tn.id = r.tournament_id
     WHERE r.user_id = ?
     ORDER BY tn.starts_at ASC`,
    userId,
  );
  return rows.map((row) => ({
    ...mapRegistration(row as unknown as RawRegistrationRow),
    tournament: {
      slug: row.t_slug as string,
      title: row.t_title as string,
      city: (row.t_city as string | null) ?? null,
      startsAt: row.t_starts_at as string,
    },
  }));
}
