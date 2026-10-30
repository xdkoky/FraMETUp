import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTaxonomy } from "@/lib/services/taxonomy";

import { Page } from "@/components/shell/page";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { getFormat, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Self-assessment") };
}

const STARTER = ["visual.composition", "visual.blocking", "actor.communication", "story.scene-objectives", "technical.coverage-planning", "leadership.preparation", "analysis.scene-analysis", "professional.receiving-criticism"];

export default async function AssessIndex({ searchParams }: { searchParams: Promise<{ done?: string; category?: string }> }) {
  const fmt = await getFormat();
  const t = await getT();
  const user = await requireUser();
  const { done, category } = await searchParams;
  const taxonomy = await getTaxonomy();
  const latest = await db.selfAssessment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, distinct: ["skillId"] });
  const bySkill = new Map(latest.map((l) => [l.skillId, l]));
  const starterLeft = STARTER.filter((s) => !bySkill.has(s));

  return (
    <Page>
      <PageHeader
        eyebrow={t("Structured self-assessment")}
        title={t("Where are you now?")}
        description={t("Pick the rubric descriptor that honestly matches what you can do today. You can reassess any time — earlier answers are kept as history, never overwritten.")}
      />
      {done && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
          <CheckCircle2 className="size-4" aria-hidden />{" "}{t("Saved")}{" "}{taxonomy.skillById[done]?.name}{t(". Your development overview has been updated.")}
        </div>
      )}
      {starterLeft.length > 0 && !category && (
        <Card className="mb-8 p-5">
          <div className="slate-label mb-1">{t("Quick start · optional")}</div>
          <h2 className="text-[15px] font-semibold">{t("Eight foundational skills, one from each area")}</h2>
          <p className="mt-1 text-sm text-muted">{t("Takes about five minutes. Skip any you're unsure about — unassessed is perfectly fine.")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {starterLeft.map((id) => (
              <Link key={id} href={`/assess/${id}?next=queue`} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-text hover:border-faint">
                {taxonomy.skillById[id]?.name}
              </Link>
            ))}
          </div>
        </Card>
      )}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/assess" className={`rounded-md border px-2.5 py-1 text-xs ${!category ? "border-accent text-accent" : "border-line text-muted"}`}>
          {t("All")}
        </Link>
        {taxonomy.categories.map((c) => (
          <Link key={c.id} href={`/assess?category=${c.id}`} className={`rounded-md border px-2.5 py-1 text-xs ${category === c.id ? "border-accent text-accent" : "border-line text-muted hover:text-text"}`}>
            {c.code} · {c.name}
          </Link>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {taxonomy.categories
          .filter((c) => !category || c.id === category)
          .map((c) => (
            <Card key={c.id} className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className="font-mono" style={{ color: c.color }}>
                  {c.code}
                </span>
                {c.name}
              </h2>
              <ul className="mt-3 divide-y divide-line-soft">
                {taxonomy.skills
                  .filter((s) => s.categoryId === c.id && !s.archived)
                  .map((s) => {
                    const l = bySkill.get(s.id);
                    return (
                      <li key={s.id}>
                        <Link href={`/assess/${s.id}`} className="flex items-center gap-3 py-2 text-sm hover:text-accent-strong">
                          <span className="flex-1">{s.name}</span>
                          {l ? (
                            <span className="text-xs text-faint">
                              <Badge tone="accent">L{l.level}</Badge> <span className="ml-1">{fmt.date(l.createdAt, { month: "short", year: "numeric" })}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-faint">—</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </Card>
          ))}
      </div>
    </Page>
  );
}
