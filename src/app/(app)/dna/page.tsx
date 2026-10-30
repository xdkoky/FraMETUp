import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { aggregateCategory } from "@/lib/assessment/engine";
import { getDevelopment } from "@/lib/services/development";
import { computeAll } from "@/lib/services/mastery";
import { generateInsights } from "@/lib/insights";
import { semesterForDate, semesterLabel, semesterRange } from "@/lib/semester";
import { STATE_STYLE } from "@/lib/skill-state";
import { CATEGORY_BY_ID } from "@/lib/taxonomy/categories";
import { CATEGORIES_HU } from "@/lib/taxonomy/hu";
import { Page } from "@/components/shell/page";
import { Card, CardHeader, PageHeader } from "@/components/ui/misc";
import { DnaRadar } from "@/components/charts/dna-radar";
import { getFormat, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Director DNA") };
}

export default async function DnaPage({ searchParams }: { searchParams: Promise<{ compare?: string }> }) {
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const { compare } = await searchParams;
  const { taxonomy, mastery, categories } = await getDevelopment(user.id);

  const currentSem = user.enrollmentYear ? semesterForDate(user.enrollmentYear, new Date()) : null;
  const pastSems = currentSem ? Array.from({ length: currentSem - 1 }, (_, i) => currentSem - 1 - i) : [];
  const compareSem = compare ? Number(compare) : pastSems[0];
  let compareCats: Record<string, number | null> | null = null;
  if (user.enrollmentYear && compareSem && pastSems.includes(compareSem)) {
    const past = await computeAll(user.id, new Date(semesterRange(user.enrollmentYear, compareSem).end.getTime() - 1000));
    compareCats = Object.fromEntries(
      taxonomy.categories.map((c) => [c.id, aggregateCategory(c.id, taxonomy.skills.filter((s) => s.categoryId === c.id).map((s) => past[s.id])).mastery]),
    );
  }

  const insights = generateInsights(
    categories,
    Object.values(mastery).map((m) => {
      const self = m.breakdown.find((b) => b.source === "self")?.score ?? null;
      const peer = m.breakdown.find((b) => b.source === "peer")?.score ?? null;
      return { selfMinusPeer: self !== null && peer !== null ? self - peer : null };
    }),
  );

  return (
    <Page>
      <PageHeader
        eyebrow={t("Exploratory, not diagnostic")}
        title={t("Director DNA")}
        description={t("The current shape of your documented development across eight areas of directing. There's no ideal shape — great directors look very different from one another.")}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title={t("Development profile")}
            action={
              pastSems.length > 0 && (
                <form className="flex flex-wrap items-center gap-2 text-xs text-muted min-w-0">
                  <label htmlFor="compare">{t("Compare with")}</label>
                  <select id="compare" name="compare" defaultValue={compareSem} className="max-w-[14rem] rounded-md border border-line bg-ink/60 px-2 py-1 text-xs">
                    {pastSems.map((s) => (
                      <option key={s} value={s}>
                        {t("end of {sem}", { sem: semesterLabel(user.enrollmentYear, s, t) })}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-md border border-line px-2 py-1 hover:text-text">{t("Show")}</button>
                </form>
              )
            }
          />
          <div className="px-2 pb-4">
            <DnaRadar
              height={420}
              compareLabel={compareCats ? t("End of {sem}", { sem: semesterLabel(user.enrollmentYear, compareSem!, t) }) : undefined}
              data={categories.map((c) => ({
                category: (fmt.locale === "hu" ? CATEGORIES_HU[c.id]?.short : CATEGORY_BY_ID[c.id as keyof typeof CATEGORY_BY_ID]?.short) ?? c.name,
                code: c.code,
                current: c.mastery,
                compare: compareCats ? compareCats[c.id] : undefined,
                coverage: c.coverage,
              }))}
            />
            <p className="px-4 text-[11.5px] text-faint">
              {t("Each axis is a confidence-weighted estimate over assessed skills only. Categories without evidence sit at the centre and are labelled “no evidence”.")}
            </p>
          </div>
        </Card>
        <div className="space-y-6 lg:col-span-5">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="size-4 text-amber" aria-hidden />{" "}{t("Patterns in your evidence")}
            </div>
            <ul className="mt-3 space-y-3">
              {insights.map((i) => (
                <li key={i} className="text-sm text-muted leading-relaxed border-l-2 border-line pl-3">
                  {i}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <div className="slate-label mb-3">{t("Coverage")}</div>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 font-mono text-xs" style={{ color: c.color }}>
                    {c.code}
                  </span>
                  <span className="flex-1 truncate text-muted">{c.name}</span>
                  <div className="flex gap-0.5" aria-label={t("{a} of {b} skills assessed", { a: c.assessed, b: c.total })}>
                    {Array.from({ length: c.total }, (_, i) => (
                      <span key={i} className="h-3 w-1.5 rounded-sm" style={{ background: i < c.assessed ? c.color : "#262D3C" }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((c) => {
          const list = taxonomy.skills
            .filter((s) => s.categoryId === c.id && mastery[s.id]?.mastery !== null)
            .sort((a, b) => (mastery[b.id].mastery ?? 0) - (mastery[a.id].mastery ?? 0));
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="font-mono" style={{ color: c.color }}>
                  {c.code}
                </span>
                {c.name}
              </div>
              {c.id === "vision" && <p className="mt-1 text-[11px] text-faint">{t("Describes how deliberately you explore your voice — never artistic worth.")}</p>}
              {list.length === 0 ? (
                <p className="mt-3 text-xs text-faint">{t("No evidence yet.")}</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {list.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <Link href={`/skills?skill=${s.id}`} className="truncate text-muted hover:text-text">
                        {s.name}
                      </Link>
                      <span style={{ color: STATE_STYLE[mastery[s.id].state].color }}>{t(STATE_STYLE[mastery[s.id].state].short)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </section>
    </Page>
  );
}
