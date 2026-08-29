import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0d1410" />
      <rect x="12" y="12" width="40" height="40" rx="4" fill="none" stroke="#c9f04d" strokeWidth="4" />
      <line x1="32" y1="12" x2="32" y2="52" stroke="#c9f04d" strokeWidth="3" strokeDasharray="4 5" />
      <circle cx="32" cy="32" r="4.5" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Turferz home">
      <LogoMark className="h-8 w-8 transition-transform duration-200 group-hover:scale-105" />
      <span className="text-lg font-extrabold tracking-tight text-ink">
        TURF<span className="text-pitch">ERZ</span>
      </span>
      {compact ? null : null}
    </Link>
  );
}
