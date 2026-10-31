import { HU1 } from "./hu-1";
import { HU2 } from "./hu-2";
import { HU3 } from "./hu-3";
import { HU4 } from "./hu-4";
import { HU5 } from "./hu-5";
import { HU6 } from "./hu-6";

/** Hungarian UI dictionary, keyed by the English source text. */
export const HU: Record<string, string> = { ...HU1, ...HU2, ...HU3, ...HU4, ...HU5, ...HU6 };
