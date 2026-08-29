import Image from "next/image";
import Link from "next/link";
import type { TurfListItem } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { SportBadge } from "./ui/badge";

export function TurfCard({ turf, priority = false }: { turf: TurfListItem; priority?: boolean }) {
  return (
    <Link
      href={`/turfs/${turf.slug}`}
      className="card group block overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-pitch/40 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-night-soft">
        {turf.image ? (
          <Image
            src={turf.image.url}
            alt={turf.image.alt ?? turf.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 350px, (min-width: 640px) 45vw, 92vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/30">Turferz</div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {turf.sports.map((sport) => (
            <SportBadge key={sport.slug} slug={sport.slug} name={sport.name} onDark />
          ))}
        </div>
        <div className="absolute bottom-3 right-3 rounded-lg bg-night/85 px-2.5 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
          {formatINR(turf.pricePerHour)}
          <span className="font-medium text-white/60">/hr</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold tracking-tight transition-colors group-hover:text-pitch-deep">{turf.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0">
            <path d="M8 14.5s5-4.6 5-8.5a5 5 0 1 0-10 0c0 3.9 5 8.5 5 8.5z" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          {turf.area}, {turf.city}
        </p>
        <p className="mt-2 line-clamp-1 text-[13px] text-ink-soft/80">{turf.surface}</p>
      </div>
    </Link>
  );
}
