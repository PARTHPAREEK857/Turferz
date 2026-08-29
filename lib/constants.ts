/** Shared constants used by both client and server code. */

export const SESSION_COOKIE = "turferz_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Turf bookings are venue-local (IST) regardless of server timezone. */
export const VENUE_TIMEZONE = "Asia/Kolkata";

/** Hourly slots. */
export const SLOT_MINUTES = 60;
export const MAX_DURATION_HOURS = 2;

/** How far ahead users can book. */
export const MAX_ADVANCE_DAYS = 30;

/** Minimum lead time before a slot starts for a new booking (minutes). */
export const BOOKING_LEAD_MINUTES = 30;

/** How many days of dates the booking UI offers. */
export const BOOKING_WINDOW_DAYS = 14;

export const DEFAULT_SPORTS = ["cricket", "football"] as const;
