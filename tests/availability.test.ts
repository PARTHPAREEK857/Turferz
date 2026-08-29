import { describe, expect, it } from "vitest";
import { getAvailability } from "../server/services/availability";
import { insertBooking } from "../server/repositories/bookings";
import { getDb } from "../server/db/client";
import { ApiError } from "../server/http";
import { addDays, istToday } from "../lib/time";
import { IDS } from "./fixtures";

describe("availability service", () => {
  it("generates hourly slots for the full open window", () => {
    const tomorrow = addDays(istToday(), 1);
    const availability = getAvailability("test-turf", tomorrow);
    expect(availability.slots).toHaveLength(24); // 0:00 .. 23:00
    expect(availability.slots[0]).toMatchObject({ startMinutes: 0, status: "available" });
    expect(availability.slots[23]).toMatchObject({ startMinutes: 1380, status: "available" });
  });

  it("marks slots covered by confirmed bookings as booked", () => {
    const day = addDays(istToday(), 2);
    insertBooking({
      code: "TZ-AVAIL1",
      userId: IDS.alice,
      turfId: IDS.turf,
      sportId: null,
      date: day,
      startMinutes: 10 * 60,
      endMinutes: 11 * 60,
      totalAmount: 1000,
      notes: null,
    });
    const availability = getAvailability("test-turf", day);
    const slot10 = availability.slots.find((s) => s.startMinutes === 600)!;
    const slot11 = availability.slots.find((s) => s.startMinutes === 660)!;
    expect(slot10.status).toBe("booked");
    expect(slot11.status).toBe("available");
  });

  it("ignores cancelled bookings when marking availability", () => {
    const day = addDays(istToday(), 3);
    insertBooking({
      code: "TZ-AVAIL2",
      userId: IDS.alice,
      turfId: IDS.turf,
      sportId: null,
      date: day,
      startMinutes: 12 * 60,
      endMinutes: 13 * 60,
      totalAmount: 1000,
      notes: null,
    });
    getDb().prepare("UPDATE bookings SET status = 'CANCELLED' WHERE code = 'TZ-AVAIL2'").run();
    const availability = getAvailability("test-turf", day);
    const slot12 = availability.slots.find((s) => s.startMinutes === 720)!;
    expect(slot12.status).toBe("available");
  });

  it("marks same-day slots inside the lead window as past", () => {
    const availability = getAvailability("test-turf", istToday());
    // the 00:00 slot is always within the 30-minute lead time
    expect(availability.slots[0].status).not.toBe("available");
  });

  it("respects each turf's opening hours", () => {
    const availability = getAvailability("test-turf-alt", addDays(istToday(), 1));
    expect(availability.slots).toHaveLength(14); // 8:00 .. 21:00
    expect(availability.openHour).toBe(8);
    expect(availability.closeHour).toBe(22);
  });

  it("rejects past dates and dates beyond the booking window", () => {
    expect(() => getAvailability("test-turf", addDays(istToday(), -1))).toThrowError(ApiError);
    expect(() => getAvailability("test-turf", addDays(istToday(), 31))).toThrowError(/days ahead/);
  });

  it("404s for unknown turfs", () => {
    expect(() => getAvailability("no-such-turf", addDays(istToday(), 1))).toThrowError(/not found/i);
  });
});
