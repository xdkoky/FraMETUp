import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, intlLocale, isLocale, type Locale } from "./config";
import { formatDate, relativeTime } from "@/lib/utils";
import { DICTIONARIES } from "./dictionaries";
import { makeT } from "./translate";

export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get("lang")?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

export const getT = cache(async () => makeT(DICTIONARIES[await getLocale()]));

/** Locale-bound date helpers for server components. */
export const getFormat = cache(async () => {
  const locale = await getLocale();
  const t = await getT();
  const intl = intlLocale(locale);
  return {
    locale,
    date: (d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) => formatDate(d, opts, intl),
    ago: (d: Date | string) => relativeTime(d, t, intl),
    number: (n: number) => n.toLocaleString(intl),
  };
});
