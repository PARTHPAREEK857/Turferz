import { describe, expect, it } from "vitest";
import {
  addDays,
  compareDates,
  formatDateLabel,
  formatIst,
  isValidDateString,
  istDateTimeToEpochMs,
  istNow,
  labelToMinutes,
  minutesToLabel,
} from "../lib/time";

describe("time helpers", () => {
  it("computes IST now from a known UTC instant", () => {
    // 2026-08-27 18:30:00 UTC == 2026-08-28 00:00 IST
    const now = istNow(new Date("2026-08-27T18:30:00Z"));
    expect(now.date).toBe("2026-08-28");
    expect(now.minutes).toBe(0);
  });

  it("handles IST mid-afternoon", () => {
    // 09:15 UTC == 14:45 IST
    const now = istNow(new Date("2026-08-27T09:15:00Z"));
    expect(now.date).toBe("2026-08-27");
    expect(now.minutes).toBe(14 * 60 + 45);
  });

  it("converts a venue datetime to the correct epoch", () => {
    // 16:00 IST on 2026-08-29 == 10:30 UTC
    expect(istDateTimeToEpochMs("2026-08-29", 16 * 60)).toBe(Date.parse("2026-08-29T10:30:00Z"));
    // midnight IST == 18:30 UTC previous day
    expect(istDateTimeToEpochMs("2026-08-29", 0)).toBe(Date.parse("2026-08-28T18:30:00Z"));
  });

  it("validates calendar dates", () => {
    expect(isValidDateString("2026-02-28")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false); // not a real date
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("26-08-01")).toBe(false);
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("compares dates", () => {
    expect(compareDates("2026-01-01", "2026-01-02")).toBeLessThan(0);
    expect(compareDates("2026-01-02", "2026-01-02")).toBe(0);
  });

  it("formats slot labels", () => {
    expect(minutesToLabel(360)).toBe("06:00");
    expect(minutesToLabel(0)).toBe("00:00");
    expect(labelToMinutes("06:00")).toBe(360);
    expect(labelToMinutes("25:00")).toBeNull();
  });

  it("formats IST datetimes deterministically", () => {
    expect(formatIst("2026-08-29T10:30:00Z", { dateStyle: "medium" })).toContain("29");
    expect(formatIst("2026-08-29T10:30:00Z", { time: true })).toContain("4:0");
    expect(formatDateLabel("2026-08-29")).toBe("Sat, 29 Aug");
  });
});
