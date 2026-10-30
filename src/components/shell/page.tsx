import { cn } from "@/lib/utils";

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-[1320px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10 animate-[pagein_.35s_ease-out]", className)}>{children}</main>;
}
