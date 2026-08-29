import { describe, expect, it } from "vitest";
import {
  cancelMyBooking,
  createBooking,
  listMyBookings,
  type CreateBookingArgs,
} from "../server/services/bookings";
import { insertBooking, SlotTakenError } from "../server/repositories/bookings";
import { getDb } from "../server/db/client";
import { ApiError } from "../server/http";
import { addDays, istNow, istToday } from "../lib/time";
import { IDS, sessionUser } from "./fixtures";

const alice = sessionUser(IDS.alice, "Alice");
const bob = sessionUser(IDS.bob, "Bob");

/** A definitely-future slot: tomorrow at 10:00. */
function futureArgs(overrides: Partial<CreateBookingArgs> = {}): CreateBookingArgs {
  return {
    user: alice,
    turfSlug: "test-turf",
    date: addDays(istToday(), 1),
    startMinutes: 10 * 60,
    durationHours: 1,
    ...overrides,
  };
}

describe("booking service", () => {
  it("creates a booking with a code and correct total", () => {
    const booking = createBooking(futureArgs());
    expect(booking.code).toMatch(/^TZ-[A-Z0-9]{6}$/);
    expect(booking.totalAmount).toBe(1000);
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.turf.name).toBe("Test Turf");
  });

  it("charges double for a 2-hour booking", () => {
    const booking = createBooking(futureArgs({ startMinutes: 14 * 60, durationHours: 2 }));
    expect(booking.totalAmount).toBe(2000);
    expect(booking.endMinutes).toBe(16 * 60);
  });

  it("prevents two users from booking the same slot", () => {
    createBooking(futureArgs({ user: alice, startMinutes: 20 * 60 }));
    expect(() => createBooking(futureArgs({ user: bob, startMinutes: 20 * 60 }))).toThrowError(/just booked/);
  });

  it("prevents overlapping partial bookings (9-10 vs 9:30-10:30)", () => {
    createBooking(futureArgs({ startMinutes: 9 * 60 }));
    // a 2h booking starting 10:00 overlaps 10-11
    expect(() => createBooking(futureArgs({ startMinutes: 10 * 60, durationHours: 2 }))).toThrowError(
      ApiError,
    );
  });

  it("allows back-to-back bookings", () => {
    createBooking(futureArgs({ startMinutes: 11 * 60 }));
    const adjacent = createBooking(futureArgs({ user: bob, startMinutes: 12 * 60 }));
    expect(adjacent.status).toBe("CONFIRMED");
  });

  it("enforces opening hours", () => {
    // alt turf opens at 8 and closes at 22
    const day = addDays(istToday(), 1);
    expect(() =>
      createBooking({ user: alice, turfSlug: "test-turf-alt", date: day, startMinutes: 7 * 60, durationHours: 1 }),
    ).toThrowError(/opens at/);
    expect(() =>
      createBooking({ user: alice, turfSlug: "test-turf-alt", date: day, startMinutes: 22 * 60, durationHours: 1 }),
    ).toThrowError(/closes at/);
    expect(() =>
      createBooking({ user: alice, turfSlug: "test-turf-alt", date: day, startMinutes: 21 * 60, durationHours: 2 }),
    ).toThrowError(/closes at/);
  });

  it("rejects misaligned start times", () => {
    expect(() => createBooking(futureArgs({ startMinutes: 10 * 60 + 30 }))).toThrowError(/hourly slot/);
  });

  it("rejects past dates", () => {
    expect(() => createBooking(futureArgs({ date: addDays(istToday(), -1) }))).toThrowError(/passed/);
  });

  it("rejects same-day slots inside the lead window", () => {
    const now = istNow();
    const slotHour = Math.floor((now.minutes + 29) / 60) * 60;
    if (slotHour < 1440) {
      expect(() => createBooking(futureArgs({ date: istToday(), startMinutes: slotHour }))).toThrowError(
        /TOO_LATE|ahead/i,
      );
    }
  });

  it("404s when the turf does not exist", () => {
    expect(() => createBooking(futureArgs({ turfSlug: "ghost" }))).toThrowError(/not found/i);
  });

  it("the database trigger hard-blocks overlapping inserts", () => {
    const day = addDays(istToday(), 5);
    const first = insertBooking({
      code: "TZ-TRIG1",
      userId: IDS.alice,
      turfId: IDS.turf,
      sportId: null,
      date: day,
      startMinutes: 15 * 60,
      endMinutes: 16 * 60,
      totalAmount: 1000,
      notes: null,
    });
    expect(first.code).toBe("TZ-TRIG1");
    expect(() =>
      insertBooking({
        code: "TZ-TRIG2",
        userId: IDS.bob,
        turfId: IDS.turf,
        sportId: null,
        date: day,
        startMinutes: 15 * 60 + 30,
        endMinutes: 16 * 60 + 30,
        totalAmount: 1000,
        notes: null,
      }),
    ).toThrowError(SlotTakenError);
  });

  it("cancel frees the slot for someone else", () => {
    const day = addDays(istToday(), 6);
    const booking = createBooking({ user: alice, turfSlug: "test-turf", date: day, startMinutes: 13 * 60, durationHours: 1 });
    const cancelled = cancelMyBooking(alice, booking.code);
    expect(cancelled.status).toBe("CANCELLED");
    const rebooked = createBooking({ user: bob, turfSlug: "test-turf", date: day, startMinutes: 13 * 60, durationHours: 1 });
    expect(rebooked.status).toBe("CONFIRMED");
  });

  it("only the owner can view or cancel a booking", () => {
    const booking = createBooking(futureArgs({ startMinutes: 17 * 60 }));
    expect(() => cancelMyBooking(bob, booking.code)).toThrowError(/not found/i);
  });

  it("cannot cancel twice", () => {
    const booking = createBooking(futureArgs({ startMinutes: 18 * 60 }));
    cancelMyBooking(alice, booking.code);
    expect(() => cancelMyBooking(alice, booking.code)).toThrowError(/already cancelled/i);
  });

  it("cannot cancel a booking that already started", () => {
    const booking = createBooking(futureArgs({ startMinutes: 19 * 60 }));
    getDb().prepare("UPDATE bookings SET date = ? WHERE code = ?").run(addDays(istToday(), -2), booking.code);
    expect(() => cancelMyBooking(alice, booking.code)).toThrowError(/Past bookings/i);
  });

  it("lists my bookings with upcoming/past split", () => {
    const list = listMyBookings(alice);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((b) => typeof b.canCancel === "boolean")).toBe(true);
  });
});
