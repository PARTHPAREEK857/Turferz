"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { BookingSummary, SessionUser, TournamentRegistrationSummary } from "@/lib/types";
import { api, ApiClientError } from "@/lib/api-client";
import { formatDateLabel, formatIst } from "@/lib/time";
import { formatINR, minutesToAmPm } from "@/lib/format";
import { useAuth } from "./providers";
import { useToast } from "./ui/toast";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";
import { EmptyState } from "./ui/empty-state";
import { Badge } from "./ui/badge";

type Tab = "bookings" | "teams";

export function AccountDashboard({
  user,
  initialBookings,
  initialRegistrations,
}: {
  user: SessionUser;
  initialBookings: BookingSummary[];
  initialRegistrations: TournamentRegistrationSummary[];
}) {
  const { logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("bookings");

  const upcoming = initialBookings.filter((b) => b.isUpcoming);
  const past = initialBookings.filter((b) => !b.isUpcoming);

  return (
    <div>
      {/* profile header */}
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pitch text-xl font-bold text-white">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight">{user.name}</h1>
          <p className="text-sm text-ink-soft">
            {user.email}
            {user.phone ? ` · ${user.phone}` : ""}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
        >
          Sign out
        </Button>
      </div>

      {/* tabs */}
      <div className="mt-6 flex gap-1 rounded-xl border border-line bg-surface p-1">
        <TabButton active={tab === "bookings"} onClick={() => setTab("bookings")}>
          Bookings ({initialBookings.length})
        </TabButton>
        <TabButton active={tab === "teams"} onClick={() => setTab("teams")}>
          My teams ({initialRegistrations.length})
        </TabButton>
      </div>

      <div className="mt-5">
        {tab === "bookings" ? (
          <BookingsSection upcoming={upcoming} past={past} />
        ) : (
          <TeamsSection registrations={initialRegistrations} />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
        active ? "bg-night text-lime" : "text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function BookingsSection({ upcoming, past }: { upcoming: BookingSummary[]; past: BookingSummary[] }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="eyebrow mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming bookings"
            description="Find a turf, pick a slot, and your match is set."
            action={
              <Link href="/turfs">
                <Button>Find a turf</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((booking) => (
              <BookingRow key={booking.code} booking={booking} cancellable />
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="eyebrow mb-3">Past &amp; cancelled</h2>
        {past.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">
            Nothing here yet.
          </p>
        ) : (
          <div className="space-y-3">
            {past.map((booking) => (
              <BookingRow key={booking.code} booking={booking} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BookingRow({ booking, cancellable = false }: { booking: BookingSummary; cancellable?: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(booking.status === "CANCELLED");

  const handleCancel = async () => {
    setBusy(true);
    try {
      await api.cancelBooking(booking.code);
      setCancelled(true);
      setConfirming(false);
      toast("Booking cancelled — the slot is free again.", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Couldn't cancel. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const status = cancelled ? "CANCELLED" : booking.status;

  return (
    <div className="card flex items-stretch gap-4 overflow-hidden">
      <div className="relative hidden w-32 shrink-0 sm:block">
        {booking.turf.image ? (
          <Image src={booking.turf.image.url} alt={booking.turf.name} fill sizes="128px" className="object-cover" />
        ) : (
          <div className="h-full bg-night-soft" />
        )}
      </div>
      <div className="min-w-0 flex-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/turfs/${booking.turf.slug}`} className="font-bold tracking-tight hover:text-pitch-deep">
            {booking.turf.name}
          </Link>
          {status === "CONFIRMED" ? <Badge tone="green">Confirmed</Badge> : <Badge tone="danger">Cancelled</Badge>}
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {formatDateLabel(booking.date)} · {minutesToAmPm(booking.startMinutes)} – {minutesToAmPm(booking.endMinutes)} ·{" "}
          {booking.turf.city}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[13px] font-semibold tracking-wider text-ink-soft">{booking.code}</span>
          <span className="text-sm font-bold">{formatINR(booking.totalAmount)}</span>
        </div>
      </div>
      {cancellable && !cancelled ? (
        <div className="flex items-center pr-4">
          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-tint" onClick={() => setConfirming(true)}>
            Cancel
          </Button>
        </div>
      ) : null}

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Cancel this booking?">
        <p className="text-sm text-ink-soft">
          Your slot at <span className="font-semibold text-ink">{booking.turf.name}</span> on{" "}
          {formatDateLabel(booking.date)}, {minutesToAmPm(booking.startMinutes)} will be released to other players.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setConfirming(false)}>
            Keep booking
          </Button>
          <Button variant="danger" fullWidth loading={busy} onClick={() => void handleCancel()}>
            Cancel booking
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TeamsSection({ registrations }: { registrations: TournamentRegistrationSummary[] }) {
  if (registrations.length === 0) {
    return (
      <EmptyState
        title="No teams yet"
        description="Register a team for an upcoming weekend tournament — most fill up by Thursday."
        action={
          <Link href="/tournaments">
            <Button>See tournaments</Button>
          </Link>
        }
      />
    );
  }
  return (
    <div className="space-y-3">
      {registrations.map((reg) => (
        <div key={reg.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={`/tournaments/${reg.tournamentSlug}`} className="font-bold tracking-tight hover:text-pitch-deep">
              {reg.tournamentTitle}
            </Link>
            <Badge tone={reg.status === "CONFIRMED" ? "green" : "danger"}>{reg.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {formatIst(reg.startsAt, { weekday: true, dateStyle: "medium", time: true })}
            {reg.city ? ` · ${reg.city}` : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-paper p-3 text-sm sm:grid-cols-3">
            <div>
              <p className="eyebrow">Team</p>
              <p className="mt-0.5 font-semibold">{reg.teamName}</p>
            </div>
            <div>
              <p className="eyebrow">Captain</p>
              <p className="mt-0.5 font-semibold">{reg.captainName}</p>
            </div>
            <div>
              <p className="eyebrow">Squad</p>
              <p className="mt-0.5 font-semibold">{reg.playerCount} players</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
