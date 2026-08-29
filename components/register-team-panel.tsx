"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { TournamentDetail, TournamentRegistrationSummary } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { formatIst } from "@/lib/time";
import { useAuth } from "./providers";
import { useToast } from "./ui/toast";
import { Button } from "./ui/button";
import { Field, FormError, Input, useFieldId } from "./ui/field";
import { TeamMeter } from "./tournament-card";

/**
 * Tournament registration: full team form with live validation, guards for
 * closed/full tournaments, and a confirmed state for already-registered users.
 */
export function RegisterTeamPanel({
  tournament,
  initialRegistration,
}: {
  tournament: TournamentDetail;
  initialRegistration: TournamentRegistrationSummary | null;
}) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [registration, setRegistration] = useState(initialRegistration);
  const [values, setValues] = useState({ teamName: "", captainName: "", contactPhone: "", playerCount: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const teamId = useFieldId("team");
  const captainId = useFieldId("captain");
  const phoneId = useFieldId("phone");
  const squadId = useFieldId("squad");

  const closed = !tournament.registrationOpen;
  const full = tournament.spotsLeft === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAuth("Sign in to register your team.")) return;

    setFormError(null);
    setFieldErrors({});
    const payload = {
      teamName: values.teamName,
      captainName: values.captainName || user?.name || "",
      contactPhone: values.contactPhone || user?.phone || "",
      playerCount: values.playerCount === "" ? NaN : Number(values.playerCount),
    };

    const { teamRegistrationSchema } = await import("@/lib/validation");
    const parsed = teamRegistrationSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join(".") || "form";
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      if (errs.playerCount?.includes("between") || payload.playerCount < tournament.minPlayers || payload.playerCount > tournament.maxPlayers) {
        setFieldErrors((prev) => ({
          ...prev,
          playerCount: `Enter between ${tournament.minPlayers} and ${tournament.maxPlayers}`,
        }));
      }
      return;
    }

    setBusy(true);
    try {
      const { registration } = await api.registerTeam(tournament.slug, parsed.data);
      setRegistration(registration);
      toast(`${parsed.data.teamName} is in!`, "success");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        if (err.fieldErrors) setFieldErrors(err.fieldErrors);
        if (err.code === "TOURNAMENT_FULL") router.refresh();
      } else {
        setFormError("Registration failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (registration) {
    return (
      <div className="card p-6 text-center animate-fade-up" data-testid="registration-confirmed">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lime">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-night">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-3 text-lg font-extrabold tracking-tight">{registration.teamName} is registered!</h2>
        <p className="mt-1 text-sm text-ink-soft">
          We&apos;ll reach out on <span className="font-semibold text-ink">{registration.contactPhone}</span> with fixtures
          and payment details before the tournament.
        </p>
        <dl className="mt-4 space-y-2 rounded-xl border border-line bg-paper p-4 text-left text-sm">
          <SummaryRow label="Captain" value={registration.captainName} />
          <SummaryRow label="Squad size" value={`${registration.playerCount} players`} />
          <SummaryRow label="Entry fee" value={`${formatINR(tournament.entryFee)} per team`} />
          <SummaryRow label="Tournament day" value={formatIst(tournament.startsAt, { weekday: true, dateStyle: "medium", time: true })} />
        </dl>
        <Link href="/account" className="mt-4 block">
          <Button variant="secondary" fullWidth>
            View my teams
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-6" id="register">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Register your team</h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {formatINR(tournament.entryFee)} per team · pay after confirmation
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            closed ? "bg-danger-tint text-danger" : "bg-pitch-tint text-pitch-deep"
          }`}
        >
          {closed ? (full ? "Full" : "Closed") : "Open"}
        </span>
      </div>

      <TeamMeter registered={tournament.registeredTeams} max={tournament.maxTeams} className="mt-4" />

      {closed ? (
        <div className="mt-5 rounded-xl bg-paper p-4 text-sm text-ink-soft">
          {full
            ? "Every team slot is taken. Join the waitlist by following the next edition — new tournaments drop every week."
            : `Registrations closed on ${formatIst(tournament.registrationDeadline, { dateStyle: "medium", time: true })}.`}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <FormError message={formError} />
          <Field label="Team name" required error={fieldErrors.teamName} htmlFor={teamId}>
            <Input
              id={teamId}
              value={values.teamName}
              onChange={(e) => setValues((v) => ({ ...v, teamName: e.target.value }))}
              placeholder="e.g. Lokhandwala Lions"
              invalid={!!fieldErrors.teamName}
            />
          </Field>
          <Field label="Captain" required error={fieldErrors.captainName} htmlFor={captainId}>
            <Input
              id={captainId}
              value={values.captainName || user?.name || ""}
              onChange={(e) => setValues((v) => ({ ...v, captainName: e.target.value }))}
              placeholder="Captain name"
              invalid={!!fieldErrors.captainName}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile" required error={fieldErrors.contactPhone} htmlFor={phoneId}>
              <Input
                id={phoneId}
                type="tel"
                inputMode="numeric"
                value={values.contactPhone || user?.phone || ""}
                onChange={(e) => setValues((v) => ({ ...v, contactPhone: e.target.value }))}
                placeholder="9876543210"
                invalid={!!fieldErrors.contactPhone}
              />
            </Field>
            <Field
              label="Squad size"
              required
              error={fieldErrors.playerCount}
              htmlFor={squadId}
              hint={`${tournament.minPlayers}–${tournament.maxPlayers}`}
            >
              <Input
                id={squadId}
                type="number"
                inputMode="numeric"
                min={tournament.minPlayers}
                max={tournament.maxPlayers}
                value={values.playerCount}
                onChange={(e) => setValues((v) => ({ ...v, playerCount: e.target.value }))}
                placeholder={String(tournament.minPlayers)}
                invalid={!!fieldErrors.playerCount}
              />
            </Field>
          </div>
          <Button type="submit" size="lg" fullWidth loading={busy}>
            Register {formatINR(tournament.entryFee)} team
          </Button>
          <p className="text-center text-[13px] text-ink-soft">
            No payment now — we confirm your slot first, then collect the entry fee.
          </p>
        </form>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
