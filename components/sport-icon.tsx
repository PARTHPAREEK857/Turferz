/** Hand-drawn sport icons keyed by sport slug, with a generic fallback. */

export function SportIcon({ slug, className = "h-5 w-5" }: { slug?: string | null; className?: string }) {
  if (slug === "cricket") return <CricketBallIcon className={className} />;
  if (slug === "football") return <FootballIcon className={className} />;
  return <BoltIcon className={className} />;
}

export function CricketBallIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.2 5.2c2.2 1.9 3.4 4.2 3.4 6.8s-1.2 4.9-3.4 6.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M17.8 5.2c-2.2 1.9-3.4 4.2-3.4 6.8s1.2 4.9 3.4 6.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function FootballIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.6l3.8 2.8-1.5 4.5h-4.6L8.2 10.4 12 7.6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 3.2v4.4M20.7 9.6l-4.9.8M18.4 19.2l-3.8-4.3M9.4 20.6l2.2-4M4 12.2l4.2-1.8M5.6 6l2.6 4.4"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function BoltIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M13 3L5 13.5h5L10 21l8-10.5h-5L13 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
