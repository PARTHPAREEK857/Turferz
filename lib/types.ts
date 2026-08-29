/** Domain types shared across API responses, services, and UI. */

export type Role = "USER" | "ADMIN";
export type BookingStatus = "CONFIRMED" | "CANCELLED";
export type SlotStatus = "available" | "booked" | "past";
export type TournamentStatus = "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
export type RegistrationStatus = "CONFIRMED" | "CANCELLED";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
}

export interface Sport {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  icon: string | null;
}

export interface TurfImage {
  url: string;
  alt: string | null;
}

export interface TurfListItem {
  id: string;
  slug: string;
  name: string;
  city: string;
  area: string;
  surface: string;
  pricePerHour: number;
  sports: { slug: string; name: string }[];
  image: TurfImage | null;
}

export interface TurfDetail extends TurfListItem {
  address: string;
  description: string;
  openHour: number;
  closeHour: number;
  amenities: string[];
  images: TurfImage[];
}

export interface Slot {
  startMinutes: number;
  /** '06:00' */
  startTime: string;
  /** '07:00' */
  endTime: string;
  status: SlotStatus;
}

export interface Availability {
  turfSlug: string;
  date: string;
  openHour: number;
  closeHour: number;
  slots: Slot[];
}

export interface BookingSummary {
  code: string;
  status: BookingStatus;
  date: string;
  startMinutes: number;
  endMinutes: number;
  totalAmount: number;
  createdAt: string;
  turf: {
    slug: string;
    name: string;
    city: string;
    area: string;
    image: TurfImage | null;
  };
  /** server-computed: can the current user still cancel this booking */
  canCancel: boolean;
  isUpcoming: boolean;
}

export interface TournamentListItem {
  slug: string;
  title: string;
  sport: { slug: string; name: string };
  city: string | null;
  venueName: string | null;
  startsAt: string;
  endsAt: string;
  entryFee: number;
  format: string;
  maxTeams: number;
  registeredTeams: number;
  spotsLeft: number;
  bannerUrl: string | null;
  registrationDeadline: string;
  registrationOpen: boolean;
}

export interface TournamentDetail extends TournamentListItem {
  description: string;
  prizeDetails: string;
  venueAddress: string | null;
  minPlayers: number;
  maxPlayers: number;
  /** set when the requesting user has an active registration */
  myRegistration: TournamentRegistrationSummary | null;
}

export interface TournamentRegistrationSummary {
  id: string;
  tournamentSlug: string;
  tournamentTitle: string;
  city: string | null;
  startsAt: string;
  teamName: string;
  captainName: string;
  contactPhone: string;
  playerCount: number;
  status: RegistrationStatus;
  createdAt: string;
}
