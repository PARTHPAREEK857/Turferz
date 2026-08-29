import { ApiError } from "../http";
import { BOOKING_LEAD_MINUTES, MAX_ADVANCE_DAYS, SLOT_MINUTES } from "@/lib/constants";
import { addDays, compareDates, istNow, minutesToLabel } from "@/lib/time";
import type { Availability, Slot, SlotStatus } from "@/lib/types";
import { findTurfBySlug } from "../repositories/turfs";
import { findConfirmedByTurfAndDate } from "../repositories/bookings";

/**
 * Availability for one turf on one date: hourly slots between the turf's
 * open and close hours, each marked available / booked / past.
 * All "past" decisions use the venue timezone (IST).
 */
export function getAvailability(turfSlug: string, date: string): Availability {
  const turf = findTurfBySlug(turfSlug);
  if (!turf) throw ApiError.notFound("Turf not found");

  const now = istNow();
  if (compareDates(date, now.date) < 0) {
    throw new ApiError(400, "DATE_IN_PAST", "That date has already passed");
  }
  if (compareDates(date, addDays(now.date, MAX_ADVANCE_DAYS)) > 0) {
    throw new ApiError(400, "DATE_TOO_FAR", `Bookings open ${MAX_ADVANCE_DAYS} days ahead`);
  }

  const bookings = findConfirmedByTurfAndDate(turf.id, date);
  const slots: Slot[] = [];

  for (let start = turf.openHour * 60; start + SLOT_MINUTES <= turf.closeHour * 60; start += SLOT_MINUTES) {
    const end = start + SLOT_MINUTES;
    let status: SlotStatus = "available";

    if (bookings.some((b) => b.startMinutes < end && b.endMinutes > start)) {
      status = "booked";
    } else if (date === now.date && start < now.minutes + BOOKING_LEAD_MINUTES) {
      status = "past";
    }

    slots.push({
      startMinutes: start,
      startTime: minutesToLabel(start),
      endTime: minutesToLabel(end),
      status,
    });
  }

  return {
    turfSlug: turf.slug,
    date,
    openHour: turf.openHour,
    closeHour: turf.closeHour,
    slots,
  };
}
