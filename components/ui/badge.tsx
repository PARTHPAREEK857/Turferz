import { SportIcon } from "../sport-icon";

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "lime" | "outline" | "danger" | "amber";
  className?: string;
}) {
  const tones = {
    neutral: "bg-paper text-ink-soft border border-line",
    green: "bg-pitch-tint text-pitch-deep border border-pitch/20",
    lime: "bg-lime text-night border border-lime",
    outline: "bg-surface/80 text-white border border-white/25 backdrop-blur-sm",
    danger: "bg-danger-tint text-danger border border-danger/20",
    amber: "bg-amber-tint text-[#8a6116] border border-[#eadfc2]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function SportBadge({
  slug,
  name,
  onDark = false,
}: {
  slug: string;
  name: string;
  onDark?: boolean;
}) {
  return onDark ? (
    <Badge tone="outline">
      <SportIcon slug={slug} className="h-3.5 w-3.5" />
      {name}
    </Badge>
  ) : (
    <Badge tone="green">
      <SportIcon slug={slug} className="h-3.5 w-3.5" />
      {name}
    </Badge>
  );
}
