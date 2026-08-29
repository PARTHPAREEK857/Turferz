"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Sport } from "@/lib/types";
import { SportIcon } from "./sport-icon";

/** Landing-page search: sport + city → /turfs results. */
export function HeroSearch({ sports, cities }: { sports: Sport[]; cities: string[] }) {
  const router = useRouter();
  const [sport, setSport] = useState("");
  const [city, setCity] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (sport) params.set("sport", sport);
        if (city) params.set("city", city);
        router.push(`/turfs${params.toString() ? `?${params}` : ""}`);
      }}
      className="w-full"
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm sm:flex-row">
        <div className="flex flex-1 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSport("")}
            className={`rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors ${
              !sport ? "bg-lime text-night" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            All
          </button>
          {sports.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => setSport(sport === s.slug ? "" : s.slug)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors ${
                sport === s.slug ? "bg-lime text-night" : "bg-white/10 text-white hover:bg-white/20"
              }`}
              aria-pressed={sport === s.slug}
            >
              <SportIcon slug={s.slug} className="h-4 w-4" />
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex flex-1 gap-2">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="City"
            className="h-11 flex-1 rounded-xl border border-white/15 bg-night px-3 text-sm font-semibold text-white focus:outline-none"
          >
            <option value="">Any city</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-11 shrink-0 rounded-xl bg-lime px-5 text-sm font-bold text-night transition-transform duration-150 hover:bg-lime-deep active:scale-[0.98]"
          >
            Find turfs
          </button>
        </div>
      </div>
    </form>
  );
}
