import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterClient } from "./register-client";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterClient />
    </Suspense>
  );
}
