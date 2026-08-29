import Image from "next/image";
import Link from "next/link";
import type { TournamentListItem } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { formatIst } from "@/lib/time";
import { Badge, SportBadge } from "./ui/badge";

export function TournamentCard({ tournament }: { tournament: TournamentListItem }) {
  return (
    <Link
      href={`/tournaments/${tournament.slug}`}
      className="card group block overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-pitch/40 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative aspect-[16/8] overflow-hidden bg-night-soft">
        {tournament.bannerUrl ? (
          <Image
            src={tournament.bannerUrl}
            alt={tournament.title}
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/10 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <SportBadge slug={tournament.sport.slug} name={tournament.sport.name} onDark />
        </div>
        {!tournament.registrationOpen ? (
          <div className="absolute right-3 top-3">
            <Badge tone="outline">{tournament.spotsLeft === 0 ? "Full" : "Closed"}</Badge>
          </div>
        ) : null}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white">
          <div className="text-[13px] font-semibold">
            <span className="block text-white/70">{formatIst(tournament.startsAt, { weekday: true, dateStyle: "medium", time: true })}</span>
            {tournament.venueName ? <span className="text-white/90">{tournament.venueName}</span> : null}
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-base font-extrabold leading-tight">{formatINR(tournament.entryFee)}</span>
            <span className="text-[11px] uppercase tracking-wide text-white/60">per team</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold tracking-tight transition-colors group-hover:text-pitch-deep">{tournament.title}</h3>
        <p className="mt-1 text-[13px] text-ink-soft">{tournament.format}</p>
        <TeamMeter registered={tournament.registeredTeams} max={tournament.maxTeams} className="mt-3" />
      </div>
    </Link>
  );
}

export function TeamMeter({
  registered,
  max,
  className = "",
}: {
  registered: number;
  max: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((registered / max) * 100));
  const left = Math.max(0, max - registered);
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        <span>
          {registered}/{max} teams
        </span>
        <span className={left === 0 ? "text-danger" : left <= Math.ceil(max * 0.2) ? "text-[#8a6116]" : "text-pitch"}>
          {left === 0 ? "Full" : `${left} spots left`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            left === 0 ? "bg-danger" : left <= Math.ceil(max * 0.2) ? "bg-[#d3a52f]" : "bg-pitch"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
