import { HU1 } from "./hu-1";
import { HU2 } from "./hu-2";
import { HU3 } from "./hu-3";

/** Hungarian UI dictionary, keyed by the English source text. */
export const HU: Record<string, string> = { ...HU1, ...HU2, ...HU3 };
