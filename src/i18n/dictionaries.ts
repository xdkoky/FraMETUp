import type { Locale } from "./config";
import { HU } from "./hu";

export const DICTIONARIES: Record<Locale, Record<string, string> | null> = { hu: HU, en: null };
