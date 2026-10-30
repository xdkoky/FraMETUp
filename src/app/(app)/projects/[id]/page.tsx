import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileText, MessageSquarePlus, NotebookPen, Pencil, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertCanViewProject, toViewer } from "@/lib/services/access";
import { canEditProject, canSeeReviewerIdentity, canViewReflection } from "@/lib/auth/policy";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { UPLOAD_MAX_BYTES } from "@/lib/uploads";
import { semesterLabel } from "@/lib/semester";
import { OBSERVATION_LABEL, PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL, VISIBILITY_LABEL } from "@/lib/utils";
import { REFLECTION_PROMPTS } from "@/lib/reflection";
import { Page } from "@/components/shell/page";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/misc";
import {
  addCollaborator,
  addEvidence,
  deleteProject,
  deleteReflection,
  linkSkill,
  removeCollaborator,
  removeEvidence,
  setProjectStatus,
  unlinkSkill,
} from "../actions";
import { CollaboratorForm, ConfirmButton, EvidenceForm, SkillLinkForm, StatusSelect } from "./widgets";
import { ReflectionAI, type StoredAnalysis } from "./reflection-ai";
import type { ReflectionAnalysis } from "@/lib/ai/types";
import { getFormat, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Project") };
}

const EVIDENCE_KIND_LABEL: Record<string, string> = {
  SCRIPT: "Script",
  STORYBOARD: "Storyboard",
  SHOT_LIST: "Shot list / floor plan",
  DIRECTORS_NOTES: "Director's notes",
  VIDEO_LINK: "Video link",
  DOCUMENT_LINK: "Document link",
  FILE: "File",
  NOTE: "Note",
};
const RELEVANCE_LABEL = { PRIMARY: "Primary", SECONDARY: "Secondary", INCIDENTAL: "Incidental" } as const;
const DIFFICULTY_LABEL = ["", "Routine", "Stretching", "Demanding"];

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; reflected?: string; link?: string }>;
}) {
  const { skillById } = await getTaxonomy();
  const fmt = await getFormat();
  const t = await getT();
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  await assertCanViewProject(user, id);
  const viewer = await toViewer(user);

  const project = await db.project.findUnique({
    where: { id },
    include: {
      owner: { include: { profile: true } },
      collaborators: { include: { user: { include: { profile: true } } }, orderBy: { createdAt: "asc" } },
      evidence: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      skillLinks: { include: { skill: true }, orderBy: [{ relevance: "asc" }, { createdAt: "asc" }] },
      reflections: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      reviews: { include: { reviewer: { include: { profile: true } }, items: { include: { skill: true } } }, orderBy: { submittedAt: "desc" } },
    },
  });
  if (!project) notFound();

  const isOwner = canEditProject(viewer, project);
  const taxonomy = await getTaxonomy();
  const collaboratorUserIds = project.collaborators.map((c) => c.userId).filter((x): x is string => Boolean(x));
  const reflections = project.reflections.filter((r) => canViewReflection(viewer, { ...r, ownerId: r.userId, projectCollaboratorUserIds: collaboratorUserIds }));
  // Reviews are private to the subject (owner) and the reviewer.
  const reviews = project.reviews.filter((r) => r.subjectId === user.id || r.reviewerId === user.id);

  const analyses = isOwner
    ? await db.aIAssessment.findMany({
        where: { userId: user.id, inputType: "reflection", inputId: { in: reflections.map((r) => r.id) } },
        include: { suggestions: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const latestAnalysis = (reflectionId: string): StoredAnalysis | null => {
    const a = analyses.find((x) => x.inputId === reflectionId);
    if (!a) return null;
    const out = a.output as unknown as ReflectionAnalysis;
    return {
      provider: a.provider,
      model: a.model,
      createdAt: a.createdAt.toISOString(),
      summary: out.summary,
      questions: out.questions,
      missingEvidence: out.missingEvidence,
      exercises: out.exercises,
      suggestions: a.suggestions.map((s) => ({
        id: s.id,
        skillId: s.skillId,
        skillName: taxonomy.skillById[s.skillId]?.name ?? s.skillId,
        rationale: s.rationale,
        evidenceQuote: s.evidenceQuote,
        suggestedLevel: s.suggestedLevel,
        confidence: s.confidence,
        status: s.status,
      })),
    };
  };
  const skillNames = Object.fromEntries(taxonomy.skills.map((s) => [s.id, s.name]));
  const pickerSkills = taxonomy.skills
    .filter((s) => !s.archived)
    .map((s) => ({ id: s.id, name: s.name, categoryId: s.categoryId, categoryName: taxonomy.categoryById[s.categoryId].name, levels: s.levels }));

  return (
    <Page>
      {sp.created && (
        <div className="mb-6 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent-strong">
          {t("Project created. Next: link the skills it exercised, then add evidence such as a shot list or a private link to the cut.")}
        </div>
      )}
      {sp.reflected && <div className="mb-6 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">{t("Reflection saved. It is private to you.")}</div>}

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
          <Link href="/projects" className="hover:text-text">
            {t("Projects")}
          </Link>
          <span>/</span>
          <span>{t(PROJECT_TYPE_LABEL[project.type])}</span>
          {project.semester && <span>· {semesterLabel(user.enrollmentYear, project.semester, t)}</span>}
          {project.course && <span>· {project.course}</span>}
        </div>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl leading-tight">{project.title}</h1>
            {project.logline && <p className="mt-2 text-lg text-muted italic">{project.logline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!isOwner && <Badge tone="outline">{t("Owned by")}{" "}{project.owner.profile?.displayName}</Badge>}
              <Badge>{project.studentRole}</Badge>
              <Badge tone="outline">{t(VISIBILITY_LABEL[project.visibility])}</Badge>
              <span className="text-xs text-faint">
                {fmt.date(project.startDate)} – {project.endDate ? fmt.date(project.endDate) : "ongoing"}
              </span>
            </div>
          </div>
          {isOwner ? (
            <div className="flex flex-wrap items-center gap-2">
              <StatusSelect action={setProjectStatus.bind(null, project.id)} status={project.status} />
              <LinkButton href={`/projects/${project.id}/edit`} variant="secondary" size="sm">
                <Pencil className="size-3.5" aria-hidden />{" "}{t("Edit")}
              </LinkButton>
              <LinkButton href={`/feedback/request?project=${project.id}`} variant="secondary" size="sm">
                <MessageSquarePlus className="size-3.5" aria-hidden />{" "}{t("Request feedback")}
              </LinkButton>
              <ConfirmButton action={deleteProject.bind(null, project.id)} label={t("Delete")} variant="danger" confirmText={t("Delete this project? Its evidence will no longer count toward your skills.")} />
            </div>
          ) : (
            <Badge>{t(PROJECT_STATUS_LABEL[project.status])}</Badge>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card className="p-5">
            <p className="text-[15px] leading-relaxed text-text/90 whitespace-pre-line">{project.description}</p>
            {project.objectives.length > 0 && (
              <div className="mt-5">
                <div className="slate-label mb-2">{t("Learning objectives")}</div>
                <ul className="space-y-1.5">
                  {project.objectives.map((o) => (
                    <li key={o} className="flex gap-2 text-sm text-muted">
                      <span className="mt-2 size-1 rounded-full bg-accent shrink-0" aria-hidden />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {project.challenges && (
              <div className="mt-5">
                <div className="slate-label mb-2">{t("Challenges")}</div>
                <p className="text-sm text-muted whitespace-pre-line">{project.challenges}</p>
              </div>
            )}
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader eyebrow={t("Artifacts")} title={t("Evidence")} />
            <div className="p-5 space-y-4">
              {project.evidence.length === 0 ? (
                <p className="text-sm text-faint">{t("No evidence yet. Shot lists, storyboards, director's notes and private links to cuts all strengthen the skills linked to this project.")}</p>
              ) : (
                <ul className="divide-y divide-line-soft rounded-xl border border-line-soft">
                  {project.evidence.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <FileText className="mt-0.5 size-4 text-faint shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {e.url ? (
                            <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-text hover:text-accent-strong inline-flex items-center gap-1">
                              {e.title} <ExternalLink className="size-3" aria-hidden />
                            </a>
                          ) : e.storageKey ? (
                            <a href={`/api/files/${e.id}`} className="text-sm text-text hover:text-accent-strong">
                              {e.title}
                            </a>
                          ) : (
                            <span className="text-sm text-text">{e.title}</span>
                          )}
                          <Badge>{t(EVIDENCE_KIND_LABEL[e.kind] ?? e.kind)}</Badge>
                          {e.fileName && <span className="text-[11px] text-faint">{e.fileName} · {Math.ceil((e.sizeBytes ?? 0) / 1024)}{" "}{t("KB")}</span>}
                        </div>
                        {e.description && <p className="mt-0.5 text-xs text-muted whitespace-pre-line">{e.description}</p>}
                      </div>
                      {isOwner && <ConfirmButton action={removeEvidence.bind(null, project.id, e.id)} label="" confirmText={t("Remove this evidence?")} />}
                    </li>
                  ))}
                </ul>
              )}
              {isOwner && (
                <details className="group rounded-xl border border-dashed border-line p-4">
                  <summary className="cursor-pointer text-sm text-accent">{t("Add evidence")}</summary>
                  <div className="mt-4">
                    <EvidenceForm action={addEvidence.bind(null, project.id)} maxMb={Math.round(UPLOAD_MAX_BYTES / 1024 / 1024)} />
                  </div>
                </details>
              )}
            </div>
          </Card>

          {/* Reflections */}
          {(isOwner || reflections.length > 0) && (
            <Card>
              <CardHeader
                eyebrow={t("Private by default")}
                title={t("Reflections")}
                action={
                  isOwner && (
                    <LinkButton href={`/projects/${project.id}/reflect`} size="sm" variant="secondary">
                      <NotebookPen className="size-3.5" aria-hidden />{" "}{t("Write reflection")}
                    </LinkButton>
                  )
                }
              />
              <div className="p-5 space-y-5">
                {reflections.length === 0 ? (
                  <EmptyState title={t("No reflections yet")}>
                    {project.status === "COMPLETED" ? t("This project is complete — a good moment to reflect while it's fresh.") : t("Reflect during or after production. Honest notes now become your most useful evidence later.")}
                  </EmptyState>
                ) : (
                  reflections.map((r) => {
                    const answers = r.answers as Record<string, string>;
                    return (
                      <article key={r.id} className="rounded-xl border border-line-soft p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{r.title}</h3>
                            <div className="text-xs text-faint">
                              {fmt.date(r.createdAt)} · {r.visibility === "PRIVATE" ? t("Private") : t("Shared with collaborators")}
                            </div>
                          </div>
                          {isOwner && <ConfirmButton action={deleteReflection.bind(null, project.id, r.id)} label="" confirmText={t("Delete this reflection?")} />}
                        </div>
                        <dl className="mt-3 space-y-3">
                          {REFLECTION_PROMPTS.filter((p) => answers[p.key]).map((p) => (
                            <div key={p.key}>
                              <dt className="text-xs text-faint">{t(p.label)}</dt>
                              <dd className="mt-0.5 text-sm text-muted leading-relaxed whitespace-pre-line">{answers[p.key]}</dd>
                            </div>
                          ))}
                        </dl>
                        {isOwner && <ReflectionAI reflectionId={r.id} latest={latestAnalysis(r.id)} skillNames={skillNames} />}
                      </article>
                    );
                  })
                )}
              </div>
            </Card>
          )}

          {/* Feedback on this project */}
          {reviews.length > 0 && (
            <Card>
              <CardHeader eyebrow={t("Private to you")} title={t("Feedback on this project")} />
              <div className="p-5 space-y-4">
                {reviews.map((r) => (
                  <article key={r.id} className="rounded-xl border border-line-soft p-4">
                    <div className="text-sm font-medium">
                      {canSeeReviewerIdentity(viewer, r) ? r.reviewer.profile?.displayName : t("Anonymous collaborator")}
                      <span className="ml-2 text-xs font-normal text-faint">{fmt.date(r.submittedAt)}</span>
                    </div>
                    {r.overallComment && <p className="mt-2 text-sm text-muted italic">“{r.overallComment}”</p>}
                    <ul className="mt-3 space-y-2">
                      {r.items.map((i) => (
                        <li key={i.id} className="text-sm">
                          <span className="text-text">{(skillById[i.skillId]?.name ?? i.skill.name)}</span> — <span className="text-accent-strong">{t(OBSERVATION_LABEL[i.observation])}</span>
                          {i.comment && <p className="text-xs text-muted mt-0.5">{i.comment}</p>}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-5">
          {/* Skill links */}
          <Card>
            <CardHeader eyebrow={t("Evidence for")} title={t("Skills ({n})", { n: project.skillLinks.length })} />
            <div className="p-5 space-y-4">
              {project.skillLinks.length === 0 ? (
                <p className="text-sm text-amber">{t("No skills linked yet. Linking skills is how this project becomes evidence.")}</p>
              ) : (
                <ul className="space-y-2">
                  {project.skillLinks.map((l) => (
                    <li key={l.id} className="rounded-xl border border-line-soft p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link href={`/skills?skill=${l.skillId}`} className="flex items-center gap-2 text-sm font-medium hover:text-accent-strong">
                            <span className="size-2 rounded-full" style={{ background: taxonomy.categoryById[l.skill.categoryId].color }} aria-hidden />
                            {(skillById[l.skillId]?.name ?? l.skill.name)}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                            <Badge tone={l.demonstratedLevel ? "accent" : "outline"}>{l.demonstratedLevel ? t("Mapped to L{n}", { n: l.demonstratedLevel }) : t("Practice only")}</Badge>
                            <Badge>{t(RELEVANCE_LABEL[l.relevance])}</Badge>
                            <Badge>{t(DIFFICULTY_LABEL[l.difficulty])}</Badge>
                          </div>
                        </div>
                        {isOwner && <ConfirmButton action={unlinkSkill.bind(null, project.id, l.skillId)} label="" confirmText={t("Unlink {name}?", { name: (skillById[l.skillId]?.name ?? l.skill.name) })} />}
                      </div>
                      {l.justification && <p className="mt-2 text-xs text-muted">{l.justification}</p>}
                      {l.demonstratedLevel && <p className="mt-1.5 text-[11px] text-faint">“{taxonomy.skillById[l.skillId]?.levels[l.demonstratedLevel - 1]}”</p>}
                    </li>
                  ))}
                </ul>
              )}
              {isOwner && (
                <details className="rounded-xl border border-dashed border-line p-4" open={project.skillLinks.length === 0 || Boolean(sp.link)}>
                  <summary className="cursor-pointer text-sm text-accent">{t("Link a skill or update a mapping")}</summary>
                  <div className="mt-4">
                    <SkillLinkForm action={linkSkill.bind(null, project.id)} skills={pickerSkills} linkedIds={project.skillLinks.map((l) => l.skillId)} initialSkillId={sp.link} />
                  </div>
                </details>
              )}
            </div>
          </Card>

          {/* Collaborators */}
          <Card>
            <CardHeader eyebrow={t("Crew & cast")} title={t("Collaborators")} />
            <div className="p-5 space-y-4">
              {project.collaborators.length === 0 ? (
                <p className="text-sm text-faint">{t("Add the people you made this with. Linked collaborators can be asked for structured feedback.")}</p>
              ) : (
                <ul className="space-y-2">
                  {project.collaborators.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 text-sm">
                      <div className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-xs text-muted">
                        <Users className="size-3.5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{c.name}</div>
                        <div className="text-xs text-faint">{c.role}</div>
                      </div>
                      {c.userId && <Badge tone="accent">{t("On FraMETUp")}</Badge>}
                      {isOwner && <ConfirmButton action={removeCollaborator.bind(null, project.id, c.id)} label="" confirmText={t("Remove {name}?", { name: c.name })} />}
                    </li>
                  ))}
                </ul>
              )}
              {isOwner && (
                <details className="rounded-xl border border-dashed border-line p-4">
                  <summary className="cursor-pointer text-sm text-accent">{t("Add collaborator")}</summary>
                  <div className="mt-4">
                    <CollaboratorForm action={addCollaborator.bind(null, project.id)} />
                  </div>
                </details>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
