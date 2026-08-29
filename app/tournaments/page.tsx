import type { Metadata } from "next";
import Link from "next/link";
import { listUpcomingTournaments } from "@/server/services/tournaments";
import { listActiveSports } from "@/server/repositories/sports";
import { TournamentCard } from "@/components/tournament-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SportIcon } from "@/components/sport-icon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Weekend cricket and football tournaments for recreational teams.",
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = await searchParams;
  const [sports, tournaments] = await Promise.all([listActiveSports(), listUpcomingTournaments(sport)]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="eyebrow text-pitch">Turferz tournaments</p>
        <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Weekend tournaments</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] text-ink-soft">
          Organised competition for recreational squads. Referees and umpires included, prizes worth
          winning, and a fixture list delivered before match day.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/tournaments"
          className={`rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
            !sport ? "border-night bg-night text-lime" : "border-line-strong bg-surface text-ink hover:border-ink/30"
          }`}
        >
          All sports
        </Link>
        {sports.map((s) => (
          <Link
            key={s.slug}
            href={`/tournaments?sport=${s.slug}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
              sport === s.slug ? "border-night bg-night text-lime" : "border-line-strong bg-surface text-ink hover:border-ink/30"
            }`}
          >
            <SportIcon slug={s.slug} className="h-4 w-4" />
            {s.name}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {tournaments.length === 0 ? (
          <EmptyState
            title="No tournaments right now"
            description="New tournaments are announced every week — check back soon, or grab a turf slot meanwhile."
            action={
              <Link href="/turfs">
                <Button variant="secondary">Book a turf instead</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <TournamentCard key={t.slug} tournament={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
