"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api-client";
import type { Availability, BookingSummary, Slot } from "@/lib/types";
import { addDays, formatDateLabel, istToday } from "@/lib/time";
import { minutesToAmPm, formatINR } from "@/lib/format";
import { BOOKING_WINDOW_DAYS } from "@/lib/constants";
import { useAuth } from "./providers";
import { useToast } from "./ui/toast";
import { Button, Spinner } from "./ui/button";
import { Modal } from "./ui/modal";
import { EmptyState } from "./ui/empty-state";

const SLOT_GROUPS: { label: string; from: number; to: number }[] = [
  { label: "Morning", from: 4 * 60, to: 12 * 60 },
  { label: "Afternoon", from: 12 * 60, to: 17 * 60 },
  { label: "Evening", from: 17 * 60, to: 21 * 60 },
  { label: "Night", from: 21 * 60, to: 24 * 60 },
];

function slotGroups(slots: Slot[]) {
  return SLOT_GROUPS.map((group) => ({
    label: group.label,
    slots: slots.filter((s) => s.startMinutes >= group.from && s.startMinutes < group.to),
  })).filter((g) => g.slots.length > 0);
}

/** Can a 2-hour booking start at this slot index? */
function canBookTwoHours(slots: Slot[], index: number): boolean {
  const next = slots[index + 1];
  return !!next && next.status === "available" && slots[index].status === "available";
}

interface LoadError {
  date: string;
  message: string;
}

export function BookingPanel({
  turfSlug,
  turfName,
  pricePerHour,
}: {
  turfSlug: string;
  turfName: string;
  pricePerHour: number;
}) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [date, setDate] = useState(() => istToday());
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [duration, setDuration] = useState<1 | 2>(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<BookingSummary | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const dates = useMemo(() => {
    const today = istToday();
    return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today, i));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { availability } = await api.availability(turfSlug, date);
        if (!cancelled) {
          setAvailability(availability);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setAvailability(null);
          setLoadError({
            date,
            message: err instanceof ApiClientError ? err.message : "Couldn't load availability. Tap to retry.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [turfSlug, date, reloadToken]);

  const slots = availability && availability.date === date ? availability.slots : [];
  const loadingSlots = !loadError && (!availability || availability.date !== date);
  const showError = loadError?.date === date ? loadError.message : null;

  const selectedIndex = slots.findIndex((s) => s.startMinutes === selectedStart);
  const selectedSlot = selectedIndex >= 0 ? slots[selectedIndex] : null;
  const twoHourPossible = selectedIndex >= 0 ? canBookTwoHours(slots, selectedIndex) : false;

  const total = pricePerHour * duration;

  function chooseDate(next: string) {
    setDate(next);
    setSelectedStart(null);
    setDuration(1);
  }

  function chooseSlot(start: number) {
    setSelectedStart(start);
    setDuration(1);
  }

  function handleBookClick() {
    if (!requireAuth("Sign in to book this slot — it takes 20 seconds.")) return;
    setConfirmOpen(true);
  }

  async function confirmBooking() {
    if (selectedStart === null) return;
    setBooking(true);
    try {
      const { booking } = await api.createBooking({
        turfSlug,
        date,
        startMinutes: selectedStart,
        durationHours: duration,
      });
      setConfirmed(booking);
      setConfirmOpen(false);
      toast("Booking confirmed!", "success");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && (err.code === "SLOT_TAKEN" || err.code === "TOO_LATE")) {
        toast(err.message, "error");
        setConfirmOpen(false);
        setSelectedStart(null);
        setReloadToken((t) => t + 1);
      } else {
        toast(err instanceof ApiClientError ? err.message : "Booking failed. Please try again.", "error");
      }
    } finally {
      setBooking(false);
    }
  }

  if (confirmed) {
    return (
      <BookingConfirmed
        booking={confirmed}
        onBookAnother={() => {
          setConfirmed(null);
          setSelectedStart(null);
          setReloadToken((t) => t + 1);
        }}
      />
    );
  }

  return (
    <div className="card p-5 sm:p-6" id="book">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Book a slot</h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">{formatINR(pricePerHour)}/hour · pay at the venue</p>
        </div>
        {user ? null : (
          <span className="rounded-lg bg-paper px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Sign in to book
          </span>
        )}
      </div>

      {/* date strip */}
      <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist" aria-label="Booking date">
        {dates.map((d) => {
          const active = d === date;
          const parts = formatDateLabel(d).split(", ");
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              onClick={() => chooseDate(d)}
              className={`flex min-w-[68px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-all duration-150 ${
                active
                  ? "border-pitch bg-pitch text-white shadow-sm"
                  : "border-line-strong bg-surface text-ink hover:border-ink/30"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-white/80" : "text-ink-soft"}`}>
                {parts[0]}
              </span>
              <span className="text-base font-extrabold leading-tight">{parts[1]?.split(" ")[0]}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "text-white/80" : "text-ink-soft"}`}>
                {parts[1]?.split(" ")[1]}
              </span>
            </button>
          );
        })}
      </div>

      {/* slots */}
      <div className="mt-5">
        {loadingSlots ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft">
            <Spinner className="h-4 w-4" /> Loading availability…
          </div>
        ) : showError ? (
          <EmptyState
            title="Availability unavailable"
            description={showError}
            action={
              <Button variant="secondary" size="sm" onClick={() => setReloadToken((t) => t + 1)}>
                Retry
              </Button>
            }
          />
        ) : slots.length === 0 ? (
          <EmptyState title="No slots configured" description="This turf hasn't opened hourly slots for this date." />
        ) : (
          <div className="space-y-4">
            {slotGroups(slots).map((group) => (
              <div key={group.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="eyebrow">{group.label}</span>
                  <span className="text-[11px] font-semibold text-ink-soft">
                    {group.slots.filter((s) => s.status === "available").length} free
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {group.slots.map((slot) => {
                    const disabled = slot.status !== "available";
                    const selected = selectedStart === slot.startMinutes;
                    return (
                      <button
                        key={slot.startMinutes}
                        disabled={disabled}
                        onClick={() => chooseSlot(slot.startMinutes)}
                        title={
                          slot.status === "booked"
                            ? "Already booked"
                            : slot.status === "past"
                              ? "This slot has passed"
                              : `${minutesToAmPm(slot.startMinutes)} – ${minutesToAmPm(slot.startMinutes + 60)}`
                        }
                        className={`rounded-lg border px-1 py-2 text-[13px] font-semibold transition-all duration-150 ${
                          selected
                            ? "border-night bg-night text-lime"
                            : disabled
                              ? slot.status === "booked"
                                ? "cursor-not-allowed border-line bg-paper text-ink-soft/50 line-through decoration-ink-soft/40"
                                : "cursor-not-allowed border-line bg-paper text-ink-soft/40"
                              : "border-line-strong bg-surface text-ink hover:border-pitch active:scale-[0.97]"
                        }`}
                      >
                        {minutesToAmPm(slot.startMinutes).replace(":00", "")}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* selection summary */}
      {selectedSlot ? (
        <div className="mt-5 rounded-xl border border-line bg-paper p-4 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-bold">{formatDateLabel(date)}</span>
              <span className="text-ink-soft"> · </span>
              <span className="font-bold">
                {minutesToAmPm(selectedSlot.startMinutes)} – {minutesToAmPm(selectedSlot.startMinutes + duration * 60)}
              </span>
            </div>
            <div className="flex rounded-lg border border-line-strong bg-surface p-0.5" role="group" aria-label="Duration">
              {[1, 2].map((h) => (
                <button
                  key={h}
                  disabled={h === 2 && !twoHourPossible}
                  onClick={() => setDuration(h as 1 | 2)}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-bold transition-colors disabled:opacity-40 ${
                    duration === h ? "bg-night text-lime" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm text-ink-soft">
              {formatINR(pricePerHour)} × {duration}h
            </span>
            <span className="text-lg font-extrabold">{formatINR(total)}</span>
          </div>
          <Button size="lg" fullWidth className="mt-3" onClick={handleBookClick}>
            Book this slot
          </Button>
        </div>
      ) : null}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm booking">
        <div className="space-y-3 rounded-xl border border-line bg-paper p-4 text-sm">
          <Row label="Turf" value={turfName} />
          <Row label="Date" value={formatDateLabel(date)} />
          <Row
            label="Time"
            value={`${minutesToAmPm(selectedSlot?.startMinutes ?? 0)} – ${minutesToAmPm(
              (selectedSlot?.startMinutes ?? 0) + duration * 60,
            )}`}
          />
          <Row label="Duration" value={`${duration} hour${duration > 1 ? "s" : ""}`} />
          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="text-ink-soft">Total (pay at venue)</span>
            <span className="text-lg font-extrabold">{formatINR(total)}</span>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-ink-soft">
          Free cancellation until the slot starts. You&apos;ll get a booking code to show at the venue.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setConfirmOpen(false)}>
            Back
          </Button>
          <Button fullWidth loading={booking} onClick={() => void confirmBooking()}>
            Confirm booking
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function BookingConfirmed({ booking, onBookAnother }: { booking: BookingSummary; onBookAnother: () => void }) {
  return (
    <div className="card p-6 text-center animate-fade-up sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-night">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mt-4 text-xl font-extrabold tracking-tight">You&apos;re booked!</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Show this code at <span className="font-semibold text-ink">{booking.turf.name}</span> — payment happens at the venue.
      </p>
      <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-pitch/40 bg-pitch-tint px-6 py-3">
        <span className="font-mono text-2xl font-bold tracking-wider text-pitch-deep">{booking.code}</span>
      </div>
      <div className="mx-auto mt-5 max-w-xs space-y-2 rounded-xl border border-line bg-paper p-4 text-sm">
        <Row label="Date" value={formatDateLabel(booking.date)} />
        <Row label="Time" value={`${minutesToAmPm(booking.startMinutes)} – ${minutesToAmPm(booking.endMinutes)}`} />
        <Row label="Amount" value={`${formatINR(booking.totalAmount)} at venue`} />
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="secondary" onClick={onBookAnother}>
          Book another slot
        </Button>
        <Link href="/account">
          <Button fullWidth>View my bookings</Button>
        </Link>
      </div>
    </div>
  );
}
