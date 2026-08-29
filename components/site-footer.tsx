import Link from "next/link";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-night text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <span className="text-lg font-extrabold tracking-tight">
                TURF<span className="text-lime">ERZ</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">
              Book cricket &amp; football turfs by the hour. Play in weekend tournaments built for
              recreational teams.
            </p>
          </div>
          <FooterColumn
            title="Play"
            links={[
              { href: "/turfs?sport=cricket", label: "Cricket turfs" },
              { href: "/turfs?sport=football", label: "Football turfs" },
              { href: "/turfs", label: "All turfs" },
            ]}
          />
          <FooterColumn
            title="Compete"
            links={[
              { href: "/tournaments", label: "Tournaments" },
              { href: "/account", label: "My bookings" },
              { href: "/account", label: "My teams" },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { href: "/#how-it-works", label: "How it works" },
              { href: "/tournaments", label: "Host with us" },
              { href: "mailto:hello@turferz.app", label: "Contact" },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-[13px] text-white/50 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Turferz. Built for the weekend squad.</p>
          <p className="font-mono text-white/40">v0.1 · MVP</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="eyebrow text-lime">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
