import { ApiError } from "../http";
import type {
  SessionUser,
  TournamentDetail,
  TournamentListItem,
  TournamentRegistrationSummary,
} from "@/lib/types";
import { withTransaction } from "../db/client";
import {
  RegistrationConflictError,
  countConfirmedRegistrations,
  findActiveRegistration,
  findRegistrationByTeamName,
  findTournamentBySlug,
  insertRegistration,
  listRegistrationsByUser,
  listTournaments,
  type TournamentRecord,
} from "../repositories/tournaments";
import { findTurfBySlug, listTurfs, type TurfRecord } from "../repositories/turfs";
import { listActiveSports } from "../repositories/sports";

interface TournamentMeta {
  sport: { slug: string; name: string };
  turf: TurfRecord | undefined;
  registeredTeams: number;
}

/** Join tournaments with sport + venue + registration counts. */
function buildMeta(records: TournamentRecord[]): Map<string, TournamentMeta> {
  const sports = listActiveSports();
  const turfIds = [...new Set(records.map((r) => r.turfId).filter((id): id is string => !!id))];
  const turfsById = new Map<string, TurfRecord>();
  if (turfIds.length) {
    for (const turf of listTurfs({ activeOnly: false })) {
      if (turfIds.includes(turf.id)) turfsById.set(turf.id, turf);
    }
  }
  const meta = new Map<string, TournamentMeta>();
  for (const record of records) {
    const sport = sports.find((s) => s.id === record.sportId);
    meta.set(record.id, {
      sport: { slug: sport?.slug ?? "other", name: sport?.name ?? "Other" },
      turf: record.turfId ? turfsById.get(record.turfId) : undefined,
      registeredTeams: countConfirmedRegistrations(record.id),
    });
  }
  return meta;
}

function isRegistrationOpen(
  t: Pick<TournamentRecord, "status" | "registrationDeadline" | "startsAt" | "maxTeams">,
  registeredTeams: number,
): boolean {
  const now = Date.now();
  return (
    t.status === "PUBLISHED" &&
    now <= Date.parse(t.registrationDeadline) &&
    now <= Date.parse(t.startsAt) &&
    registeredTeams < t.maxTeams
  );
}

function toListItem(t: TournamentRecord, m: TournamentMeta): TournamentListItem {
  return {
    slug: t.slug,
    title: t.title,
    sport: m.sport,
    city: m.turf?.city ?? null,
    venueName: m.turf?.name ?? null,
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    entryFee: t.entryFee,
    format: t.format,
    maxTeams: t.maxTeams,
    registeredTeams: m.registeredTeams,
    spotsLeft: Math.max(0, t.maxTeams - m.registeredTeams),
    bannerUrl: t.bannerUrl,
    registrationDeadline: t.registrationDeadline,
    registrationOpen: isRegistrationOpen(t, m.registeredTeams),
  };
}

export function listUpcomingTournaments(sportSlug?: string): TournamentListItem[] {
  const records = listTournaments({ sportSlug });
  const meta = buildMeta(records);
  return records.map((r) => toListItem(r, meta.get(r.id)!));
}

export function getTournamentDetail(slug: string, user: SessionUser | null): TournamentDetail {
  const record = findTournamentBySlug(slug);
  if (!record || record.status === "DRAFT") throw ApiError.notFound("Tournament not found");

  const meta = buildMeta([record]).get(record.id)!;
  const mine = user ? findActiveRegistration(record.id, user.id) : undefined;

  return {
    ...toListItem(record, meta),
    description: record.description,
    prizeDetails: record.prizeDetails,
    venueAddress: meta.turf ? `${meta.turf.name}, ${meta.turf.area}, ${meta.turf.city}` : null,
    minPlayers: record.minPlayers,
    maxPlayers: record.maxPlayers,
    myRegistration: mine ? toRegistrationSummary(mine, record, meta.turf) : null,
  };
}

function toRegistrationSummary(
  reg: {
    id: string;
    teamName: string;
    captainName: string;
    contactPhone: string;
    playerCount: number;
    status: string;
    createdAt: string;
  },
  tournament: { slug: string; title: string; startsAt: string },
  turf?: TurfRecord,
): TournamentRegistrationSummary {
  return {
    id: reg.id,
    tournamentSlug: tournament.slug,
    tournamentTitle: tournament.title,
    city: turf?.city ?? null,
    startsAt: tournament.startsAt,
    teamName: reg.teamName,
    captainName: reg.captainName,
    contactPhone: reg.contactPhone,
    playerCount: reg.playerCount,
    status: reg.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
    createdAt: reg.createdAt,
  };
}

export interface RegisterTeamArgs {
  user: SessionUser;
  tournamentSlug: string;
  teamName: string;
  captainName: string;
  contactPhone: string;
  playerCount: number;
}

/**
 * Register a team for a tournament. Guarded atomically: published status,
 * registration deadline, capacity, unique team name, one team per user.
 */
export function registerTeam(args: RegisterTeamArgs): TournamentRegistrationSummary {
  const tournament = findTournamentBySlug(args.tournamentSlug);
  if (!tournament) throw ApiError.notFound("Tournament not found");

  if (args.playerCount < tournament.minPlayers || args.playerCount > tournament.maxPlayers) {
    throw new ApiError(
      409,
      "INVALID_SQUAD_SIZE",
      `Squad size must be between ${tournament.minPlayers} and ${tournament.maxPlayers} players`,
      { playerCount: `Enter between ${tournament.minPlayers} and ${tournament.maxPlayers}` },
    );
  }

  try {
    const registration = withTransaction(() => {
      const now = Date.now();
      if (tournament.status !== "PUBLISHED" || now > Date.parse(tournament.registrationDeadline)) {
        throw new ApiError(409, "REGISTRATION_CLOSED", "Registration for this tournament is closed");
      }
      if (now > Date.parse(tournament.startsAt)) {
        throw new ApiError(409, "REGISTRATION_CLOSED", "This tournament has already started");
      }
      if (countConfirmedRegistrations(tournament.id) >= tournament.maxTeams) {
        throw new ApiError(409, "TOURNAMENT_FULL", "All team slots for this tournament are filled");
      }
      if (findActiveRegistration(tournament.id, args.user.id)) {
        throw new ApiError(409, "ALREADY_REGISTERED", "You have already registered a team for this tournament");
      }
      if (findRegistrationByTeamName(tournament.id, args.teamName)) {
        throw new ApiError(409, "TEAM_NAME_TAKEN", "That team name is already taken for this tournament");
      }
      return insertRegistration({
        tournamentId: tournament.id,
        userId: args.user.id,
        teamName: args.teamName,
        captainName: args.captainName,
        contactPhone: args.contactPhone,
        playerCount: args.playerCount,
      });
    });

    const meta = buildMeta([tournament]).get(tournament.id)!;
    return toRegistrationSummary(registration, tournament, meta.turf);
  } catch (err) {
    if (err instanceof RegistrationConflictError) {
      throw new ApiError(409, err.reason, err.message);
    }
    throw err;
  }
}

export function listMyRegistrations(user: SessionUser): TournamentRegistrationSummary[] {
  const bySlug = new Map<string, { record: TournamentRecord; turf?: TurfRecord }>();
  for (const record of listTournaments({ upcomingOnly: false, includeAllStatuses: true })) {
    bySlug.set(record.slug, { record });
  }
  return listRegistrationsByUser(user.id).map((r) => {
    const entry = bySlug.get(r.tournament.slug);
    return toRegistrationSummary(r, r.tournament, entry?.turf);
  });
}

export function getSportList() {
  return listActiveSports();
}

export { findTurfBySlug };
