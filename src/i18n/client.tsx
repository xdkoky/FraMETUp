"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, intlLocale, type Locale } from "./config";
import { formatDate } from "@/lib/utils";
import { makeT, type TFn } from "./translate";

const Ctx = createContext<{ locale: Locale; t: TFn }>({ locale: DEFAULT_LOCALE, t: makeT(null) });

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Record<string, string> | null; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(dict) }), [locale, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx).t;
}

export function useLocale() {
  return useContext(Ctx).locale;
}

export function useFormat() {
  const locale = useLocale();
  return useMemo(() => ({ date: (d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) => formatDate(d, opts, intlLocale(locale)) }), [locale]);
}
