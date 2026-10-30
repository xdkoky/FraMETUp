import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canRespondToRequest } from "@/lib/auth/policy";
import { toViewer } from "@/lib/services/access";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { Page } from "@/components/shell/page";
import { Card, PageHeader } from "@/components/ui/misc";
import { ReviewForm } from "./review-form";
import { declineRequest, submitReview } from "../../actions";

export const metadata: Metadata = { title: "Give feedback" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const req = await db.peerReviewRequest.findUnique({
    where: { id },
    include: { requester: { include: { profile: true } }, project: true, skills: true },
  });
  if (!req || !canRespondToRequest(await toViewer(user), req)) notFound();
  const taxonomy = await getTaxonomy();
  return (
    <Page className="max-w-3xl">
      <PageHeader
        eyebrow={`Feedback for ${req.requester.profile?.displayName}`}
        title={req.project ? req.project.title : "General feedback"}
        description={`You were asked as ${req.reviewerRelation}. Rate only what you actually observed — “Not observed” is always a valid answer and is never counted against them.`}
      />
      {req.message && <blockquote className="mb-6 border-l-2 border-accent pl-4 text-muted italic">“{req.message}”</blockquote>}
      {req.project && (
        <Card className="mb-6 p-4 text-sm text-muted">
          <span className="text-text font-medium">{req.project.title}</span> — {req.project.description}
        </Card>
      )}
      <ReviewForm
        action={submitReview.bind(null, req.id)}
        decline={declineRequest.bind(null, req.id)}
        skills={req.skills.map((s) => {
          const sk = taxonomy.skillById[s.skillId];
          return { id: s.skillId, name: sk.name, description: sk.description, levels: sk.levels };
        })}
      />
    </Page>
  );
}
