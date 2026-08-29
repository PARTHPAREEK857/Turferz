import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <LogoMark className="h-12 w-12" />
      <p className="eyebrow mt-6">404 · Wide ball</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">That page went out of bounds</h1>
      <p className="mt-2 text-sm text-ink-soft">
        The page you&apos;re looking for doesn&apos;t exist — but there are turfs waiting.
      </p>
      <div className="mt-7 flex gap-3">
        <Link href="/turfs">
          <Button variant="secondary">Browse turfs</Button>
        </Link>
        <Link href="/">
          <Button>Go home</Button>
        </Link>
      </div>
    </div>
  );
}
