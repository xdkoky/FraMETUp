/**
 * Starting-point quiz. Each answer maps to a provisional rubric level (1–3) for a
 * few skills. Levels are capped at 3: a quiz shows knowledge and experience, not
 * demonstrated directing, so it can never claim more than "proficient".
 * All text is English source; the UI translates it.
 */

export type Level = 1 | 2 | 3;

interface Base {
  id: string;
  prompt: string;
  hint?: string;
  skills: string[];
}

export interface MultiQuestion extends Base {
  kind: "multi";
  options: { id: string; label: string; icon: string; skills: string[] }[];
}

export interface ChoiceQuestion extends Base {
  kind: "choice" | "visual" | "hotspot" | "sequence";
  options: { id: string; label: string; level: Level }[];
}

export interface OrderQuestion extends Base {
  kind: "order";
  /** Listed in the correct order; the UI shuffles them. */
  items: { id: string; label: string }[];
}

export interface MatchQuestion extends Base {
  kind: "match";
  pairs: { id: string; left: string; right: string }[];
}

export type Question = MultiQuestion | ChoiceQuestion | OrderQuestion | MatchQuestion;

export const QUIZ: Question[] = [
  {
    id: "experience",
    kind: "multi",
    prompt: "Which of these have you already done?",
    hint: "Tap everything that applies — picking none is completely fine.",
    skills: [],
    options: [
      { id: "directed-actors", label: "Directed actors in a scene", icon: "Users", skills: ["actor.communication", "actor.rehearsal"] },
      { id: "shot-list", label: "Wrote a shot list", icon: "ListChecks", skills: ["technical.coverage-planning"] },
      { id: "storyboard", label: "Drew a storyboard", icon: "PenTool", skills: ["story.storyboarding"] },
      { id: "edited", label: "Edited a film", icon: "Scissors", skills: ["technical.editing-fundamentals"] },
      { id: "camera", label: "Operated a camera myself", icon: "Video", skills: ["technical.camera-fundamentals"] },
      { id: "crew", label: "Led a crew of three or more", icon: "Megaphone", skills: ["leadership.crew-coordination", "leadership.set-leadership"] },
      { id: "pitched", label: "Pitched a project", icon: "Presentation", skills: ["professional.pitching"] },
      { id: "analysis", label: "Wrote a film analysis", icon: "BookOpen", skills: ["analysis.scene-analysis"] },
    ],
  },
  {
    id: "isolation",
    kind: "visual",
    prompt: "Which frame makes the character feel most alone?",
    skills: ["visual.composition", "visual.framing"],
    options: [
      { id: "crowd", label: "Centred in a crowd", level: 1 },
      { id: "space", label: "Small, in a lot of empty space", level: 3 },
      { id: "closeup", label: "Tight close-up", level: 2 },
    ],
  },
  {
    id: "pov",
    kind: "hotspot",
    prompt: "Tell this interrogation from the suspect's point of view. Where does the camera go?",
    hint: "Tap a camera position on the floor plan.",
    skills: ["visual.camera-placement"],
    options: [
      { id: "over-suspect", label: "Over the suspect's shoulder", level: 3 },
      { id: "side", label: "From the side, both in profile", level: 2 },
      { id: "over-detective", label: "Over the detective's shoulder", level: 1 },
    ],
  },
  {
    id: "axis",
    kind: "sequence",
    prompt: "Three shots of one conversation. Tap the shot that breaks the 180° line.",
    skills: ["visual.screen-direction", "visual.spatial-continuity"],
    options: [
      { id: "shot1", label: "Shot 1", level: 1 },
      { id: "shot2", label: "Shot 2", level: 1 },
      { id: "shot3", label: "Shot 3", level: 3 },
    ],
  },
  {
    id: "note",
    kind: "choice",
    prompt: "Your actor plays the goodbye too sad, too early. What do you tell them?",
    skills: ["actor.communication", "actor.actionable-notes"],
    options: [
      { id: "less-sad", label: "“Be less sad.”", level: 1 },
      { id: "keep-him", label: "“Try to keep him at the table — without ever asking him to stay.”", level: 3 },
      { id: "cry-last", label: "“Save the tears for the last line.”", level: 1 },
      { id: "again", label: "“Let's just run it again and see what happens.”", level: 2 },
    ],
  },
  {
    id: "beats",
    kind: "order",
    prompt: "Put these beats in the order that builds the most tension.",
    hint: "Tap the cards in order: first beat first.",
    skills: ["story.structure", "story.scene-objectives"],
    items: [
      { id: "b1", label: "Two sisters set the table for their father's birthday." },
      { id: "b2", label: "A message arrives: he isn't coming." },
      { id: "b3", label: "They argue about who drove him away." },
      { id: "b4", label: "One sister quietly sets his plate anyway." },
    ],
  },
  {
    id: "subtext",
    kind: "choice",
    prompt: "She's hurt that he forgot her birthday. Which line plays it with subtext?",
    skills: ["story.subtext", "story.dialogue-analysis"],
    options: [
      { id: "direct", label: "“I'm hurt that you forgot my birthday.”", level: 1 },
      { id: "busy", label: "“Busy week? I guess some days just disappear.”", level: 3 },
      { id: "whatever", label: "“Whatever. Birthdays don't matter anyway.”", level: 2 },
    ],
  },
  {
    id: "clock",
    kind: "choice",
    prompt: "You're two hours behind, five shots are left, and the location closes at 10 pm. What do you do first?",
    skills: ["leadership.time-management", "leadership.decision-making"],
    options: [
      { id: "rush", label: "Rush all five shots with fewer takes.", level: 1 },
      { id: "prioritise", label: "With the AD, pick the shots the story can't lose and reshape the rest.", level: 3 },
      { id: "overtime", label: "Ask the crew to stay late.", level: 1 },
      { id: "drop", label: "Drop the hardest shot and hope the edit saves it.", level: 2 },
    ],
  },
  {
    id: "light",
    kind: "visual",
    prompt: "Which light feels most like a lonely night at home?",
    skills: ["technical.lighting-motivation", "technical.lighting-fundamentals"],
    options: [
      { id: "flat", label: "Bright and even", level: 1 },
      { id: "practical", label: "One warm lamp from the side", level: 3 },
      { id: "silhouette", label: "Strong backlight, face in shadow", level: 2 },
    ],
  },
  {
    id: "techniques",
    kind: "match",
    prompt: "Match each technique to the effect it most often creates.",
    hint: "Tap a technique, then its effect.",
    skills: ["analysis.film-language", "analysis.editing-analysis"],
    pairs: [
      { id: "long-take", left: "Long take", right: "Real-time tension" },
      { id: "jump-cut", left: "Jump cut", right: "Jittery, compressed time" },
      { id: "ecu", left: "Extreme close-up", right: "Intimacy or unease" },
    ],
  },
  {
    id: "criticism",
    kind: "choice",
    prompt: "After a screening, someone criticises your film. What do you usually do?",
    skills: ["professional.receiving-criticism"],
    options: [
      { id: "defend", label: "Explain right away why my choices were right.", level: 1 },
      { id: "quiet", label: "Listen quietly, then move on.", level: 2 },
      { id: "notes", label: "Write it all down and decide later what's useful.", level: 3 },
      { id: "ask", label: "Ask questions to understand what they actually saw.", level: 3 },
    ],
  },
];

export type Answer = string | string[]; // option id, selected ids (multi), ordered ids (order), or "left:right" pairs (match)
export type Answers = Record<string, Answer>;

function levelFor(q: Question, a: Answer | undefined): Level | null {
  if (a === undefined) return null;
  switch (q.kind) {
    case "multi":
      return null; // handled per option
    case "order": {
      const ids = a as string[];
      if (ids.length !== q.items.length) return null;
      const correct = ids.filter((id, i) => q.items[i].id === id).length;
      return correct === q.items.length ? 3 : correct >= q.items.length / 2 ? 2 : 1;
    }
    case "match": {
      const pairs = a as string[];
      const correct = pairs.filter((p) => {
        const [l, r] = p.split(":");
        return l === r;
      }).length;
      return correct === q.pairs.length ? 3 : correct >= 1 ? 2 : 1;
    }
    default:
      return q.options.find((o) => o.id === a)?.level ?? null;
  }
}

/**
 * Turns answers into a provisional level per skill: the rounded mean of every
 * signal for that skill, capped at 3. Unanswered questions add nothing.
 */
export function scoreQuiz(answers: Answers, questions: Question[] = QUIZ): Record<string, Level> {
  const signals = new Map<string, number[]>();
  const add = (skill: string, level: number) => signals.set(skill, [...(signals.get(skill) ?? []), level]);
  for (const q of questions) {
    const a = answers[q.id];
    if (q.kind === "multi") {
      const picked = new Set(Array.isArray(a) ? a : []);
      for (const o of q.options) if (picked.has(o.id)) o.skills.forEach((s) => add(s, 2));
      continue;
    }
    const level = levelFor(q, a);
    if (level !== null) q.skills.forEach((s) => add(s, level));
  }
  const out: Record<string, Level> = {};
  for (const [skill, levels] of signals) {
    const mean = levels.reduce((x, y) => x + y, 0) / levels.length;
    out[skill] = Math.min(3, Math.max(1, Math.round(mean))) as Level;
  }
  return out;
}
