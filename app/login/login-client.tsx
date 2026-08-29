"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { LogoMark } from "@/components/logo";

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 sm:py-20">
      <LogoMark className="h-11 w-11" />
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-soft">Sign in to manage bookings and teams.</p>
      <div className="card mt-7 w-full p-6 sm:p-7 animate-fade-up">
        <AuthForm
          mode="login"
          onDone={() => {
            router.push(next && next.startsWith("/") ? next : "/account");
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
