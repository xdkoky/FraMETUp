import { describe, expect, it } from "vitest";
import {
  aggregateCategory,
  computeMastery,
  DEFAULT_CONFIG,
  type PeerEvidence,
  type ProjectEvidenceInput,
  type SelfEvidence,
  type SkillEvidence,
} from "./engine";

const NOW = new Date("2026-10-01T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000);

const empty = (): SkillEvidence => ({ self: [], peer: [], project: [], ai: [] });

const self = (level: number, over: Partial<SelfEvidence> = {}): SelfEvidence => ({
  id: `s-${level}-${Math.random()}`,
  level,
  hasSupport: true,
  rubricVersion: 1,
  createdAt: daysAgo(10),
  ...over,
});

let peerSeq = 0;
const peer = (over: Partial<PeerEvidence> = {}): PeerEvidence => {
  peerSeq++;
  return {
    id: `p-${peerSeq}`,
    reviewId: `r-${peerSeq}`,
    reviewerId: `reviewer-${peerSeq}`,
    projectId: `project-${peerSeq}`,
    observation: "DEMONSTRATED_INDEPENDENTLY",
    familiarity: "WORKED_ALONGSIDE",
    commentLength: 120,
    rubricVersion: 1,
    createdAt: daysAgo(20),
    ...over,
  };
};

let projSeq = 0;
const project = (over: Partial<ProjectEvidenceInput> = {}): ProjectEvidenceInput => {
  projSeq++;
  return {
    id: `l-${projSeq}`,
    projectId: `proj-${projSeq}`,
    relevance: "PRIMARY",
    difficulty: 2,
    independence: "INDEPENDENT",
    demonstratedLevel: 3,
    hasArtifacts: true,
    createdAt: daysAgo(30),
    ...over,
  };
};

describe("computeMastery — missing sources", () => {
  it("returns NOT_ASSESSED (not a low score) when there is no evidence", () => {
    const r = computeMastery(empty(), NOW);
    expect(r.mastery).toBeNull();
    expect(r.state).toBe("NOT_ASSESSED");
    expect(r.confidence).toBe(0);
    expect(r.missingSources).toEqual(["self", "peer", "ai", "project"]);
    expect(r.explanation[0]).toMatch(/says nothing about your ability/);
  });

  it("reweights when only a self-assessment exists, and caps confidence", () => {
    const r = computeMastery({ ...empty(), self: [self(3)] }, NOW);
    expect(r.mastery).toBe(50);
    expect(r.selfReportedOnly).toBe(true);
    expect(r.confidence).toBeLessThanOrEqual(0.35);
    expect(r.breakdown.find((b) => b.source === "self")?.effectiveWeight).toBe(1);
    expect(r.missingSources).toContain("peer");
    expect(r.explanation.join(" ")).toMatch(/Missing/);
  });

  it("treats peer 'not observed' as absence, not low ability", () => {
    const r = computeMastery({ ...empty(), peer: [peer({ observation: "NOT_OBSERVED" }), peer({ observation: "INSUFFICIENT_EVIDENCE" })] }, NOW);
    expect(r.mastery).toBeNull();
    expect(r.state).toBe("NOT_ASSESSED");
  });

  it("counts linked-but-unmapped projects as practice only", () => {
    const r = computeMastery({ ...empty(), project: [project({ demonstratedLevel: null })] }, NOW);
    expect(r.mastery).toBeNull();
    expect(r.practiced).toBe(true);
  });
});

describe("computeMastery — combining sources", () => {
  it("weights peer evidence more heavily than self-assessment", () => {
    const r = computeMastery({ ...empty(), self: [self(5)], peer: [peer({ observation: "OBSERVED_WITH_DIFFICULTY" })] }, NOW);
    // self 90 * .2 + peer 25 * .45, over .65
    expect(r.mastery).toBeCloseTo((90 * 0.2 + 25 * 0.45) / 0.65, 0);
  });

  it("flags discrepancies between self and peer assessment", () => {
    const r = computeMastery({ ...empty(), self: [self(5)], peer: [peer({ observation: "OBSERVED_WITH_DIFFICULTY" })] }, NOW);
    expect(r.discrepancy?.direction).toBe("self-higher");
    expect(r.explanation.join(" ")).toMatch(/noticeably higher/);
  });

  it("lowers confidence when sources conflict", () => {
    const agree = computeMastery({ ...empty(), self: [self(4)], peer: [peer({ observation: "DEMONSTRATED_INDEPENDENTLY" })] }, NOW);
    const conflict = computeMastery({ ...empty(), self: [self(5)], peer: [peer({ observation: "OBSERVED_WITH_DIFFICULTY" })] }, NOW);
    expect(conflict.confidence).toBeLessThan(agree.confidence);
  });

  it("uses only the latest self-assessment", () => {
    const r = computeMastery(
      { ...empty(), self: [self(1, { createdAt: daysAgo(100) }), self(4, { createdAt: daysAgo(1) })] },
      NOW,
    );
    expect(r.mastery).toBe(70);
  });

  it("caps unsupported high self-assessments at level 3", () => {
    const r = computeMastery({ ...empty(), self: [self(5, { hasSupport: false })] }, NOW);
    expect(r.mastery).toBe(50);
    expect(r.warnings.join(" ")).toMatch(/counted as level 3/);
  });

  it("ignores AI suggestions until accepted", () => {
    const pending = computeMastery(
      { ...empty(), ai: [{ id: "a1", suggestedLevel: 5, confidence: 0.9, accepted: false, createdAt: daysAgo(1) }] },
      NOW,
    );
    expect(pending.mastery).toBeNull();
    const accepted = computeMastery(
      { ...empty(), ai: [{ id: "a1", suggestedLevel: 4, confidence: 0.9, accepted: true, createdAt: daysAgo(1) }] },
      NOW,
    );
    expect(accepted.mastery).toBe(70);
  });
});

describe("computeMastery — manipulation resistance", () => {
  it("gives diminishing weight to repeated reviews from the same reviewer", () => {
    const honest = peer({ reviewerId: "honest", observation: "OBSERVED_WITH_DIFFICULTY" });
    const friendReviews = Array.from({ length: 10 }, () =>
      peer({ reviewerId: "friend", observation: "DEMONSTRATED_CONSISTENTLY" }),
    );
    const r = computeMastery({ ...empty(), peer: [honest, ...friendReviews] }, NOW);
    // Ten glowing reviews from one friend must not overwhelm one independent observation.
    const naiveMean = (25 + 90 * 10) / 11;
    expect(r.mastery!).toBeLessThan(naiveMean - 10);
    expect(r.distinctReviewers).toBe(2);
  });

  it("does not treat many reviews of the same project as independent contexts", () => {
    const sameProject = Array.from({ length: 4 }, () => peer({ projectId: "scene-1" }));
    const distinct = Array.from({ length: 4 }, () => peer());
    const a = computeMastery({ ...empty(), peer: sameProject }, NOW);
    const b = computeMastery({ ...empty(), peer: distinct }, NOW);
    expect(a.distinctContexts).toBe(1);
    expect(b.distinctContexts).toBe(4);
    expect(a.confidence).toBeLessThan(b.confidence);
  });

  it("does not raise the estimate just because more projects are logged", () => {
    const few = computeMastery({ ...empty(), project: [project({ demonstratedLevel: 4, difficulty: 3 })] }, NOW);
    const many = computeMastery(
      { ...empty(), project: Array.from({ length: 8 }, () => project({ demonstratedLevel: 2, difficulty: 1 })) },
      NOW,
    );
    expect(few.mastery!).toBeGreaterThan(many.mastery!);
  });

  it("weights demanding projects more than routine ones", () => {
    const r = computeMastery(
      {
        ...empty(),
        project: [project({ demonstratedLevel: 4, difficulty: 3 }), project({ demonstratedLevel: 2, difficulty: 1 })],
      },
      NOW,
    );
    expect(r.mastery!).toBeGreaterThan(50); // midpoint of 70 and 30
  });

  it("ignores duplicate evidence records", () => {
    const p = peer();
    const r = computeMastery({ ...empty(), peer: [p, p, p] }, NOW);
    expect(r.breakdown.find((b) => b.source === "peer")?.items).toBe(1);
    expect(r.warnings.filter((w) => w.includes("Duplicate"))).toHaveLength(2);
  });

  it("ignores a second link of the same project to the same skill", () => {
    const r = computeMastery(
      { ...empty(), project: [project({ projectId: "x", demonstratedLevel: 5 }), project({ projectId: "x", demonstratedLevel: 5 })] },
      NOW,
    );
    expect(r.breakdown.find((b) => b.source === "project")?.items).toBe(1);
  });
});

describe("computeMastery — low-confidence evidence", () => {
  it("cannot reach STRONGLY_EVIDENCED from a single source", () => {
    const r = computeMastery({ ...empty(), peer: [peer({ observation: "DEMONSTRATED_CONSISTENTLY" })] }, NOW);
    expect(r.mastery).toBe(90);
    expect(r.state).toBe("ADVANCED");
    expect(r.confidenceBand === "LOW" || r.confidenceBand === "MODERATE").toBe(true);
  });

  it("reaches STRONGLY_EVIDENCED with broad, consistent, independent evidence", () => {
    const r = computeMastery(
      {
        self: [self(4)],
        peer: Array.from({ length: 5 }, () => peer({ observation: "DEMONSTRATED_CONSISTENTLY" })),
        project: [project({ demonstratedLevel: 4 }), project({ demonstratedLevel: 5 })],
        ai: [{ id: "ai", suggestedLevel: 4, confidence: 0.7, accepted: true, createdAt: daysAgo(3) }],
      },
      NOW,
    );
    expect(r.state).toBe("STRONGLY_EVIDENCED");
    expect(r.confidenceBand).toBe("HIGH");
  });

  it("down-weights brief-familiarity reviewers and reviews without comments", () => {
    const strong = peer({ observation: "DEMONSTRATED_CONSISTENTLY", familiarity: "BRIEF", commentLength: 0 });
    const weak = peer({ observation: "OBSERVED_WITH_DIFFICULTY", familiarity: "CLOSE_COLLABORATOR", commentLength: 200 });
    const r = computeMastery({ ...empty(), peer: [strong, weak] }, NOW);
    expect(r.mastery!).toBeLessThan((90 + 25) / 2);
  });
});

describe("computeMastery — history and taxonomy versions", () => {
  it("does not decay mastery over time but flags reassessment", () => {
    const old = new Date(NOW.getTime() - 400 * 86400000);
    const r = computeMastery({ ...empty(), self: [self(3, { createdAt: old })], peer: [peer({ createdAt: old })] }, NOW);
    const fresh = computeMastery({ ...empty(), self: [self(3)], peer: [peer()] }, NOW);
    expect(r.mastery).toBe(fresh.mastery);
    expect(r.needsReassessment).toBe(true);
    expect(fresh.needsReassessment).toBe(false);
  });

  it("keeps evidence from older rubric versions, with a note", () => {
    const r = computeMastery({ ...empty(), self: [self(3, { rubricVersion: 1 })] }, NOW, {
      ...DEFAULT_CONFIG,
      currentRubricVersion: 2,
    });
    expect(r.mastery).toBe(50);
    expect(r.explanation.join(" ")).toMatch(/earlier rubric version/);
  });

  it("is deterministic for identical inputs", () => {
    const input: SkillEvidence = { ...empty(), self: [self(3, { id: "fixed" })], peer: [peer({ id: "fixed-p" })] };
    expect(computeMastery(input, NOW)).toEqual(computeMastery(input, NOW));
  });

  it("respects configurable weights", () => {
    const input: SkillEvidence = { ...empty(), self: [self(5)], peer: [peer({ observation: "OBSERVED_WITH_DIFFICULTY" })] };
    const selfHeavy = computeMastery(input, NOW, { ...DEFAULT_CONFIG, weights: { self: 0.9, peer: 0.1, ai: 0, project: 0 } });
    expect(selfHeavy.mastery!).toBeGreaterThan(80);
  });
});

describe("computeMastery — out-of-range inputs", () => {
  it("ignores invalid self-assessment levels", () => {
    const r = computeMastery({ ...empty(), self: [self(0), self(7), self(2.5)] }, NOW);
    expect(r.mastery).toBeNull();
    expect(r.warnings.filter((w) => w.includes("out-of-range"))).toHaveLength(3);
  });

  it("ignores invalid project levels and clamps difficulty", () => {
    const r = computeMastery(
      { ...empty(), project: [project({ demonstratedLevel: 9 }), project({ demonstratedLevel: 3, difficulty: 99 })] },
      NOW,
    );
    expect(r.mastery).toBe(50);
    expect(r.warnings.join(" ")).toMatch(/out-of-range/);
  });

  it("clamps AI confidence", () => {
    const r = computeMastery(
      { ...empty(), ai: [{ id: "x", suggestedLevel: 3, confidence: 42, accepted: true, createdAt: daysAgo(1) }] },
      NOW,
    );
    expect(r.mastery).toBe(50);
  });
});

describe("aggregateCategory", () => {
  it("excludes unassessed skills instead of counting them as zero", () => {
    const agg = aggregateCategory("visual", [
      { mastery: 60, confidence: 0.5 },
      { mastery: null, confidence: 0 },
      { mastery: null, confidence: 0 },
    ]);
    expect(agg.mastery).toBe(60);
    expect(agg.assessed).toBe(1);
    expect(agg.coverage).toBeCloseTo(0.333, 2);
  });

  it("returns null mastery when nothing is assessed", () => {
    expect(aggregateCategory("x", [{ mastery: null, confidence: 0 }]).mastery).toBeNull();
  });
});
