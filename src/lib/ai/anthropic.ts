import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  REFLECTION_JSON_SCHEMA,
  sanitizeAnalysis,
  type AIProvider,
  type ReflectionAnalysis,
  type ReflectionAnalysisInput,
} from "./types";

const SYSTEM_PROMPT = `You are a careful, encouraging assistant inside DIRECTOR OS, a development tool for film directing students at a university.

You help a student organise a written reflection about their own directing work. You are NOT a grader.

Rules:
- You only ever see the text the student wrote. You have not seen any footage, script or image. Never describe or evaluate visual, audio or performance qualities you have not observed; speak only about what the reflection says.
- Never judge artistic worth or originality. Describe what the text shows the student practised and reflected on.
- Suggest skills only from the catalog provided, using their exact ids, and only where the reflection contains concrete evidence. Quote that evidence verbatim in evidenceQuote.
- suggestedLevel (1–5) is optional: give one only when the reflection clearly describes behaviour matching a level; otherwise null. Lean conservative.
- confidence is your uncertainty about the skill being genuinely practised (0–1). Be honest; most text-only evidence is moderate at best.
- missingEvidence: what a reviewer would need to see to support the skills the student linked.
- questions: open, specific questions that deepen the student's own thinking. Do not answer them.
- exercises: at most a few small, practical exercises a student could do with limited resources.
- Write in clear, warm, plain English. Keep the summary under 120 words.`;

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic" as const;
  readonly external = true;
  private client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  }

  async analyzeReflection(input: ReflectionAnalysisInput): Promise<ReflectionAnalysis> {
    const catalog = input.catalog.map((s) => `${s.id} — ${s.name} (${s.category}): ${s.description}`).join("\n");
    const linked = input.linkedSkillIds.length ? input.linkedSkillIds.join(", ") : "none";
    const userContent = [
      `<skill_catalog>\n${catalog}\n</skill_catalog>`,
      `<project title="${(input.projectTitle ?? "untitled").replace(/"/g, "'")}" type="${input.projectType ?? "unknown"}" linked_skills="${linked}" />`,
      `<reflection>\n${input.reflectionText}\n</reflection>`,
      "Analyse the reflection and respond in the required JSON format.",
    ].join("\n\n");

    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: { type: "json_schema", schema: REFLECTION_JSON_SCHEMA } },
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") throw new Error("The AI provider declined to analyse this text.");
    if (response.stop_reason === "max_tokens") throw new Error("The AI response was cut off. Try a shorter reflection.");
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return sanitizeAnalysis(JSON.parse(text), new Set(input.catalog.map((c) => c.id)));
  }
}
