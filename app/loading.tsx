import { CardSkeletonGrid } from "@/components/ui/empty-state";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-line" />
      <div className="mt-3 h-5 w-72 animate-pulse rounded-lg bg-line" />
      <div className="mt-8">
        <CardSkeletonGrid count={6} />
      </div>
    </div>
  );
}
