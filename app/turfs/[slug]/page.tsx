import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTurfDetail, discoverTurfs } from "@/server/services/turfs";
import { TurfCard } from "@/components/turf-card";
import { BookingPanel } from "@/components/booking-panel";
import { SportBadge } from "@/components/ui/badge";
import { minutesToAmPm } from "@/lib/format";
import { ApiError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const turf = getTurfDetail(slug);
    return {
      title: `${turf.name} — ${turf.area}, ${turf.city}`,
      description: turf.description.slice(0, 155),
    };
  } catch {
    return { title: "Turf not found" };
  }
}

export default async function TurfDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let turf;
  try {
    turf = getTurfDetail(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const nearby = discoverTurfs({ city: turf.city })
    .filter((t) => t.slug !== turf.slug)
    .slice(0, 3);

  const [mainImage, ...gallery] = turf.images;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-ink-soft">
        <Link href="/turfs" className="font-semibold hover:text-pitch">
          Turfs
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/turfs?city=${encodeURIComponent(turf.city)}`} className="font-semibold hover:text-pitch">
          {turf.city}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{turf.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {turf.sports.map((s) => (
              <SportBadge key={s.slug} slug={s.slug} name={s.name} />
            ))}
          </div>
          <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl">{turf.name}</h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            {turf.area}, {turf.city} · {turf.surface}
          </p>
        </div>
      </header>

      {/* gallery */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-night-soft sm:col-span-2">
          {mainImage ? (
            <Image
              src={mainImage.url}
              alt={mainImage.alt ?? turf.name}
              fill
              priority
              sizes="(min-width: 640px) 640px, 92vw"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-rows-2">
          {gallery.slice(0, 2).map((image) => (
            <div key={image.url} className="relative aspect-[16/10] overflow-hidden rounded-xl bg-night-soft">
              <Image src={image.url} alt={image.alt ?? turf.name} fill sizes="320px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div>
          <section>
            <h2 className="text-lg font-bold tracking-tight">About this turf</h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{turf.description}</p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-bold tracking-tight">Amenities</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {turf.amenities.map((amenity) => (
                <li
                  key={amenity}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink-soft"
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-pitch">
                    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {amenity}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <h3 className="eyebrow">Timings</h3>
              <p className="mt-2 text-lg font-bold">
                {minutesToAmPm(turf.openHour * 60)} – {minutesToAmPm(turf.closeHour * 60 === 1440 ? 1440 : turf.closeHour * 60)}
              </p>
              <p className="mt-1 text-[13px] text-ink-soft">Open every day · hourly slots</p>
            </div>
            <div className="card p-5">
              <h3 className="eyebrow">Location</h3>
              <p className="mt-2 text-sm font-semibold leading-snug">{turf.address}</p>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingPanel turfSlug={turf.slug} turfName={turf.name} pricePerHour={turf.pricePerHour} />
        </aside>
      </div>

      {nearby.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-tight">More turfs in {turf.city}</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.map((t) => (
              <TurfCard key={t.slug} turf={t} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
