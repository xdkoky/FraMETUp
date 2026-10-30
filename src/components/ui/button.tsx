import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "amber" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary:
    "bg-[linear-gradient(180deg,#8AB0FF,#6E9BFF)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_20px_-6px_rgba(110,155,255,0.6)] hover:brightness-110",
  secondary: "bg-surface-2 text-text border border-line shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-surface-3 hover:border-faint/40",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  amber:
    "bg-[linear-gradient(180deg,#F1C46C,#E8B04B)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_20px_-6px_rgba(232,176,75,0.55)] hover:brightness-110",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
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
