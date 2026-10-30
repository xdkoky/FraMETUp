/**
 * Collects every English source string the UI can show: literal t("…") calls,
 * engine plural pairs, and the values of label maps rendered through t().
 * Used by the dictionary coverage test.
 */
import fs from "node:fs";
import path from "node:path";
import { CONFIDENCE_LABEL, SOURCE_LABEL } from "@/lib/assessment/engine";
import { STATE_STYLE } from "@/lib/skill-state";
import { OBSERVATION_LABEL, PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL, VISIBILITY_LABEL } from "@/lib/utils";
import { PRACTICE_TIERS, XP_LABEL } from "@/lib/xp/xp";
import { REFLECTION_PROMPTS } from "@/lib/reflection";
import { NAV_ITEMS, SECONDARY_NAV } from "@/components/shell/nav-items";

function walk(dir: string, out: string[] = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !p.includes(`${path.sep}taxonomy${path.sep}hu`) && !p.endsWith(`i18n${path.sep}hu.ts`)) out.push(p);
  }
  return out;
}

const STR = String.raw`"((?:[^"\\]|\\.)*)"`;

export function extractKeys(root = path.join(process.cwd(), "src")): Set<string> {
  const keys = new Set<string>();
  const add = (s: string) => keys.add(JSON.parse(`"${s}"`));
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(new RegExp(String.raw`(?<![\w.])t\(\s*${STR}`, "g"))) add(m[1]);
    for (const m of src.matchAll(new RegExp(String.raw`(?<![\w.])t\(\s*[^"()]*\?\s*${STR}\s*:\s*${STR}`, "g"))) {
      add(m[1]);
      add(m[2]);
    }
    for (const m of src.matchAll(new RegExp(String.raw`\bpl\([^,]+,\s*${STR},\s*${STR}`, "g"))) {
      add(m[1]);
      add(m[2]);
    }
    for (const m of src.matchAll(new RegExp(String.raw`reasons\.push\(t\(${STR}`, "g"))) add(m[1]);
  }
  const maps: Record<string, string>[] = [CONFIDENCE_LABEL, SOURCE_LABEL, OBSERVATION_LABEL, PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL, VISIBILITY_LABEL, XP_LABEL];
  for (const m of maps) Object.values(m).forEach((v) => keys.add(v));
  for (const s of Object.values(STATE_STYLE)) [s.label, s.short, s.description].forEach((v) => keys.add(v));
  PRACTICE_TIERS.forEach((t) => keys.add(t.name));
  REFLECTION_PROMPTS.forEach((p) => keys.add(p.label));
  [...NAV_ITEMS, ...SECONDARY_NAV].forEach((n) => keys.add(n.label));
  // Module-level option lists rendered through t()
  [
    "Any length", "Up to 1½ hours", "Up to half a day", "Up to a day",
    "About you", "Interests", "A first goal", "How it works",
    "Primary", "Secondary", "Incidental", "Routine", "Stretching", "Demanding",
    "Observable learning outcomes", "Assessment criteria", "Evidence types", "Suggested exercises",
    "Working late", "Good morning", "Good afternoon", "Good evening",
    "AI suggestion (Claude)", "Local heuristic — not AI",
    "New feedback request", "You received new feedback", "A feedback request was declined",
    "Used the local heuristic because AI analysis isn't enabled in your privacy settings. Nothing left this server.",
    "No AI provider is configured, so the local keyword heuristic was used. Nothing left this server.",
    "The AI service was unavailable, so the local keyword heuristic was used instead.",
    "Which single decision most shaped the final result, and what alternatives did you consider?",
    "Where did the result differ most from your intention — and what caused the gap?",
    "What feedback surprised you, and has it changed how you see the project?",
  ].forEach((k) => keys.add(k));
  return keys;
}
