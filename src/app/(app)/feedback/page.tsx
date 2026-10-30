import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Inbox, Send, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canSeeReviewerIdentity } from "@/lib/auth/policy";
import { toViewer } from "@/lib/services/access";
import { OBSERVATION_LABEL, formatDate, relativeTime } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/misc";
import { ConfirmButton } from "../projects/[id]/widgets";
import { cancelRequest } from "./actions";

export const metadata: Metadata = { title: "Feedback" };

const STATUS_TONE = { PENDING: "amber", COMPLETED: "success", DECLINED: "neutral", CANCELLED: "neutral" } as const;

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ sent?: string; reviewed?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const viewer = await toViewer(user);
  const [incoming, sent, received, written] = await Promise.all([
    db.peerReviewRequest.findMany({
      where: { reviewerId: user.id, status: "PENDING" },
      include: { requester: { include: { profile: true } }, project: { select: { title: true } }, skills: { include: { skill: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.peerReviewRequest.findMany({
      where: { requesterId: user.id },
      include: { reviewer: { include: { profile: true } }, project: { select: { title: true } }, skills: { include: { skill: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.peerReview.findMany({
      where: { subjectId: user.id },
      include: { reviewer: { include: { profile: true } }, project: { select: { id: true, title: true } }, items: { include: { skill: true } }, request: true },
      orderBy: { submittedAt: "desc" },
    }),
    db.peerReview.findMany({
      where: { reviewerId: user.id },
      include: { subject: { include: { profile: true } }, project: { select: { title: true } }, items: true },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  return (
    <Page>
      <PageHeader
        eyebrow="Collaboration"
        title="Feedback"
        description="Structured, skill-specific feedback from the people who actually saw you work. Private to you and the reviewer."
        actions={<LinkButton href="/feedback/request">Request feedback</LinkButton>}
      />
      {sp.sent && <div className="mb-6 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">Request sent. The reviewer can decline without giving a reason.</div>}
      {sp.reviewed && <div className="mb-6 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">Thank you — your review was submitted.</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Waiting on you" title={`Requests for your feedback (${incoming.length})`} />
          <div className="p-5">
            {incoming.length === 0 ? (
              <EmptyState icon={<Inbox className="size-5" />} title="Nothing to review" />
            ) : (
              <ul className="space-y-2">
                {incoming.map((r) => (
                  <li key={r.id}>
                    <Link href={`/feedback/review/${r.id}`} className="flex items-center gap-3 rounded-xl border border-amber/25 bg-amber-soft px-4 py-3 hover:brightness-110">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-text">{r.requester.profile?.displayName}</div>
                        <div className="text-xs text-muted truncate">
                          {r.project?.title ?? "General feedback"} · as {r.reviewerRelation} · {r.skills.map((s) => s.skill.name).join(", ")}
                        </div>
                      </div>
                      <span className="text-[11px] text-faint">{relativeTime(r.createdAt)}</span>
                      <ArrowRight className="size-4 text-amber" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Sent" title="Your requests" />
          <div className="p-5">
            {sent.length === 0 ? (
              <EmptyState icon={<Send className="size-5" />} title="No requests yet">
                After a project, ask a collaborator to assess two to four specific skills they observed.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line-soft">
                {sent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        {r.reviewer.profile?.displayName} <span className="text-faint">· {r.project?.title ?? "General"}</span>
                      </div>
                      <div className="text-xs text-faint truncate">{r.skills.map((s) => s.skill.name).join(", ")}</div>
                    </div>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status.toLowerCase()}</Badge>
                    {r.status === "PENDING" && <ConfirmButton action={cancelRequest.bind(null, r.id)} label="" icon confirmText="Cancel this request?" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-3xl">Feedback you received</h2>
          <span className="flex items-center gap-1.5 text-xs text-faint">
            <ShieldCheck className="size-3.5" aria-hidden /> Only you and each reviewer can see these
          </span>
        </div>
        {received.length === 0 ? (
          <EmptyState title="No feedback yet">Peer feedback carries the most weight in your skill estimates — and has diminishing returns from any single person.</EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {received.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{canSeeReviewerIdentity(viewer, r) ? r.reviewer.profile?.displayName : "Anonymous collaborator"}</div>
                    <div className="text-xs text-faint">
                      {r.request.reviewerRelation} · {r.project ? <Link href={`/projects/${r.project.id}`} className="hover:text-text">{r.project.title}</Link> : "General"} · {formatDate(r.submittedAt)}
                    </div>
                  </div>
                  <Badge>{r.familiarity.replace(/_/g, " ").toLowerCase()}</Badge>
                </div>
                {r.overallComment && <p className="mt-3 text-sm text-muted italic leading-relaxed">“{r.overallComment}”</p>}
                <ul className="mt-4 space-y-3">
                  {r.items.map((i) => (
                    <li key={i.id}>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Link href={`/skills?skill=${i.skillId}`} className="text-text hover:text-accent-strong">
                          {i.skill.name}
                        </Link>
                        <Badge tone={i.observation === "NOT_OBSERVED" || i.observation === "INSUFFICIENT_EVIDENCE" ? "outline" : "accent"}>{OBSERVATION_LABEL[i.observation]}</Badge>
                      </div>
                      {i.comment && <p className="mt-1 text-xs text-muted leading-relaxed">{i.comment}</p>}
                      {i.example && <p className="mt-1 text-xs text-faint">Example: {i.example}</p>}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      {written.length > 0 && (
        <section className="mt-10">
          <h2 className="slate-label mb-3">Reviews you have written</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {written.map((r) => (
              <li key={r.id} className="card px-4 py-3 text-sm">
                {r.subject.profile?.displayName} · {r.project?.title ?? "General"} <span className="text-xs text-faint">· {r.items.length} skills · {formatDate(r.submittedAt)}{r.anonymousToSubject ? " · anonymous" : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
