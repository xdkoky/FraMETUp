import { cn } from "@/lib/utils";

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("px-5 py-8 lg:px-10 lg:py-10 max-w-[1400px]", className)}>{children}</main>;
}
