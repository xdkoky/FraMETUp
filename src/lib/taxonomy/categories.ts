import type { CategoryDef } from "./types";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "visual",
    code: "A",
    name: "Visual Storytelling",
    short: "Visual",
    description: "Turning dramatic meaning into images: where the camera is, what it sees, and how the frame moves through a scene.",
    color: "#6E9BFF",
    order: 1,
  },
  {
    id: "actor",
    code: "B",
    name: "Actor Direction",
    short: "Actors",
    description: "Working with performers to find truthful behaviour — communication, trust, rehearsal and the craft of the note.",
    color: "#E58FB0",
    order: 2,
  },
  {
    id: "story",
    code: "C",
    name: "Story & Dramaturgy",
    short: "Story",
    description: "Understanding how scenes, characters and conflict build meaning and tension across time.",
    color: "#E8B04B",
    order: 3,
  },
  {
    id: "technical",
    code: "D",
    name: "Technical Filmmaking",
    short: "Technical",
    description: "Enough command of camera, light, sound and editing to make deliberate choices and talk precisely with the crew.",
    color: "#5FC3B5",
    order: 4,
  },
  {
    id: "leadership",
    code: "E",
    name: "Directorial Leadership",
    short: "Leadership",
    description: "Leading a set: preparation, decisions under pressure, delegation, and a working culture people trust.",
    color: "#F08A5D",
    order: 5,
  },
  {
    id: "vision",
    code: "F",
    name: "Creative Vision",
    short: "Vision",
    description: "Developing a personal voice — described through evidence and observation, never scored for artistic worth.",
    color: "#B48CFF",
    order: 6,
  },
  {
    id: "analysis",
    code: "G",
    name: "Film Analysis & Critical Thinking",
    short: "Analysis",
    description: "Reading films closely, arguing about them clearly, and carrying those insights back into practice.",
    color: "#8FC96B",
    order: 7,
  },
  {
    id: "professional",
    code: "H",
    name: "Professional Development",
    short: "Professional",
    description: "Pitching, presenting, collaborating and learning in ways that sustain a directing practice beyond school.",
    color: "#9BA4B5",
    order: 8,
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryDef["id"],
  CategoryDef
>;
