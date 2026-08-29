"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">We dropped the ball</h1>
      <p className="mt-2 text-sm text-ink-soft">
        An unexpected error occurred on our side. It&apos;s been logged — please try again.
      </p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-ink-soft/60">{error.digest}</p> : null}
      <button
        onClick={reset}
        className="mt-7 h-10 rounded-lg bg-pitch px-5 text-sm font-semibold text-white transition-colors hover:bg-pitch-deep"
      >
        Try again
      </button>
    </div>
  );
}
