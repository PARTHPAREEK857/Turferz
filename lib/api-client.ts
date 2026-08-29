"use client";

import type {
  Availability,
  BookingSummary,
  SessionUser,
  Sport,
  TournamentDetail,
  TournamentListItem,
  TournamentRegistrationSummary,
  TurfDetail,
  TurfListItem,
} from "./types";

export class ApiClientError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string>;

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** Message for a given field, falling back to the general message. */
  fieldError(name: string): string | undefined {
    return this.fieldErrors?.[name];
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      ...init,
    });
  } catch {
    throw new ApiClientError(0, "NETWORK", "Can't reach the Turferz server. Check your connection and try again.");
  }
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; fieldErrors?: Record<string, string> } }).error;
    throw new ApiClientError(
      res.status,
      err?.code ?? "UNKNOWN",
      err?.message ?? "Something went wrong. Please try again.",
      err?.fieldErrors,
    );
  }
  return data as T;
}

export interface TurfQuery {
  sport?: string;
  city?: string;
  q?: string;
  maxPrice?: number;
  sort?: "popular" | "price-asc" | "price-desc";
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

export const api = {
  // auth
  me: () => request<{ user: SessionUser | null }>("/api/auth/me"),
  login: (input: { email: string; password: string }) =>
    request<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify(input) }),
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    request<{ user: SessionUser }>("/api/auth/register", { method: "POST", body: JSON.stringify(input) }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  // discovery
  sports: () => request<{ sports: Sport[] }>("/api/sports"),
  turfs: (query: TurfQuery = {}) =>
    request<{ turfs: TurfListItem[]; count: number; cities?: string[] }>(
      `/api/turfs${buildQuery(query as Record<string, string | number | undefined>)}`,
    ),
  turfDetail: (slug: string) => request<{ turf: TurfDetail }>(`/api/turfs/${slug}`),
  availability: (slug: string, date: string) =>
    request<{ availability: Availability }>(`/api/turfs/${slug}/availability${buildQuery({ date })}`),

  // bookings
  myBookings: () => request<{ bookings: BookingSummary[] }>("/api/bookings"),
  createBooking: (input: { turfSlug: string; date: string; startMinutes: number; durationHours: 1 | 2 }) =>
    request<{ booking: BookingSummary }>("/api/bookings", { method: "POST", body: JSON.stringify(input) }),
  cancelBooking: (code: string) =>
    request<{ booking: BookingSummary }>(`/api/bookings/${code}/cancel`, { method: "POST" }),

  // tournaments
  tournaments: (sport?: string) =>
    request<{ tournaments: TournamentListItem[]; count: number }>(`/api/tournaments${buildQuery({ sport })}`),
  tournamentDetail: (slug: string) => request<{ tournament: TournamentDetail }>(`/api/tournaments/${slug}`),
  registerTeam: (
    slug: string,
    input: { teamName: string; captainName: string; contactPhone: string; playerCount: number },
  ) =>
    request<{ registration: TournamentRegistrationSummary }>(`/api/tournaments/${slug}/register`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  myRegistrations: () =>
    request<{ registrations: TournamentRegistrationSummary[] }>("/api/me/tournament-registrations"),
};
