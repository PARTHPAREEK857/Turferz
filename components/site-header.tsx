"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./providers";
import { Logo } from "./logo";
import { Button } from "./ui/button";

const NAV = [
  { href: "/turfs", label: "Find turfs" },
  { href: "/tournaments", label: "Tournaments" },
];

export function SiteHeader() {
  const { user, loading, logout, openAuth } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive(item.href) ? "bg-pitch-tint text-pitch-deep" : "text-ink-soft hover:bg-paper hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2.5 md:flex">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-line" />
          ) : user ? (
            <>
              <Link
                href="/account"
                className={`flex items-center gap-2 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold transition-colors hover:border-ink/30 ${
                  isActive("/account") ? "bg-pitch-tint text-pitch-deep" : "bg-surface"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pitch text-[11px] font-bold text-white">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                {user.name.split(" ")[0]}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => openAuth("login")}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => openAuth("register")}>
                Get started
              </Button>
            </>
          )}
        </div>

        {/* mobile */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            <Link
              href="/account"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-pitch text-sm font-bold text-white"
              aria-label="My account"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </Link>
          ) : null}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-surface"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
              {menuOpen ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-line bg-surface px-4 py-4 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  isActive(item.href) ? "bg-pitch-tint text-pitch-deep" : "text-ink hover:bg-paper"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-paper"
                >
                  My bookings
                </Link>
                <button
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ink-soft hover:bg-paper"
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                    router.push("/");
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" fullWidth onClick={() => { setMenuOpen(false); openAuth("login"); }}>
                  Sign in
                </Button>
                <Button fullWidth onClick={() => { setMenuOpen(false); openAuth("register"); }}>
                  Get started
                </Button>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
