import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournamentDetail } from "@/server/services/tournaments";
import { getServerSessionUser } from "@/server/auth/current-user";
import { RegisterTeamPanel } from "@/components/register-team-panel";
import { SportBadge, Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { formatIst } from "@/lib/time";
import { ApiError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const tournament = getTournamentDetail(slug, null);
    return { title: tournament.title, description: tournament.description.slice(0, 155) };
  } catch {
    return { title: "Tournament not found" };
  }
}

export default async function TournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getServerSessionUser();

  let tournament;
  try {
    tournament = getTournamentDetail(slug, user);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div>
      {/* banner */}
      <div className="relative h-56 overflow-hidden bg-night sm:h-72">
        {tournament.bannerUrl ? (
          <Image src={tournament.bannerUrl} alt={tournament.title} fill priority sizes="100vw" className="object-cover opacity-80" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <SportBadge slug={tournament.sport.slug} name={tournament.sport.name} onDark />
              <Badge tone="outline">{tournament.format}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
              {tournament.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div>
            {/* facts */}
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Fact label="Match day">
                {formatIst(tournament.startsAt, { dateStyle: "medium" })}
                <span className="block text-[13px] font-medium text-ink-soft">
                  {formatIst(tournament.startsAt, { time: true })} – {formatIst(tournament.endsAt, { time: true })}
                </span>
              </Fact>
              <Fact label="Entry fee">
                {formatINR(tournament.entryFee)}
                <span className="block text-[13px] font-medium text-ink-soft">per team</span>
              </Fact>
              <Fact label="Squad size">
                {tournament.minPlayers}–{tournament.maxPlayers}
                <span className="block text-[13px] font-medium text-ink-soft">players</span>
              </Fact>
              <Fact label="Registration closes">
                {formatIst(tournament.registrationDeadline, { dateStyle: "medium" })}
                <span className="block text-[13px] font-medium text-ink-soft">
                  {formatIst(tournament.registrationDeadline, { time: true })}
                </span>
              </Fact>
            </dl>

            <section className="mt-8">
              <h2 className="text-lg font-bold tracking-tight">Format &amp; rules</h2>
              <p className="mt-2.5 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
                {tournament.description}
              </p>
            </section>

            <section className="mt-8 card p-5">
              <h2 className="text-lg font-bold tracking-tight">Prizes</h2>
              <p className="mt-2 text-[15px] font-semibold text-pitch-deep">{tournament.prizeDetails}</p>
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-bold tracking-tight">Venue</h2>
              <div className="card mt-3 p-5">
                {tournament.venueName ? (
                  <>
                    <p className="font-bold">{tournament.venueName}</p>
                    <p className="mt-1 text-sm text-ink-soft">{tournament.venueAddress}</p>
                    <Link
                      href="/turfs"
                      className="mt-3 inline-block text-sm font-bold text-pitch hover:text-pitch-deep"
                    >
                      Book practice slots at this turf →
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-ink-soft">Venue announced to registered teams before match day.</p>
                )}
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <RegisterTeamPanel tournament={tournament} initialRegistration={tournament.myRegistration} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 text-[15px] font-bold">{children}</dd>
    </div>
  );
}
