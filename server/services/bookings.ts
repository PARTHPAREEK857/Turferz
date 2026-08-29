import { ApiError } from "../http";
import { BOOKING_LEAD_MINUTES, MAX_ADVANCE_DAYS, SLOT_MINUTES } from "@/lib/constants";
import { addDays, compareDates, istDateTimeToEpochMs, istNow, minutesToLabel } from "@/lib/time";
import type { BookingSummary, SessionUser } from "@/lib/types";
import { withTransaction } from "../db/client";
import {
  SlotTakenError,
  findBookingWithTurfByCode,
  findOverlapping,
  insertBooking,
  listBookingsByUser,
  updateBookingStatus,
  type BookingWithTurf,
} from "../repositories/bookings";
import { findTurfBySlug } from "../repositories/turfs";

/** Human-friendly booking code, e.g. TZ-7GK3QP (no ambiguous chars). */
function generateBookingCode(): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let suffix = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
  return `TZ-${suffix}`;
}

export interface CreateBookingArgs {
  user: SessionUser;
  turfSlug: string;
  date: string;
  startMinutes: number;
  durationHours: number;
}

/**
 * Create a booking with full validation and atomic conflict prevention:
 *   1. validate slot shape against the turf's opening hours
 *   2. reject past dates / insufficient lead time (venue timezone)
 *   3. inside a write transaction, re-check conflicts and insert
 *   4. the database trigger trg_bookings_no_overlap_insert is the final guard
 */
export function createBooking(args: CreateBookingArgs): BookingSummary {
  const turf = findTurfBySlug(args.turfSlug);
  if (!turf) throw ApiError.notFound("Turf not found");

  const duration = args.durationHours;
  if (![1, 2].includes(duration)) {
    throw new ApiError(400, "INVALID_DURATION", "Duration must be 1 or 2 hours");
  }

  const start = args.startMinutes;
  const end = start + duration * SLOT_MINUTES;

  if (start % SLOT_MINUTES !== 0) {
    throw new ApiError(400, "INVALID_SLOT", "Start time must align with an hourly slot");
  }
  if (start < turf.openHour * 60) {
    throw new ApiError(400, "INVALID_SLOT", `Turf opens at ${minutesToLabel(turf.openHour * 60)}`);
  }
  if (end > turf.closeHour * 60) {
    throw new ApiError(400, "INVALID_SLOT", `Turf closes at ${minutesToLabel(turf.closeHour * 60)}`);
  }

  const now = istNow();
  if (compareDates(args.date, now.date) < 0) {
    throw new ApiError(400, "DATE_IN_PAST", "That date has already passed");
  }
  if (compareDates(args.date, addDays(now.date, MAX_ADVANCE_DAYS)) > 0) {
    throw new ApiError(400, "DATE_TOO_FAR", `Bookings open ${MAX_ADVANCE_DAYS} days ahead`);
  }
  if (args.date === now.date && start < now.minutes + BOOKING_LEAD_MINUTES) {
    throw new ApiError(
      400,
      "TOO_LATE",
      `Slots must be at least ${BOOKING_LEAD_MINUTES} minutes ahead — pick a later slot`,
    );
  }

  const totalAmount = turf.pricePerHour * duration;

  try {
    const booking = withTransaction(() => {
      const clash = findOverlapping(turf.id, args.date, start, end);
      if (clash.length > 0) {
        throw new ApiError(
          409,
          "SLOT_TAKEN",
          "That slot was just booked by someone else. Please pick another slot.",
        );
      }
      return insertBooking({
        code: generateBookingCode(),
        userId: args.user.id,
        turfId: turf.id,
        sportId: null,
        date: args.date,
        startMinutes: start,
        endMinutes: end,
        totalAmount,
        notes: null,
      });
    });

    return toSummary({
      ...booking,
      turf: {
        slug: turf.slug,
        name: turf.name,
        city: turf.city,
        area: turf.area,
        image: turf.images[0] ?? null,
      },
    });
  } catch (err) {
    if (err instanceof SlotTakenError) {
      throw new ApiError(409, "SLOT_TAKEN", "That slot was just booked by someone else. Please pick another slot.");
    }
    throw err;
  }
}

export function toSummary(row: BookingWithTurf): BookingSummary {
  const now = istNow();
  const startEpoch = istDateTimeToEpochMs(row.date, row.startMinutes);
  const isUpcoming = row.status === "CONFIRMED" && startEpoch > now.epochMs;
  return {
    code: row.code,
    status: row.status,
    date: row.date,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
    totalAmount: row.totalAmount,
    createdAt: row.createdAt,
    turf: {
      slug: row.turf.slug,
      name: row.turf.name,
      city: row.turf.city,
      area: row.turf.area,
      image: row.turf.image,
    },
    canCancel: isUpcoming,
    isUpcoming,
  };
}

export function listMyBookings(user: SessionUser): BookingSummary[] {
  return listBookingsByUser(user.id).map(toSummary);
}

export function getMyBooking(user: SessionUser, code: string): BookingSummary {
  const row = findBookingWithTurfByCode(code);
  if (!row || row.userId !== user.id) {
    throw ApiError.notFound("Booking not found");
  }
  return toSummary(row);
}

/** Cancel a booking that has not started yet. */
export function cancelMyBooking(user: SessionUser, code: string): BookingSummary {
  const row = findBookingWithTurfByCode(code);
  if (!row || row.userId !== user.id) {
    throw ApiError.notFound("Booking not found");
  }
  if (row.status === "CANCELLED") {
    throw new ApiError(409, "ALREADY_CANCELLED", "This booking is already cancelled");
  }
  const startEpoch = istDateTimeToEpochMs(row.date, row.startMinutes);
  if (startEpoch <= istNow().epochMs) {
    throw new ApiError(409, "TOO_LATE_TO_CANCEL", "Past bookings cannot be cancelled");
  }
  const updated = updateBookingStatus(row.id, "CANCELLED");
  return toSummary({ ...(updated ?? row), turf: row.turf });
}
