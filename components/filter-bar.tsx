"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Sport } from "@/lib/types";
import { SportIcon } from "./sport-icon";

/** Discover-page filter bar. URL-driven so results are shareable. */
export function FilterBar({ sports, cities }: { sports: Sport[]; cities: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const activeSport = params.get("sport") ?? "";
  const activeCity = params.get("city") ?? "";
  const activeSort = params.get("sort") ?? "popular";
  const queryQ = params.get("q") ?? "";

  const [q, setQ] = useState(queryQ);

  // keep the input in sync when the URL changes (back button, clear filters):
  // adjust-state-during-render is the React-blessed pattern for derived resets.
  const [seenQueryQ, setSeenQueryQ] = useState(queryQ);
  if (seenQueryQ !== queryQ) {
    setSeenQueryQ(queryQ);
    setQ(queryQ);
  }

  function push(next: Record<string, string | undefined>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) search.delete(key);
      else search.set(key, value);
    }
    const qs = search.toString();
    router.replace(qs ? `/turfs?${qs}` : "/turfs", { scroll: false });
  }

  // debounce free-text search
  useEffect(() => {
    if (q === queryQ) return;
    const t = setTimeout(() => push({ q: q || undefined }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => push({ sport: undefined })}
          className={`rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
            !activeSport ? "border-night bg-night text-lime" : "border-line-strong bg-surface text-ink hover:border-ink/30"
          }`}
        >
          All sports
        </button>
        {sports.map((sport) => {
          const active = activeSport === sport.slug;
          return (
            <button
              key={sport.slug}
              onClick={() => push({ sport: active ? undefined : sport.slug })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
                active ? "border-night bg-night text-lime" : "border-line-strong bg-surface text-ink hover:border-ink/30"
              }`}
              aria-pressed={active}
            >
              <SportIcon slug={sport.slug} className="h-4 w-4" />
              {sport.name}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <svg viewBox="0 0 18 18" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft">
            <circle cx="7.5" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search turf or area…"
            aria-label="Search turfs"
            className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-3.5 text-[15px] placeholder:text-ink-soft/60 focus:border-pitch focus:outline-none"
          />
        </div>
        <select
          value={activeCity}
          onChange={(e) => push({ city: e.target.value || undefined })}
          aria-label="City"
          className="h-11 rounded-lg border border-line-strong bg-surface px-3 text-[15px] text-ink focus:border-pitch focus:outline-none"
        >
          <option value="">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <select
          value={activeSort}
          onChange={(e) => push({ sort: e.target.value === "popular" ? undefined : e.target.value })}
          aria-label="Sort"
          className="h-11 rounded-lg border border-line-strong bg-surface px-3 text-[15px] text-ink focus:border-pitch focus:outline-none"
        >
          <option value="popular">Sort: Recommended</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
        </select>
      </div>
    </div>
  );
}
