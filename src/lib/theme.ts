import "server-only";
import { cookies } from "next/headers";
import type { ThemePref } from "@/components/shell/theme-switch";

export async function getThemePref(): Promise<ThemePref> {
  const v = (await cookies()).get("theme")?.value;
  return v === "light" || v === "dark" ? v : "auto";
}
