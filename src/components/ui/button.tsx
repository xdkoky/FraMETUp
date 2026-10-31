import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "amber" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "press inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold uppercase tracking-wide transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-[0_4px_0_var(--color-accent-strong)] hover:brightness-105",
  secondary: "bg-surface text-accent border-2 border-line shadow-[0_4px_0_var(--color-line)] hover:bg-surface-2",
  ghost: "text-accent hover:bg-accent-soft",
  amber: "bg-amber-bright text-white shadow-[0_4px_0_var(--color-amber)] hover:brightness-105",
  danger: "bg-danger text-white shadow-[0_4px_0_var(--color-danger-strong)] hover:brightness-105",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[11.5px]",
  md: "h-11 px-5 text-[13px]",
  lg: "h-13 px-7 text-sm",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = "primary", size = "md", className, ...props }, ref) {
  return <button ref={ref} className={buttonClass(variant, size, className)} {...props} />;
});

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
