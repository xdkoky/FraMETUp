import "server-only";
import { AnthropicProvider } from "./anthropic";
import { LocalHeuristicProvider } from "./local";
import type { AIProvider } from "./types";

export const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_REQUEST_LIMIT ?? 20);
export const AI_MAX_INPUT_CHARS = Number(process.env.AI_MAX_INPUT_CHARS ?? 12000);

export function externalAIConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Chooses a provider. The external provider is used only when configured AND the
 * student has given explicit consent; otherwise the local heuristic runs.
 */
export function getProvider(opts: { consent: boolean }): AIProvider {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key && opts.consent) return new AnthropicProvider(key, process.env.ANTHROPIC_MODEL || "claude-opus-5-5");
  return new LocalHeuristicProvider();
}

export * from "./types";
