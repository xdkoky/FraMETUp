/**
 * Seeds the skill taxonomy (idempotent) and a clearly labelled DEMONSTRATION account.
 *
 *   npm run db:seed
 *
 * Demo accounts (all data is fictional):
 *   demo@director-os.local    / director-demo   — a third-semester directing student
 *   bence@director-os.local   / director-demo   — demo peer (cinematographer)
 *   dora@director-os.local    / director-demo   — demo peer (actor)
 *   admin@director-os.local   / director-admin  — demo administrator (only when SEED_DEMO_ADMIN=true;
 *                                                  never enable on a public deployment)
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES, DEPENDENCIES, SKILLS, TAXONOMY_VERSION } from "../src/lib/taxonomy";
import { CHALLENGES } from "../src/lib/taxonomy/challenges";
import { calculateXp, reflectionQuality, type XpKind } from "../src/lib/xp/xp";
import { recomputeMastery } from "../src/lib/services/mastery";
import { semesterRange } from "../src/lib/semester";

const db = new PrismaClient();

async function seedTaxonomy() {
  for (const [key, name, description] of [
    ["STUDENT", "Student", "Creates projects, assesses themselves and requests feedback."],
    ["INSTRUCTOR", "Instructor", "Verified role that can give structured feedback. One perspective among several."],
    ["ADMIN", "Administrator", "Manages taxonomy, cohorts and moderation."],
  ] as const) {
    await db.role.upsert({ where: { key }, create: { key, name, description }, update: { name, description } });
  }

  const version = await db.skillTaxonomyVersion.upsert({
    where: { version: TAXONOMY_VERSION },
    create: { version: TAXONOMY_VERSION, label: "Initial METU directing taxonomy", isCurrent: true, notes: "8 categories, 105 skills." },
    update: { isCurrent: true },
  });

  for (const c of CATEGORIES) {
    await db.skillCategory.upsert({
      where: { id: c.id },
      create: { id: c.id, code: c.code, name: c.name, description: c.description, color: c.color, order: c.order },
      update: { code: c.code, name: c.name, description: c.description, color: c.color, order: c.order },
    });
  }

  for (const s of SKILLS) {
    const data = {
      categoryId: s.categoryId,
      name: s.name,
      description: s.description,
      outcomes: s.outcomes,
      criteria: s.criteria,
      evidenceTypes: s.evidenceTypes,
      exercises: s.exercises,
    };
    // Existing skills edited through the admin UI keep their edits: only create here.
    const existing = await db.skill.findUnique({ where: { id: s.id } });
    if (!existing) await db.skill.create({ data: { id: s.id, ...data } });
    const rubric = await db.skillRubric.findFirst({ where: { skillId: s.id } });
    if (!rubric) {
      await db.skillRubric.create({
        data: { skillId: s.id, version: 1, levels: [...s.levels], taxonomyVersionId: version.id, isCurrent: true },
      });
    }
  }

  for (const d of DEPENDENCIES) {
    await db.skillDependency.upsert({
      where: { fromSkillId_toSkillId_kind: { fromSkillId: d.from, toSkillId: d.to, kind: d.kind } },
      create: { fromSkillId: d.from, toSkillId: d.to, kind: d.kind },
      update: {},
    });
  }

  for (const c of CHALLENGES) {
    const { skills, ...rest } = c;
    await db.challenge.upsert({ where: { id: c.id }, create: { ...rest, source: "CURATED" }, update: rest });
    for (const skillId of skills) {
      await db.challengeSkill.upsert({
        where: { challengeId_skillId: { challengeId: c.id, skillId } },
        create: { challengeId: c.id, skillId },
        update: {},
      });
    }
  }
  console.log(`✓ taxonomy v${TAXONOMY_VERSION}: ${CATEGORIES.length} categories, ${SKILLS.length} skills, ${DEPENDENCIES.length} links, ${CHALLENGES.length} challenges`);
}

// ─────────────────────────────── demo data ───────────────────────────────

const ENROLL = 2025;
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 14, 0, 0);

async function rubricId(skillId: string) {
  const r = await db.skillRubric.findFirstOrThrow({ where: { skillId, isCurrent: true } });
  return r.id;
}

async function createUser(email: string, password: string, displayName: string, opts: Partial<Prisma.UserProfileCreateWithoutUserInput> = {}) {
  const role = await db.role.findUniqueOrThrow({ where: { key: "STUDENT" } });
  return db.user.create({
    data: {
      email,
      isDemo: true,
      passwordHash: await bcrypt.hash(password, 10),
      profile: { create: { displayName, onboardedAt: new Date(), enrollmentYear: ENROLL, academicYear: 2, interests: [], ...opts } },
      privacy: { create: {} },
      roles: { create: { roleId: role.id } },
    },
  });
}

async function xp(userId: string, kind: XpKind, sourceId: string, when: Date, quality = 1) {
  const prior = await db.experienceEvent.findMany({ where: { userId, createdAt: { lte: when, gte: new Date(when.getTime() - 8 * 86400000) } } });
  const award = calculateXp(kind, prior, when, quality);
  await db.experienceEvent.create({ data: { userId, kind, sourceId, createdAt: when, ...award } });
}

async function seedDemo() {
  const demoEmails = ["demo@director-os.local", "bence@director-os.local", "dora@director-os.local", "admin@director-os.local"];
  const old = await db.user.findMany({ where: { email: { in: demoEmails } }, select: { id: true } });
  if (old.length) {
    const ids = old.map((u) => u.id);
    // Remove previous demo data so the seed can be re-run.
    await db.peerReview.deleteMany({ where: { OR: [{ reviewerId: { in: ids } }, { subjectId: { in: ids } }] } });
    await db.peerReviewRequest.deleteMany({ where: { OR: [{ requesterId: { in: ids } }, { reviewerId: { in: ids } }] } });
    await db.challengeCompletion.deleteMany({ where: { userId: { in: ids } } });
    await db.reflection.deleteMany({ where: { userId: { in: ids } } });
    await db.projectCollaborator.deleteMany({ where: { OR: [{ userId: { in: ids } }, { project: { ownerId: { in: ids } } }] } });
    await db.project.deleteMany({ where: { ownerId: { in: ids } } });
    await db.masterySnapshot.deleteMany({ where: { userId: { in: ids } } });
    await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }

  const cohort =
    (await db.cohort.findFirst({ where: { name: "Film Directing BA · 2025 intake" } })) ??
    (await db.cohort.create({ data: { name: "Film Directing BA · 2025 intake", startYear: ENROLL, authorized: false } }));

  const demo = await createUser("demo@director-os.local", "director-demo", "Noémi Kardos (demo)", {
    interests: ["actor", "visual", "vision"],
    experience: "Made music videos for friends' bands in secondary school; one short documentary about my grandmother's village.",
    bio: "Demonstration profile. Interested in quiet, observational drama and long takes.",
  });
  const bence = await createUser("bence@director-os.local", "director-demo", "Bence Halász (demo)", { interests: ["technical", "visual"] });
  const dora = await createUser("dora@director-os.local", "director-demo", "Dóra Mészáros (demo)", { interests: ["actor"] });
  if (process.env.SEED_DEMO_ADMIN === "true") {
    const admin = await createUser("admin@director-os.local", "director-admin", "Platform admin (demo)", { academicYear: null });
    const adminRole = await db.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await db.userRole.create({ data: { userId: admin.id, roleId: adminRole.id, verified: true } });
  }
  for (const u of [demo, bence, dora]) await db.cohortMembership.create({ data: { cohortId: cohort.id, userId: u.id } });

  // ── Projects ──
  type LinkSeed = { skill: string; level: number | null; relevance?: "PRIMARY" | "SECONDARY" | "INCIDENTAL"; difficulty?: number; justification?: string };
  const projects: Array<{
    key: string;
    data: Omit<Prisma.ProjectUncheckedCreateInput, "ownerId">;
    links: LinkSeed[];
    evidence: Array<Omit<Prisma.ProjectEvidenceUncheckedCreateInput, "projectId">>;
    collaborators: Array<{ name: string; role: string; userId?: string }>;
  }> = [
    {
      key: "kitchen",
      data: {
        title: "Kitchen Table",
        type: "DIALOGUE_SCENE",
        logline: "A mother and her adult son pretend a dinner is ordinary the night before he emigrates.",
        description: "Three-page dialogue exercise for the first-semester directing workshop. Two actors, one location, a single evening shoot.",
        startDate: at(2025, 10, 6),
        endDate: at(2025, 10, 24),
        course: "Directing Workshop I",
        semester: 1,
        objectives: ["Direct subtext without stating it", "Keep a static scene alive through small physical actions"],
        challenges: "The actors played the argument too early. I kept giving result notes ('be more upset') until my tutor stopped me.",
        status: "COMPLETED",
        completedAt: at(2025, 10, 24),
        createdAt: at(2025, 10, 6),
      },
      links: [
        { skill: "actor.communication", level: 2, justification: "Gave objectives, but slipped into result direction under pressure." },
        { skill: "story.scene-objectives", level: 3, justification: "Wrote a turn for every beat and designed toward the final silence." },
        { skill: "visual.blocking", level: 2, relevance: "SECONDARY", justification: "Simple movement around the table with a clear spatial idea." },
        { skill: "actor.subtext-communication", level: null, relevance: "SECONDARY" },
      ],
      evidence: [
        { kind: "SCRIPT", title: "Kitchen Table — shooting script v3", description: "Annotated with beats and actions.", createdAt: at(2025, 10, 10) },
        { kind: "DIRECTORS_NOTES", title: "Beat breakdown", description: "Objectives and tactics for each beat.", createdAt: at(2025, 10, 12) },
      ],
      collaborators: [
        { name: "Dóra Mészáros", role: "Lead actor (Mother)", userId: dora.id },
        { name: "Márk Takács", role: "Actor (Son)" },
      ],
    },
    {
      key: "tarr",
      data: {
        title: "Reading Tarr: the long take in Werckmeister Harmonies",
        type: "FILM_ANALYSIS",
        description: "Written analysis of the opening tavern scene — how duration and camera choreography build meaning.",
        startDate: at(2025, 11, 3),
        endDate: at(2025, 11, 28),
        course: "Film Language & Analysis",
        semester: 1,
        objectives: ["Analyse camera choreography shot by shot", "Connect duration to theme"],
        status: "COMPLETED",
        completedAt: at(2025, 11, 28),
        createdAt: at(2025, 11, 3),
      },
      links: [
        { skill: "analysis.scene-analysis", level: 3, justification: "Shot-by-shot breakdown connected to effect." },
        { skill: "analysis.film-history", level: 2, relevance: "SECONDARY" },
        { skill: "analysis.argumentation", level: 3, relevance: "SECONDARY" },
      ],
      evidence: [{ kind: "DOCUMENT_LINK", title: "Essay (PDF on university drive)", url: "https://example.org/essays/tarr-long-take", createdAt: at(2025, 11, 28) }],
      collaborators: [],
    },
    {
      key: "platform",
      data: {
        title: "Platform 4",
        type: "SILENT_EXERCISE",
        logline: "A woman waits for a train she has already decided not to take.",
        description: "Silent exercise: communicate a change of mind without dialogue. Shot at Nyugati station in one morning.",
        startDate: at(2026, 2, 16),
        endDate: at(2026, 3, 20),
        course: "Visual Storytelling II",
        semester: 2,
        objectives: ["Show an emotional decision without words", "Use composition to isolate the character"],
        challenges: "Station security limited us to 90 minutes. We dropped two setups and I had to rethink the ending on the spot.",
        status: "COMPLETED",
        completedAt: at(2026, 3, 20),
        createdAt: at(2026, 2, 16),
      },
      links: [
        { skill: "visual.without-dialogue", level: 3, difficulty: 3, justification: "Test viewers described the change of mind correctly." },
        { skill: "visual.composition", level: 3, justification: "Used negative space to isolate her in the crowd." },
        { skill: "actor.emotional-direction", level: 2, relevance: "SECONDARY" },
        { skill: "leadership.adaptability", level: 3, relevance: "SECONDARY", difficulty: 3, justification: "Reworked the ending when we lost two setups." },
      ],
      evidence: [
        { kind: "STORYBOARD", title: "12-panel storyboard", createdAt: at(2026, 2, 20) },
        { kind: "VIDEO_LINK", title: "Final cut (private Vimeo link)", url: "https://vimeo.com/000000000", rightsConfirmed: true, createdAt: at(2026, 3, 20) },
      ],
      collaborators: [
        { name: "Bence Halász", role: "Cinematographer", userId: bence.id },
        { name: "Anna Kiss", role: "Actor" },
      ],
    },
    {
      key: "night",
      data: {
        title: "Night Shift",
        type: "SHORT_FILM",
        logline: "Two night-shift nurses cover for each other's mistakes until one of them can't.",
        description: "Eight-minute short film, second-year production. Two shoot nights in a decommissioned clinic in Óbuda.",
        startDate: at(2026, 5, 4),
        course: "Short Film Production",
        semester: 3,
        objectives: ["Choreograph long takes through a corridor", "Build tension from a mundane routine", "Run a crew of eight"],
        challenges: "We fell three hours behind on night one. I cut a whole coverage pass and relied on the oner.",
        status: "POST_PRODUCTION",
        visibility: "COLLABORATORS",
        createdAt: at(2026, 5, 4),
      },
      links: [
        { skill: "visual.blocking", level: 3, difficulty: 3, justification: "Corridor oner coordinates two actors, a trolley and a camera move." },
        { skill: "visual.movement-motivation", level: 3, difficulty: 3, justification: "Camera follows the trolley, then holds when she stops." },
        { skill: "leadership.time-management", level: 2, difficulty: 3, justification: "Lost three hours; prioritised the oner, but too late." },
        { skill: "technical.lighting-motivation", level: null, relevance: "SECONDARY" },
        { skill: "story.tension", level: 3, relevance: "SECONDARY" },
      ],
      evidence: [
        { kind: "SHOT_LIST", title: "Shot list & floor plans", createdAt: at(2026, 9, 18) },
        { kind: "DIRECTORS_NOTES", title: "Director's statement", createdAt: at(2026, 9, 10) },
      ],
      collaborators: [
        { name: "Bence Halász", role: "Cinematographer", userId: bence.id },
        { name: "Dóra Mészáros", role: "Lead actor (Eszter)", userId: dora.id },
        { name: "Levente Szabó", role: "Assistant director" },
      ],
    },
  ];

  const projectIds: Record<string, string> = {};
  for (const p of projects) {
    const created = await db.project.create({ data: { ...p.data, ownerId: demo.id } });
    projectIds[p.key] = created.id;
    const createdAt = p.data.createdAt as Date;
    for (const e of p.evidence) await db.projectEvidence.create({ data: { ...e, projectId: created.id } });
    for (const c of p.collaborators) await db.projectCollaborator.create({ data: { projectId: created.id, ...c } });
    for (const l of p.links) {
      await db.skillEvidenceLink.create({
        data: {
          projectId: created.id,
          skillId: l.skill,
          relevance: l.relevance ?? "PRIMARY",
          difficulty: l.difficulty ?? 2,
          demonstratedLevel: l.level,
          justification: l.justification,
          createdAt: (p.data.completedAt as Date | undefined) ?? new Date(createdAt.getTime() + 20 * 86400000),
        },
      });
    }
    await xp(demo.id, "PROJECT_CREATED", created.id, createdAt);
    if (p.data.completedAt) await xp(demo.id, "PROJECT_COMPLETED", created.id, p.data.completedAt as Date);
  }

  // ── Self-assessments (showing change over time) ──
  const selfs: Array<[string, number, Date, string | null, string | null]> = [
    ["actor.communication", 3, at(2025, 9, 20), null, null],
    ["visual.composition", 2, at(2025, 9, 20), null, null],
    ["story.scene-objectives", 2, at(2025, 9, 20), null, null],
    ["visual.blocking", 2, at(2025, 9, 20), null, null],
    ["actor.communication", 2, at(2025, 11, 2), "After Kitchen Table I realised I default to result direction when I'm nervous. Lowering my own rating — I can do it in rehearsal, not under pressure.", "kitchen"],
    ["visual.composition", 3, at(2026, 3, 25), "Platform 4 forced me to plan every frame. Test viewers found the character immediately in crowded frames.", "platform"],
    ["visual.blocking", 3, at(2026, 9, 25), "The Night Shift corridor oner is the most complex blocking I've designed: two actors, a trolley, and a camera that has to stop exactly on her hesitation.", "night"],
    ["leadership.time-management", 2, at(2026, 9, 25), "I lost three hours on night one. I prioritise too late.", "night"],
    ["analysis.scene-analysis", 3, at(2025, 12, 1), "My Tarr essay was the first time I could explain why a long take works rather than just that it does.", "tarr"],
    ["vision.style-exploration", 2, at(2026, 6, 1), null, null],
  ];
  for (const [skillId, level, when, reflection, projKey] of selfs) {
    await db.selfAssessment.create({
      data: {
        userId: demo.id,
        skillId,
        rubricId: await rubricId(skillId),
        level,
        reflection,
        exampleProjectId: projKey ? projectIds[projKey] : null,
        createdAt: when,
      },
    });
    await xp(demo.id, "SELF_ASSESSMENT", `${skillId}@${when.toISOString()}`, when);
  }

  // ── Peer reviews ──
  async function review(opts: {
    reviewer: { id: string };
    projectKey: string;
    relation: string;
    when: Date;
    familiarity: "BRIEF" | "WORKED_ALONGSIDE" | "CLOSE_COLLABORATOR";
    anonymous?: boolean;
    overall: string;
    items: Array<[string, Prisma.PeerReviewItemCreateWithoutReviewInput["observation"], string | null]>;
  }) {
    const req = await db.peerReviewRequest.create({
      data: {
        requesterId: demo.id,
        reviewerId: opts.reviewer.id,
        projectId: projectIds[opts.projectKey],
        reviewerRelation: opts.relation,
        message: "Could you give me honest feedback on these specific skills? Only rate what you actually saw.",
        status: "COMPLETED",
        createdAt: new Date(opts.when.getTime() - 5 * 86400000),
        respondedAt: opts.when,
        skills: { create: opts.items.map(([skillId]) => ({ skillId })) },
      },
    });
    const r = await db.peerReview.create({
      data: {
        requestId: req.id,
        reviewerId: opts.reviewer.id,
        subjectId: demo.id,
        projectId: projectIds[opts.projectKey],
        familiarity: opts.familiarity,
        overallComment: opts.overall,
        anonymousToSubject: opts.anonymous ?? false,
        submittedAt: opts.when,
      },
    });
    for (const [skillId, observation, comment] of opts.items) {
      await db.peerReviewItem.create({ data: { reviewId: r.id, skillId, rubricId: await rubricId(skillId), observation, comment } });
    }
    await xp(demo.id, "FEEDBACK_RECEIVED", r.id, opts.when);
    await xp(opts.reviewer.id, "REVIEW_GIVEN", r.id, opts.when);
  }

  await review({
    reviewer: dora,
    projectKey: "kitchen",
    relation: "Lead actor",
    when: at(2025, 10, 30),
    familiarity: "CLOSE_COLLABORATOR",
    overall: "You clearly knew what the scene was about. On the day you got nervous and started describing feelings instead of giving me something to do.",
    items: [
      ["actor.communication", "DEMONSTRATED_WITH_SUPPORT", "In rehearsal your actions ('to keep him at the table') were great. On the shoot day the notes became 'sadder, but hold it in'."],
      ["story.scene-objectives", "DEMONSTRATED_INDEPENDENTLY", "Every beat had a clear purpose. I always knew where we were in the scene."],
      ["visual.blocking", "NOT_OBSERVED", null],
    ],
  });
  await review({
    reviewer: bence,
    projectKey: "platform",
    relation: "Cinematographer",
    when: at(2026, 3, 28),
    familiarity: "CLOSE_COLLABORATOR",
    overall: "Strong visual instincts and very well prepared boards. When we lost the setups you made a decision fast.",
    items: [
      ["visual.composition", "DEMONSTRATED_INDEPENDENTLY", "Knew exactly where she should sit in the frame for each beat; the negative-space idea was yours."],
      ["visual.without-dialogue", "DEMONSTRATED_INDEPENDENTLY", "The change of mind reads without a word. The shoe close-up does it."],
      ["leadership.adaptability", "DEMONSTRATED_CONSISTENTLY", "Security cut us to 90 minutes — you reboarded the ending in five minutes on a coffee cup lid."],
    ],
  });
  await review({
    reviewer: bence,
    projectKey: "night",
    relation: "Cinematographer",
    when: at(2026, 9, 22),
    familiarity: "CLOSE_COLLABORATOR",
    overall: "The corridor oner is the best thing we've made together. Time management on night one was rough.",
    items: [
      ["visual.blocking", "DEMONSTRATED_INDEPENDENTLY", "The corridor choreography was precise and every move had a reason. We did it in eleven takes."],
      ["visual.movement-motivation", "DEMONSTRATED_INDEPENDENTLY", "The hold when Eszter stops at the door was motivated and the whole crew felt it."],
      ["leadership.time-management", "OBSERVED_WITH_DIFFICULTY", "We were three hours behind before you decided to cut the coverage pass. That call should have come at 1am, not 4am."],
      ["technical.lighting-motivation", "DEMONSTRATED_WITH_SUPPORT", "You asked for practical-only light and trusted us with it."],
    ],
  });
  await review({
    reviewer: dora,
    projectKey: "night",
    relation: "Lead actor",
    when: at(2026, 9, 24),
    familiarity: "CLOSE_COLLABORATOR",
    anonymous: true,
    overall: "Much clearer communication than last year. You gave me actions and then left me alone to find it.",
    items: [
      ["actor.communication", "DEMONSTRATED_INDEPENDENTLY", "'To get through the shift without being seen' was the most useful note I've had at school."],
      ["visual.blocking", "DEMONSTRATED_CONSISTENTLY", "The blocking felt natural to play even though it was technically very precise."],
      ["actor.trust", "DEMONSTRATED_INDEPENDENTLY", "I trusted you with the breakdown scene because you'd prepared me for it."],
    ],
  });

  // A pending request the demo student needs to answer (they review Bence).
  const bencePractice = await db.project.create({
    data: {
      ownerId: bence.id,
      title: "Concrete Garden",
      type: "MUSIC_VIDEO",
      description: "Music video for a Budapest post-punk band, shot in a housing estate courtyard. Bence directed and shot.",
      semester: 3,
      status: "COMPLETED",
      completedAt: at(2026, 10, 2),
      objectives: ["Direct performers who aren't actors", "Plan coverage for a three-minute track in one day"],
      createdAt: at(2026, 9, 1),
    },
  });
  await db.projectCollaborator.create({ data: { projectId: bencePractice.id, userId: demo.id, name: "Noémi Kardos", role: "Assistant director" } });
  await db.peerReviewRequest.create({
    data: {
      requesterId: bence.id,
      reviewerId: demo.id,
      projectId: bencePractice.id,
      reviewerRelation: "Assistant director",
      message: "You were my AD on Concrete Garden — would you rate the skills below? Skip anything you didn't see.",
      createdAt: at(2026, 10, 20),
      skills: { create: [{ skillId: "actor.nonprofessional" }, { skillId: "technical.coverage-planning" }, { skillId: "leadership.set-leadership" }] },
    },
  });
  await db.notification.create({
    data: { userId: demo.id, kind: "REVIEW_REQUESTED", title: "Bence Halász (demo) asked for your feedback", body: "Concrete Garden — 3 skills", href: "/feedback", createdAt: at(2026, 10, 20) },
  });

  // ── Reflections ──
  const reflections: Array<{ project: string; title: string; when: Date; answers: Record<string, string> }> = [
    {
      project: "kitchen",
      title: "What Kitchen Table taught me about notes",
      when: at(2025, 10, 28),
      answers: {
        intention: "I wanted the audience to feel the son's departure in everything except the dialogue.",
        worked: "The final silence. Dóra kept clearing plates while Márk sat still — that image says everything.",
        didnt: "My notes. Under time pressure I started asking for emotions instead of actions, and the performances got bigger and less true.",
        learned: "Preparation of actions isn't enough; I need to rehearse giving notes in the moment too.",
        differently: "I'd write three backup actions per beat so I never reach for result direction.",
      },
    },
    {
      project: "platform",
      title: "Platform 4 — working against the clock",
      when: at(2026, 3, 24),
      answers: {
        intention: "Show a decision forming in someone's body before they know it themselves.",
        worked: "The composition plan. Isolating her with negative space read clearly to every test viewer.",
        didnt: "We lost two setups to station security, and the ending I'd storyboarded was impossible.",
        difficult: "Choosing which shot to sacrifice. I kept the shoe close-up and lost the wide reveal.",
        learned: "A constraint can clarify the idea. The new ending is simpler and better.",
        next: "I want to direct actors in emotional scenes with more confidence — that is still my weakest area.",
      },
    },
    {
      project: "night",
      title: "Night Shift — the corridor and the clock",
      when: at(2026, 9, 26),
      answers: {
        intention: "Build tension from routine: two nurses doing small favours that become a cover-up.",
        worked: "The corridor oner. Blocking the trolley, both actors and the camera so the move stops exactly on Eszter's hesitation took two rehearsals and eleven takes, but it carries the film.",
        didnt: "Time management. We were three hours behind on night one; I made the call to cut the coverage pass far too late.",
        feedback: "Bence's note that the call should have come at 1am, not 4am, is fair. Dóra said my notes were much clearer than last year, which matters to me.",
        differently: "Mark the shot list A/B/C before the shoot and agree a hard cut-off time with the AD.",
        next: "Time management and coverage planning. I'd like to try the Four Setups challenge.",
      },
    },
  ];
  for (const r of reflections) {
    const body = Object.values(r.answers).join("\n\n");
    const created = await db.reflection.create({
      data: { userId: demo.id, projectId: projectIds[r.project], title: r.title, answers: r.answers, body, createdAt: r.when },
    });
    await xp(demo.id, "REFLECTION", created.id, r.when, reflectionQuality(body, Object.keys(r.answers).length));
  }

  // ── Goals & challenges ──
  await db.learningGoal.create({
    data: {
      userId: demo.id,
      title: "Make the day without losing what matters",
      description: "Prioritise earlier on set and plan coverage I can actually shoot.",
      targetSemester: 4,
      createdAt: at(2026, 9, 27),
      skills: { create: [{ skillId: "leadership.time-management" }, { skillId: "technical.coverage-planning" }] },
    },
  });
  await db.learningGoal.create({
    data: {
      userId: demo.id,
      title: "Direct emotional scenes with more confidence",
      targetSemester: 4,
      createdAt: at(2026, 3, 25),
      skills: { create: [{ skillId: "actor.emotional-direction" }, { skillId: "actor.actionable-notes" }] },
    },
  });
  await db.challengeCompletion.create({
    data: { userId: demo.id, challengeId: "silent-emotional-scene", status: "COMPLETED", projectId: projectIds.platform, startedAt: at(2026, 2, 10), completedAt: at(2026, 3, 20) },
  });
  await xp(demo.id, "CHALLENGE_COMPLETED", "silent-emotional-scene", at(2026, 3, 20));
  await db.challengeCompletion.create({
    data: { userId: demo.id, challengeId: "four-setups", status: "ACCEPTED", personalNotes: "Do it on the Night Shift pickup day — 3 setups only for the canteen scene.", startedAt: at(2026, 9, 28) },
  });

  // ── Mastery history: snapshot at the end of each past semester, then now ──
  for (const sem of [1, 2]) {
    await recomputeMastery(demo.id, undefined, new Date(semesterRange(ENROLL, sem).end.getTime() - 1000));
  }
  await recomputeMastery(demo.id);
  await recomputeMastery(bence.id);

  console.log(`✓ demo accounts: demo@director-os.local / director-demo (plus bence@, dora@${process.env.SEED_DEMO_ADMIN === "true" ? ", admin@" : ""})`);
}

async function main() {
  await seedTaxonomy();
  if (process.env.SEED_DEMO !== "false") await seedDemo();
  if (process.env.SEED_ADMIN_EMAIL) {
    const user = await db.user.findUnique({ where: { email: process.env.SEED_ADMIN_EMAIL } });
    const role = await db.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    if (user && !(await db.userRole.findFirst({ where: { userId: user.id, roleId: role.id } }))) {
      await db.userRole.create({ data: { userId: user.id, roleId: role.id, verified: true } });
      console.log(`✓ granted ADMIN to ${user.email}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
