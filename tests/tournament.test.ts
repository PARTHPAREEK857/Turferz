import { describe, expect, it } from "vitest";
import {
  getTournamentDetail,
  listMyRegistrations,
  listUpcomingTournaments,
  registerTeam,
} from "../server/services/tournaments";
import { getDb } from "../server/db/client";
import { ApiError } from "../server/http";
import { insertTournament, IDS, sessionUser } from "./fixtures";

const alice = sessionUser(IDS.alice, "Alice");
const bob = sessionUser(IDS.bob, "Bob");

function teamInput(overrides: Partial<Parameters<typeof registerTeam>[0]> = {}) {
  return {
    user: alice,
    tournamentSlug: "test-cup",
    teamName: "Alice Angels",
    captainName: "Alice",
    contactPhone: "9876543210",
    playerCount: 9,
    ...overrides,
  };
}

describe("tournament service", () => {
  it("registers a team successfully", () => {
    const reg = registerTeam(teamInput());
    expect(reg.teamName).toBe("Alice Angels");
    expect(reg.status).toBe("CONFIRMED");
    expect(reg.tournamentSlug).toBe("test-cup");
  });

  it("exposes the registration in tournament detail for the owner", () => {
    const detail = getTournamentDetail("test-cup", alice);
    expect(detail.myRegistration?.teamName).toBe("Alice Angels");
    const anon = getTournamentDetail("test-cup", null);
    expect(anon.myRegistration).toBeNull();
  });

  it("counts registered teams and spots left", () => {
    const detail = getTournamentDetail("test-cup", null);
    expect(detail.registeredTeams).toBeGreaterThanOrEqual(1);
    expect(detail.spotsLeft).toBe(detail.maxTeams - detail.registeredTeams);
  });

  it("blocks a second team from the same user", () => {
    expect(() => registerTeam(teamInput({ teamName: "Alice Second XI" }))).toThrowError(/already registered/i);
  });

  it("blocks duplicate team names (case-insensitive)", () => {
    expect(() =>
      registerTeam(teamInput({ user: bob, teamName: "alice angels" })),
    ).toThrowError(/already taken/i);
  });

  it("enforces squad size bounds from the tournament", () => {
    expect(() => registerTeam(teamInput({ user: bob, teamName: "Bob Big Squad", playerCount: 13 }))).toThrowError(
      /between 6 and 12/i,
    );
    expect(() => registerTeam(teamInput({ user: bob, teamName: "Bob Small Squad", playerCount: 5 }))).toThrowError(
      /between 6 and 12/i,
    );
  });

  it("fills to capacity and then rejects", async () => {
    insertTournament({ slug: "tiny-cup", daysAhead: 2, maxTeams: 1 });
    registerTeam({ user: bob, tournamentSlug: "tiny-cup", teamName: "Only Team", captainName: "Bob", contactPhone: "9876543210", playerCount: 7 });
    const { createUser } = await import("../server/repositories/users");
    const carol = createUser({ name: "Carol Test", email: "carol@test.dev", phone: null, passwordHash: "x" });
    expect(() =>
      registerTeam({
        user: sessionUser(carol.id, "Carol"),
        tournamentSlug: "tiny-cup",
        teamName: "Second Team",
        captainName: "Carol",
        contactPhone: "9876543210",
        playerCount: 7,
      }),
    ).toThrowError(/filled/i);
  });

  it("closes registration when the deadline has passed", () => {
    insertTournament({ slug: "late-cup", daysAhead: 3, deadlineInPast: true });
    expect(() =>
      registerTeam(teamInput({ tournamentSlug: "late-cup", teamName: "Late Team" })),
    ).toThrowError(ApiError);
  });

  it("closes registration for tournaments that already started", () => {
    insertTournament({ slug: "started-cup", daysAhead: -1 });
    expect(() =>
      registerTeam(teamInput({ tournamentSlug: "started-cup", teamName: "Late Team" })),
    ).toThrowError(ApiError);
  });

  it("lists only upcoming tournaments with open flags", () => {
    insertTournament({ slug: "started-cup-2", daysAhead: -1 });
    const list = listUpcomingTournaments();
    expect(list.some((t) => t.slug === "started-cup-2")).toBe(false);
    expect(list.some((t) => t.slug === "test-cup")).toBe(true);
  });

  it("lists my registrations", () => {
    const mine = listMyRegistrations(alice);
    expect(mine.some((r) => r.tournamentSlug === "test-cup" && r.teamName === "Alice Angels")).toBe(true);
  });

  it("marks a full tournament as closed", () => {
    const db = getDb();
    insertTournament({ slug: "full-cup", daysAhead: 4, maxTeams: 1 });
    db.prepare(
      `INSERT INTO tournament_registrations (id, tournament_id, user_id, team_name, captain_name,
        contact_phone, player_count, status, created_at, updated_at)
       VALUES ('reg-full-1', 't-full-cup', ?, 'Filler FC', 'Filler', '9876543210', 7, 'CONFIRMED', ?, ?)`,
    ).run(IDS.bob, new Date().toISOString(), new Date().toISOString());
    const detail = getTournamentDetail("full-cup", null);
    expect(detail.registrationOpen).toBe(false);
    expect(detail.spotsLeft).toBe(0);
  });
});
