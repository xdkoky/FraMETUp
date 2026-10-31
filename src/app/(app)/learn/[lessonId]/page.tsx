import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Clock, Images, Play, Target, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { canCurateLessonMedia } from "@/lib/auth/policy";
import { toViewer } from "@/lib/services/access";
import { getLessonPhotos } from "@/lib/services/lesson-media";
import { getLearnProgress } from "@/lib/services/learn";
import { GUIDES, LESSON_BY_ID, REFERENCES, pick } from "@/lib/learn";
import { Page } from "@/components/shell/page";
import { Card } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { Character, characterFor } from "@/components/characters/character";
import { LessonWidget } from "@/components/learn/widgets";
import { GuideList, PhotoCard, PhotoUploadForm, StaticReferenceCard } from "@/components/learn/media";
import { darker, unitColor } from "@/components/learn/palette";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  const e = LESSON_BY_ID[lessonId];
  return { title: e ? pick(e.lesson.title, await getLocale()) : "Lesson" };
}

function Section({ icon, title, children, id }: { icon: React.ReactNode; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-black">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

export default async function LessonGuidePage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const entry = LESSON_BY_ID[lessonId];
  if (!entry) notFound();
  const t = await getT();
  const locale = await getLocale();
  const user = await requireUser();
  const [{ done }, photos, viewer] = await Promise.all([getLearnProgress(user.id), getLessonPhotos(user, lessonId), toViewer(user)]);
  const curator = canCurateLessonMedia(viewer);
  const { lesson, module, track, unit } = entry;
  const color = unitColor(unit);
  const L = (s: { en: string; hu: string }) => pick(s, locale);
  const statics = (REFERENCES[lessonId] ?? []).map((r) => ({ ...r, alt: L(r.alt), caption: L(r.caption) }));
  const guides = GUIDES[module.id] ?? [];
  const hasRefs = statics.length + photos.references.length > 0;

  return (
    <Page className="max-w-4xl">
      <Link href={`/learn?track=${track.id}`} className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> {t("Back to the path")}
      </Link>

      <header className="mb-8 flex flex-col-reverse gap-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-3 inline-flex rounded-xl px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-wide text-white" style={{ background: color, boxShadow: `0 3px 0 ${darker(color)}` }}>
            {L(track.title)} · {t("Unit {n}", { n: unit + 1 })} · {L(module.title)}
          </div>
          <h1 className="font-display text-[2.1rem] font-black leading-tight md:text-[2.5rem]">{L(lesson.title)}</h1>
          <p className="mt-2 text-lg font-semibold text-muted">{L(lesson.summary)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LinkButton href={`/lesson/${lesson.id}`} size="md">
              <Play className="size-4 fill-white" aria-hidden /> {done.has(lesson.id) ? t("Replay the lesson") : t("Start the lesson")}
            </LinkButton>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-faint">
              <Clock className="size-4" aria-hidden /> {t("{n} min", { n: lesson.minutes })}
            </span>
            {done.has(lesson.id) && (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-success-strong">
                <CheckCircle2 className="size-4" aria-hidden /> {t("completed")}
              </span>
            )}
          </div>
        </div>
        <Character who={characterFor(lesson.id)} mood="happy" className="mx-auto size-32 shrink-0 sm:size-40" />
      </header>

      <div className="space-y-10">
        <Section icon={<span className="grid size-7 place-items-center rounded-lg text-sm text-white" style={{ background: color }}>★</span>} title={t("Key ideas")}>
          <ol className="grid gap-3">
            {lesson.points.map((p, i) => (
              <li key={i} className="card flex gap-3 p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl font-black text-white" style={{ background: color, boxShadow: `0 3px 0 ${darker(color)}` }}>
                  {i + 1}
                </span>
                <p className="text-[15.5px] font-semibold leading-relaxed text-text">{L(p)}</p>
              </li>
            ))}
          </ol>
        </Section>

        {lesson.widget && (
          <Section icon={<Target className="size-6 text-accent" aria-hidden />} title={t("Try it")}>
            <Card className="p-4 sm:p-5">
              <LessonWidget kind={lesson.widget} />
            </Card>
          </Section>
        )}

        <Section id="photos" icon={<Images className="size-6 text-accent" aria-hidden />} title={t("See it for real")}>
          {hasRefs ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {statics.map((r) => (
                <StaticReferenceCard key={r.src} r={r} />
              ))}
              {photos.references.map((p) => (
                <PhotoCard key={p.id} p={p} canCurate={curator} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-line p-5">
              <Character who="leo" mood="thinking" className="size-20 shrink-0" />
              <p className="text-[14px] font-semibold text-muted">
                {curator
                  ? t("No reference pictures yet. Shoot the drill below and add the best frames here — they'll be shown to every student.")
                  : t("No reference pictures yet. Your instructors can add them — and you can share your own drill result below.")}
              </p>
            </div>
          )}
          {curator && (
            <div className="mt-4">
              <PhotoUploadForm lessonId={lesson.id} kind="REFERENCE" displayName={user.displayName} />
            </div>
          )}
        </Section>

        <Section id="drill" icon={<Camera className="size-6 text-accent" aria-hidden />} title={t("Your drill")}>
          <Card className="mb-4 flex items-start gap-4 p-5">
            <Character who={characterFor(lesson.id)} mood="determined" className="size-20 shrink-0" />
            <p className="text-[16px] font-bold leading-snug">{L(lesson.drill)}</p>
          </Card>
          {photos.mine.length > 0 && (
            <div className="mb-4 grid gap-6 sm:grid-cols-2">
              {photos.mine.map((p) => (
                <PhotoCard key={p.id} p={p} canCurate={curator} />
              ))}
            </div>
          )}
          <PhotoUploadForm lessonId={lesson.id} kind="EXAMPLE" displayName={user.displayName} />
        </Section>

        <Section icon={<Users className="size-6 text-accent" aria-hidden />} title={t("Class examples")}>
          {photos.shared.length ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {photos.shared.map((p) => (
                <div key={p.id}>
                  <PhotoCard p={p} canCurate={curator} />
                  <p className="mt-1 text-[12px] font-bold text-faint">{t("Shared by {name}", { name: p.uploaderName })}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] font-semibold text-faint">{t("Nobody in your class has shared a result for this drill yet. Be the first!")}</p>
          )}
        </Section>

        {guides.length > 0 && (
          <Section icon={<Play className="size-6 text-accent" aria-hidden />} title={t("Go deeper")}>
            <GuideList guides={guides} locale={locale} />
            <p className="mt-3 text-[12px] font-semibold text-faint">{t("Outside resources open on their own sites. FraMETUp isn't affiliated with them.")}</p>
          </Section>
        )}
      </div>
    </Page>
  );
}
