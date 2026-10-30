import type { AIProvider, ReflectionAnalysis, ReflectionAnalysisInput } from "./types";

/**
 * Local, offline fallback. Pure keyword matching against the taxonomy — it is NOT
 * an AI, never estimates a level, and is labelled as a heuristic in the UI.
 * No data leaves the server.
 */

const EXTRA_KEYWORDS: Record<string, string[]> = {
  "visual.blocking": ["blocking", "blocked", "actor movement", "floor plan", "staging", "moves to", "crosses"],
  "visual.composition": ["composition", "composed", "frame balance", "rule of thirds", "negative space"],
  "visual.framing": ["close-up", "wide shot", "medium shot", "shot size", "framing"],
  "visual.movement-motivation": ["dolly", "tracking shot", "handheld", "steadicam", "gimbal", "camera move"],
  "visual.camera-placement": ["camera position", "angle", "point of view", "pov"],
  "visual.color-mood": ["colour", "color", "palette"],
  "visual.without-dialogue": ["silent", "no dialogue", "without words"],
  "actor.communication": ["told the actor", "direction to", "actors understood", "explained to the actor"],
  "actor.actionable-notes": ["note", "notes between takes", "adjustment"],
  "actor.rehearsal": ["rehearsal", "rehearsed", "table read"],
  "actor.emotional-direction": ["emotional", "cry", "tears", "anger", "grief"],
  "actor.improvisation": ["improvis", "improv"],
  "actor.nonprofessional": ["non-actor", "non-professional", "nonprofessional", "first-time actor"],
  "actor.psychological-safety": ["safe", "boundaries", "consent", "check in"],
  "actor.trust": ["trust"],
  "story.pacing": ["pacing", "pace", "too slow", "dragged", "rushed"],
  "story.structure": ["structure", "act", "turning point"],
  "story.conflict": ["conflict", "argument", "opposition"],
  "story.tension": ["tension", "suspense"],
  "story.subtext": ["subtext", "unsaid", "beneath"],
  "story.storyboarding": ["storyboard"],
  "technical.lighting-fundamentals": ["lighting", "key light", "backlight", "fill"],
  "technical.lighting-motivation": ["practical", "motivated light", "window light"],
  "technical.sound-awareness": ["sound", "audio", "boom", "ambience"],
  "technical.editing-fundamentals": ["edit", "cut", "assembly"],
  "technical.editing-rhythm": ["rhythm", "cutting pattern"],
  "technical.coverage-planning": ["coverage", "shot list", "setups"],
  "technical.continuity": ["continuity", "matching"],
  "technical.troubleshooting": ["broke", "failed", "battery", "fixed the", "problem with the"],
  "leadership.time-management": ["schedule", "ran out of time", "behind schedule", "overtime"],
  "leadership.decision-making": ["decided", "decision", "had to choose"],
  "leadership.adaptability": ["changed plan", "adapt", "unexpected", "rain", "lost the location"],
  "leadership.crew-coordination": ["crew", "ad ", "assistant director", "department"],
  "leadership.conflict-resolution": ["disagree", "tension on set", "argued"],
  "leadership.preparation": ["prepared", "preparation", "prep", "breakdown"],
  "leadership.delegation": ["delegat", "trusted my", "let the"],
  "professional.receiving-criticism": ["feedback", "criticism", "critique"],
  "professional.pitching": ["pitch"],
  "vision.reference-analysis": ["reference", "inspired by", "lookbook", "mood board"],
  "vision.experimentation": ["experiment", "tried something new"],
  "vision.mood-atmosphere": ["mood", "atmosphere"],
  "analysis.scene-analysis": ["analysed", "analyzed", "breakdown of the scene"],
};

const QUESTION_BANK = [
  "Which single decision most shaped the final result, and what alternatives did you consider?",
  "Where did the result differ most from your intention — and what caused the gap?",
  "What feedback surprised you, and has it changed how you see the project?",
  "If you directed this again tomorrow with the same resources, what would you change first?",
  "Which collaborator influenced the work most, and how?",
];

export class LocalHeuristicProvider implements AIProvider {
  readonly id = "local-heuristic" as const;
  readonly model = null;
  readonly external = false;

  async analyzeReflection(input: ReflectionAnalysisInput): Promise<ReflectionAnalysis> {
    const text = ` ${input.reflectionText.toLowerCase()} `;
    const sentences = input.reflectionText.split(/(?<=[.!?])\s+/);
    const scored = input.catalog
      .map((skill) => {
        const keywords = [skill.name.toLowerCase(), ...(EXTRA_KEYWORDS[skill.id] ?? [])];
        const hits = keywords.filter((k) => text.includes(k));
        return { skill, hits };
      })
      .filter((s) => s.hits.length > 0)
      .sort((a, b) => b.hits.length - a.hits.length)
      .slice(0, 6);

    const suggestions = scored.map(({ skill, hits }) => {
      const quote = sentences.find((s) => hits.some((h) => s.toLowerCase().includes(h.trim())));
      return {
        skillId: skill.id,
        rationale: `Keyword match: your reflection mentions ${hits.map((h) => `“${h.trim()}”`).join(", ")}, which relates to ${skill.name}. This is a text match only — check whether you actually practised it.`,
        evidenceQuote: quote ? quote.slice(0, 300) : null,
        suggestedLevel: null,
        confidence: Math.min(0.5, 0.15 + hits.length * 0.1),
      };
    });

    const linkedNotMentioned = input.linkedSkillIds.filter((id) => !scored.some((s) => s.skill.id === id));
    const nameOf = (id: string) => input.catalog.find((c) => c.id === id)?.name ?? id;
    const missingEvidence = linkedNotMentioned
      .slice(0, 4)
      .map((id) => `The project is linked to ${nameOf(id)}, but the reflection doesn't describe how you practised it.`);

    const words = input.reflectionText.trim().split(/\s+/).length;
    return {
      summary:
        `Local heuristic scan of ${words} words${input.projectTitle ? ` about “${input.projectTitle}”` : ""}. ` +
        (suggestions.length
          ? `Found ${suggestions.length} skill${suggestions.length > 1 ? "s" : ""} mentioned by keyword. No AI model was used and no judgement of quality was made.`
          : "No skill keywords were found. Try describing specific decisions you made on set."),
      suggestions,
      missingEvidence,
      questions: QUESTION_BANK.slice(0, 3),
      exercises: [],
    };
  }
}
