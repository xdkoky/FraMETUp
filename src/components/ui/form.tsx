"use client";

import { forwardRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const field =
  "w-full rounded-lg bg-ink/60 border border-line px-3 text-sm text-text placeholder:text-faint transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(field, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(field, "py-2.5 min-h-24 leading-relaxed", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(field, "h-10 pr-8 appearance-none bg-no-repeat", className)} {...props}>
      {children}
    </select>
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-text mb-1.5", className)} {...props} />;
}

export function Hint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs text-faint mt-1.5", className)}>{children}</p>;
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p role="alert" className="text-xs text-danger mt-1.5">
      {errors[0]}
    </p>
  );
}

export function FormMessage({ state }: { state?: { error?: string; ok?: string } | null }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <div
      role={state.error ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        state.error ? "border-danger/30 bg-danger/10 text-danger" : "border-success/30 bg-success/10 text-success",
      )}
    >
      {state.error ?? state.ok}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? (pendingText ?? children) : children}
    </Button>
  );
}
