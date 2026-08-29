import Link from "next/link";
import Image from "next/image";
import { discoverTurfs, getCities } from "@/server/services/turfs";
import { listActiveSports } from "@/server/repositories/sports";
import { listUpcomingTournaments } from "@/server/services/tournaments";
import { getPlatformStats } from "@/server/services/stats";
import { TurfCard } from "@/components/turf-card";
import { TournamentCard } from "@/components/tournament-card";
import { HeroSearch } from "@/components/hero-search";
import { Button } from "@/components/ui/button";
import { SportIcon } from "@/components/sport-icon";
import { formatIst } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [sports, cities, featured, tournaments, stats] = await Promise.all([
    listActiveSports(),
    getCities(),
    discoverTurfs({ sort: "popular" }),
    listUpcomingTournaments(),
    getPlatformStats(),
  ]);

  const nextTournament = tournaments[0];

  return (
    <div>
      {/* ---------------- hero ---------------- */}
      <section className="relative overflow-hidden bg-night text-white">
        <div className="absolute inset-0 pitch-lines" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="animate-fade-up">
            <p className="eyebrow text-lime">Turf booking · Weekend tournaments</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Book the turf.
              <br />
              <span className="text-lime">Own the weekend.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70 sm:text-base">
              Cricket and football turfs by the hour with instant confirmation — plus tournaments made
              for players who play for love, not contracts.
            </p>
            <div className="mt-7 max-w-xl">
              <HeroSearch sports={sports} cities={cities} />
            </div>
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
              <Stat value={stats.turfCount} label="Turfs live" />
              <Stat value={stats.cityCount} label="Cities" />
              <Stat value={stats.bookingCount} label="Bookings made" />
              <Stat value={stats.tournamentCount} label="Tournaments open" />
            </dl>
          </div>

          <div className="relative hidden animate-fade-in lg:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10">
              <Image
                src="/images/hero-turf.jpg"
                alt="Floodlit sports turf at dusk"
                fill
                priority
                sizes="(min-width: 1024px) 520px"
                className="object-cover"
              />
            </div>
            {nextTournament ? (
              <Link
                href={`/tournaments/${nextTournament.slug}`}
                className="absolute -bottom-5 -left-6 w-72 rounded-xl border border-white/10 bg-night-soft/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur transition-transform duration-200 hover:-translate-y-1"
              >
                <p className="eyebrow text-lime">Next tournament</p>
                <p className="mt-1.5 font-bold leading-snug">{nextTournament.title}</p>
                <p className="mt-1 text-[13px] text-white/60">
                  {formatIst(nextTournament.startsAt, { weekday: true, dateStyle: "medium", time: true })}
                </p>
                <p className="mt-2 text-[13px] font-bold text-lime">
                  {nextTournament.spotsLeft > 0 ? `${nextTournament.spotsLeft} team spots left` : "Waitlist only"} →
                </p>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* ---------------- sports ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {sports.map((sport) => (
            <Link
              key={sport.slug}
              href={`/turfs?sport=${sport.slug}`}
              className="card group flex items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-pitch/40 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pitch-tint text-pitch transition-colors group-hover:bg-pitch group-hover:text-white">
                <SportIcon slug={sport.slug} className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold tracking-tight">{sport.name} turfs</span>
                <span className="mt-0.5 block text-[13px] text-ink-soft">{sport.tagline}</span>
              </span>
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-pitch">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- featured turfs ---------------- */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Popular right now</p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Turfs players love</h2>
          </div>
          <Link href="/turfs" className="hidden shrink-0 text-sm font-bold text-pitch hover:text-pitch-deep sm:block">
            View all {stats.turfCount} turfs →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.slice(0, 4).map((turf, i) => (
            <TurfCard key={turf.slug} turf={turf} priority={i === 0} />
          ))}
        </div>
        <Link href="/turfs" className="mt-6 block text-center text-sm font-bold text-pitch hover:text-pitch-deep sm:hidden">
          View all {stats.turfCount} turfs →
        </Link>
      </section>

      {/* ---------------- tournaments ---------------- */}
      <section className="border-y border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-pitch">Turferz tournaments</p>
              <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Weekend competition, recreational soul
              </h2>
              <p className="mt-2 max-w-xl text-[15px] text-ink-soft">
                Organised brackets, umpires and refs, prizes worth winning — and absolutely no trial
                videos required. Bring your squad.
              </p>
            </div>
            <Link href="/tournaments" className="hidden shrink-0 text-sm font-bold text-pitch hover:text-pitch-deep sm:block">
              All tournaments →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.slice(0, 3).map((t) => (
              <TournamentCard key={t.slug} tournament={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="eyebrow">How Turferz works</p>
        <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Playing takes 2 minutes</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Pick your slot",
              body: "Browse turfs by sport, city and price. Live availability means what you see is what you get.",
            },
            {
              title: "Book instantly",
              body: "Confirm with one tap. Your booking code is ready immediately — pay at the venue.",
            },
            {
              title: "Play & level up",
              body: "Enjoy the match, then gather a squad for a Turferz weekend tournament.",
            },
          ].map((step, i) => (
            <li key={step.title} className="card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-night font-mono text-sm font-bold text-lime">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-bold tracking-tight">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-night px-6 py-12 text-center text-white sm:px-12">
          <div className="absolute inset-0 pitch-lines" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Your squad is waiting.</h2>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-white/70">
              Book this weekend&apos;s turf in two minutes — or register your team for a tournament and
              make it a season.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/turfs">
                <Button variant="lime" size="lg" fullWidth>
                  Book a turf
                </Button>
              </Link>
              <Link href="/tournaments">
                <Button
                  size="lg"
                  fullWidth
                  className="border border-white/25 bg-transparent text-white hover:bg-white/10"
                >
                  Enter a tournament
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-2xl font-extrabold tracking-tight text-lime">{value}</dd>
      <dd className="text-[12px] font-semibold uppercase tracking-wider text-white/50">{label}</dd>
    </div>
  );
}
