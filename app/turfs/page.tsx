import type { Metadata } from "next";
import Link from "next/link";
import { discoverTurfs, getCities } from "@/server/services/turfs";
import { listActiveSports } from "@/server/repositories/sports";
import { TurfCard } from "@/components/turf-card";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find turfs",
  description: "Browse cricket and football turfs with live hourly availability.",
};

interface SearchParams {
  sport?: string;
  city?: string;
  q?: string;
  maxPrice?: string;
  sort?: string;
}

export default async function TurfsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sort =
    params.sort === "price-asc" || params.sort === "price-desc" ? params.sort : "popular";

  const [sports, cities, turfs] = await Promise.all([
    listActiveSports(),
    getCities(),
    discoverTurfs({
      sportSlug: params.sport || undefined,
      city: params.city || undefined,
      q: params.q || undefined,
      maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
      sort,
    }),
  ]);

  const hasFilters = !!(params.sport || params.city || params.q);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Find your turf</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          {turfs.length > 0
            ? `${turfs.length} turf${turfs.length === 1 ? "" : "s"} ${hasFilters ? "matching your filters" : "ready to book"}`
            : "No matches — try widening your search"}
        </p>
      </header>

      <FilterBar sports={sports} cities={cities} />

      <div className="mt-6">
        {turfs.length === 0 ? (
          <EmptyState
            title="No turfs found"
            description="Try removing a filter or searching a different area — we're adding turfs every week."
            action={
              <Link href="/turfs">
                <Button variant="secondary">Clear filters</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {turfs.map((turf, i) => (
              <TurfCard key={turf.slug} turf={turf} priority={i < 3} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
