/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeAll, describe, expect, it } from "vitest";
import { addDays, istToday } from "../lib/time";

/**
 * End-to-end API tests: real route handlers invoked with Web Requests,
 * covering auth cookie flow, validation, booking, and tournament registration.
 */

type RouteModule = Record<string, (req: Request, ctx?: unknown) => Promise<Response>>;

/** Load a route module with its Next.js config exports (dynamic, etc.) stripped of type friction. */
async function loadRoute(path: string): Promise<RouteModule> {
  const mod = await import(/* @vite-ignore */ path);
  return mod as unknown as RouteModule;
}

function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

function jsonRequest(path: string, method: string, body: unknown, cookie?: string): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function body(res: Response): Promise<any> {
  return res.json();
}

describe("Turferz API", () => {
  let cookie = "";
  const email = `player${Date.now()}@test.dev`;
  const password = "testpass123";
  const day = addDays(istToday(), 2);

  beforeAll(async () => {
    // create a fresh account via the real API and capture the session cookie
    const { POST } = await loadRoute("../app/api/auth/register/route");
    const res = await POST(jsonRequest("/api/auth/register", "POST", {
      name: "Api Tester",
      email,
      password,
      phone: "9876543210",
    }));
    expect(res.status).toBe(201);
    cookie = res.headers.get("set-cookie")!.split(";")[0];
    expect(cookie).toContain("turferz_session=");
  });

  it("GET /api/auth/me returns the session user", async () => {
    const { GET } = await loadRoute("../app/api/auth/me/route");
    const res = await GET(request("/api/auth/me", { headers: { cookie } }));
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.user.email).toBe(email);
  });

  it("rejects bad credentials without leaking which field was wrong", async () => {
    const { POST } = await loadRoute("../app/api/auth/login/route");
    const res = await POST(
      jsonRequest("/api/auth/login", "POST", { email, password: "wrong-password" }),
    );
    expect(res.status).toBe(401);
    const data = await body(res);
    expect(data.error.message).toBe("Incorrect email or password");
  });

  it("GET /api/sports lists seeded sports", async () => {
    const { GET } = await loadRoute("../app/api/sports/route");
    const res = await GET(request("/api/sports"));
    const data = await body(res);
    expect(data.sports.map((s: { slug: string }) => s.slug)).toEqual(
      expect.arrayContaining(["cricket", "football"]),
    );
  });

  it("GET /api/turfs filters by sport and city", async () => {
    const { GET } = await loadRoute("../app/api/turfs/route");
    const all = await body(await GET(request("/api/turfs")));
    expect(all.turfs.length).toBeGreaterThanOrEqual(2);
    const cricket = await body(await GET(request("/api/turfs?sport=cricket")));
    expect(cricket.turfs.every((t: { sports: { slug: string }[] }) => t.sports.some((s) => s.slug === "cricket"))).toBe(true);
    const none = await body(await GET(request("/api/turfs?city=Nowhere")));
    expect(none.turfs).toHaveLength(0);
  });

  it("GET /api/turfs/[slug] returns detail and 404s for unknown slugs", async () => {
    const { GET } = await loadRoute("../app/api/turfs/[slug]/route");
    const ctx = { params: Promise.resolve({ slug: "test-turf" }) };
    const res = await GET(request("/api/turfs/test-turf"), ctx);
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.turf.name).toBe("Test Turf");
    expect(data.turf.amenities).toEqual([]);

    const missing = await GET(request("/api/turfs/ghost"), { params: Promise.resolve({ slug: "ghost" }) });
    expect(missing.status).toBe(404);
  });

  it("GET availability returns slots and validates dates", async () => {
    const { GET } = await loadRoute("../app/api/turfs/[slug]/availability/route");
    const res = await GET(request(`/api/turfs/test-turf/availability?date=${day}`), {
      params: Promise.resolve({ slug: "test-turf" }),
    });
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.availability.slots).toHaveLength(24);

    const bad = await GET(request("/api/turfs/test-turf/availability?date=2026-02-30"), {
      params: Promise.resolve({ slug: "test-turf" }),
    });
    expect(bad.status).toBe(400);
  });

  it("POST /api/bookings requires auth", async () => {
    const { POST } = await loadRoute("../app/api/bookings/route");
    const res = await POST(
      jsonRequest("/api/bookings", "POST", { turfSlug: "test-turf", date: day, startMinutes: 600, durationHours: 1 }),
    );
    expect(res.status).toBe(401);
  });

  it("full booking flow: create → list → conflict → cancel", async () => {
    const { POST, GET } = await loadRoute("../app/api/bookings/route");
    const cancelRoute = await loadRoute("../app/api/bookings/[code]/cancel/route");

    // create
    const created = await POST(
      jsonRequest("/api/bookings", "POST", { turfSlug: "test-turf", date: day, startMinutes: 600, durationHours: 1 }, cookie),
    );
    expect(created.status).toBe(201);
    const { booking } = await body(created);
    expect(booking.code).toMatch(/^TZ-/);

    // conflict on the same slot
    const clash = await POST(
      jsonRequest("/api/bookings", "POST", { turfSlug: "test-turf", date: day, startMinutes: 600, durationHours: 1 }, cookie),
    );
    expect(clash.status).toBe(409);
    expect((await body(clash)).error.code).toBe("SLOT_TAKEN");

    // validation error shape
    const invalid = await POST(
      jsonRequest("/api/bookings", "POST", { turfSlug: "test-turf", date: day, startMinutes: 630, durationHours: 1 }, cookie),
    );
    expect(invalid.status).toBe(400);

    // availability now marks the slot booked
    const availabilityRoute = await loadRoute("../app/api/turfs/[slug]/availability/route");
    const availability = await body(
      await availabilityRoute.GET(request(`/api/turfs/test-turf/availability?date=${day}`), {
        params: Promise.resolve({ slug: "test-turf" }),
      }),
    );
    const slot = availability.availability.slots.find((s: { startMinutes: number }) => s.startMinutes === 600);
    expect(slot.status).toBe("booked");

    // listing includes the booking
    const list = await body(await GET(request("/api/bookings", { headers: { cookie } })));
    expect(list.bookings.some((b: { code: string }) => b.code === booking.code)).toBe(true);

    // cancel, then the slot is free again
    const cancelled = await cancelRoute.POST(request(`/api/bookings/${booking.code}/cancel`, { method: "POST", headers: { cookie } }), {
      params: Promise.resolve({ code: booking.code }),
    });
    expect(cancelled.status).toBe(200);
    expect((await body(cancelled)).booking.status).toBe("CANCELLED");

    const afterCancel = await body(
      await availabilityRoute.GET(request(`/api/turfs/test-turf/availability?date=${day}`), {
        params: Promise.resolve({ slug: "test-turf" }),
      }),
    );
    const slotAfter = afterCancel.availability.slots.find((s: { startMinutes: number }) => s.startMinutes === 600);
    expect(slotAfter.status).toBe("available");
  });

  it("tournament registration flow with auth, validation, and duplicates", async () => {
    const listRoute = await loadRoute("../app/api/tournaments/route");
    const detailRoute = await loadRoute("../app/api/tournaments/[slug]/route");
    const registerRoute = await loadRoute("../app/api/tournaments/[slug]/register/route");
    const mineRoute = await loadRoute("../app/api/me/tournament-registrations/route");

    // list
    const list = await body(await listRoute.GET(request("/api/tournaments")));
    expect(list.tournaments.some((t: { slug: string }) => t.slug === "test-cup")).toBe(true);

    // requires auth
    const anon = await registerRoute.POST(
      jsonRequest("/api/tournaments/test-cup/register", "POST", {
        teamName: "No Auth FC",
        captainName: "Anon",
        contactPhone: "9876543210",
        playerCount: 8,
      }),
      { params: Promise.resolve({ slug: "test-cup" }) },
    );
    expect(anon.status).toBe(401);

    // invalid phone → field error
    const badPhone = await registerRoute.POST(
      jsonRequest("/api/tournaments/test-cup/register", "POST", {
        teamName: "Bad Phone FC",
        captainName: "Tester",
        contactPhone: "12345",
        playerCount: 8,
      }, cookie),
      { params: Promise.resolve({ slug: "test-cup" }) },
    );
    expect(badPhone.status).toBe(400);
    expect((await body(badPhone)).error.fieldErrors.contactPhone).toBeDefined();

    // register
    const registered = await registerRoute.POST(
      jsonRequest("/api/tournaments/test-cup/register", "POST", {
        teamName: "API Allstars",
        captainName: "Api Tester",
        contactPhone: "9876543210",
        playerCount: 9,
      }, cookie),
      { params: Promise.resolve({ slug: "test-cup" }) },
    );
    expect(registered.status).toBe(201);

    // duplicate team name → 409
    const dupe = await registerRoute.POST(
      jsonRequest("/api/tournaments/test-cup/register", "POST", {
        teamName: "API Allstars",
        captainName: "Copycat",
        contactPhone: "9876543210",
        playerCount: 9,
      }, cookie),
      { params: Promise.resolve({ slug: "test-cup" }) },
    );
    expect(dupe.status).toBe(409);

    // detail includes my registration (authenticated)
    const detail = await body(
      await detailRoute.GET(request("/api/tournaments/test-cup", { headers: { cookie } }), {
        params: Promise.resolve({ slug: "test-cup" }),
      }),
    );
    expect(detail.tournament.myRegistration?.teamName).toBe("API Allstars");

    // my registrations
    const mine = await body(await mineRoute.GET(request("/api/me/tournament-registrations", { headers: { cookie } })));
    expect(mine.registrations.some((r: { teamName: string }) => r.teamName === "API Allstars")).toBe(true);
  });

  it("health endpoint reports database connectivity", async () => {
    const { GET } = await loadRoute("../app/api/health/route");
    const res = await GET(request("/api/health"));
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.database).toBe("connected");
  });
});
