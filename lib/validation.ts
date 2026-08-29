/**
 * Zod schemas shared by API route handlers and client-side forms, so the
 * exact same rules validate on both sides.
 */

import { z } from "zod";
import { isValidDateString } from "./time";

export const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(isValidDateString, "Not a real calendar date");

/** Indian mobile number (10 digits starting 6-9). */
export const phoneString = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name is too long"),
  email: z.email("Enter a valid email address").max(120).transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  phone: z.union([phoneString, z.literal("")]).optional().transform((v) => v || null),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const createBookingSchema = z.object({
  turfSlug: z.string().trim().min(1, "Turf is required"),
  date: dateString,
  startMinutes: z
    .number({ message: "Start time is required" })
    .int("Invalid start time")
    .min(0)
    .max(1439),
  durationHours: z.union([z.literal(1), z.literal(2)]).default(1),
});

export const availabilityQuerySchema = z.object({
  date: dateString,
});

export const turfsQuerySchema = z.object({
  sport: z.string().trim().toLowerCase().optional(),
  city: z.string().trim().max(80).optional(),
  q: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  sort: z.enum(["popular", "price-asc", "price-desc"]).default("popular"),
});

export const tournamentsQuerySchema = z.object({
  sport: z.string().trim().toLowerCase().optional(),
});

export const teamRegistrationSchema = z.object({
  teamName: z
    .string()
    .trim()
    .min(3, "Team name must be at least 3 characters")
    .max(40, "Team name must be 40 characters or fewer"),
  captainName: z
    .string()
    .trim()
    .min(2, "Captain name must be at least 2 characters")
    .max(60, "Captain name is too long"),
  contactPhone: phoneString,
  playerCount: z
    .number({ message: "Squad size is required" })
    .int("Squad size must be a whole number")
    .min(1, "At least 1 player")
    .max(30, "For squads above 30, contact us directly"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type TeamRegistrationInput = z.infer<typeof teamRegistrationSchema>;
