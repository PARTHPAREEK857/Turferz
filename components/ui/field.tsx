"use client";

import { forwardRef, useId } from "react";

export function Field({
  label,
  error,
  hint,
  required,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink">
        {label}
        {required ? <span className="ml-0.5 text-pitch">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full h-11 rounded-lg border bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-soft/60 transition-colors focus:outline-none";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ invalid, className = "", ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={`${inputBase} ${invalid ? "border-danger focus:border-danger" : "border-line-strong focus:border-pitch"} ${className}`}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ invalid, className = "", children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={`${inputBase} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%3E%3Cpath%20d%3D%22M1%201l5%205%205-5%22%20stroke%3D%22%234b5750%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.9rem_center] bg-no-repeat pr-10 ${invalid ? "border-danger" : "border-line-strong focus:border-pitch"} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-tint px-3.5 py-2.5 text-[13px] font-medium text-danger" role="alert">
      {message}
    </div>
  );
}

/** Unique id for label/input pairs. */
export function useFieldId(prefix: string): string {
  return useId().replace(/[:]/g, "") + prefix;
}
