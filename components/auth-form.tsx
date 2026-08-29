"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { SessionUser } from "@/lib/types";
import { loginSchema, registerSchema } from "@/lib/validation";
import { Button } from "./ui/button";
import { Field, FormError, Input, useFieldId } from "./ui/field";

/**
 * Shared login/register form. Validates with the same Zod schemas the API
 * uses, so users see identical rules on client and server.
 */
export function AuthForm({
  mode,
  onModeChange,
  onDone,
  compact = false,
}: {
  mode: "login" | "register";
  onModeChange?: (mode: "login" | "register") => void;
  onDone: (user: SessionUser) => void | Promise<void>;
  compact?: boolean;
}) {
  const [values, setValues] = useState({ name: "", email: "", password: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameId = useFieldId("name");
  const emailId = useFieldId("email");
  const passwordId = useFieldId("password");
  const phoneId = useFieldId("phone");

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
    setFormError(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload =
      mode === "login"
        ? { email: values.email, password: values.password }
        : { name: values.name, email: values.email, password: values.password, phone: values.phone || undefined };

    const schema = mode === "login" ? loginSchema : registerSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join(".") || "form";
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const { user } = await api.login(parsed.data as { email: string; password: string });
        await onDone(user);
      } else {
        const { user } = await api.register(
          parsed.data as { name: string; email: string; password: string; phone?: string },
        );
        await onDone(user);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError message={formError} />

      {mode === "register" ? (
        <Field label="Full name" required error={fieldErrors.name} htmlFor={nameId}>
          <Input
            id={nameId}
            value={values.name}
            onChange={set("name")}
            placeholder="Aarav Sharma"
            autoComplete="name"
            invalid={!!fieldErrors.name}
          />
        </Field>
      ) : null}

      <Field label="Email" required error={fieldErrors.email} htmlFor={emailId}>
        <Input
          id={emailId}
          type="email"
          value={values.email}
          onChange={set("email")}
          placeholder="you@example.com"
          autoComplete="email"
          invalid={!!fieldErrors.email}
        />
      </Field>

      <Field
        label="Password"
        required
        error={fieldErrors.password}
        htmlFor={passwordId}
        hint={mode === "register" ? "At least 8 characters" : undefined}
      >
        <Input
          id={passwordId}
          type="password"
          value={values.password}
          onChange={set("password")}
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          invalid={!!fieldErrors.password}
        />
      </Field>

      {mode === "register" ? (
        <Field label="Mobile number" error={fieldErrors.phone} htmlFor={phoneId} hint="For turf & tournament updates">
          <Input
            id={phoneId}
            type="tel"
            inputMode="numeric"
            value={values.phone}
            onChange={set("phone")}
            placeholder="9876543210"
            autoComplete="tel"
            invalid={!!fieldErrors.phone}
          />
        </Field>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={busy}>
        {mode === "login" ? "Sign in" : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        {mode === "login" ? (
          <>
            New to Turferz?{" "}
            {onModeChange ? (
              <button
                type="button"
                className="font-semibold text-pitch hover:text-pitch-deep"
                onClick={() => onModeChange("register")}
              >
                Create an account
              </button>
            ) : (
              <Link href="/register" className="font-semibold text-pitch hover:text-pitch-deep">
                Create an account
              </Link>
            )}
          </>
        ) : (
          <>
            Already have an account?{" "}
            {onModeChange ? (
              <button
                type="button"
                className="font-semibold text-pitch hover:text-pitch-deep"
                onClick={() => onModeChange("login")}
              >
                Sign in
              </button>
            ) : (
              <Link href="/login" className="font-semibold text-pitch hover:text-pitch-deep">
                Sign in
              </Link>
            )}
          </>
        )}
      </p>

      {!compact && mode === "login" ? (
        <p className="rounded-lg bg-paper px-3.5 py-2.5 text-center text-[13px] text-ink-soft">
          Demo account — <span className="font-mono font-semibold text-ink">demo@turferz.app</span> /{" "}
          <span className="font-mono font-semibold text-ink">demo1234</span>
        </p>
      ) : null}
    </form>
  );
}
