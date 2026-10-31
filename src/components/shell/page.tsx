import { cn } from "@/lib/utils";

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-[1320px] px-5 py-6 sm:px-7 lg:px-10 lg:py-10", className)}>{children}</main>;
}
