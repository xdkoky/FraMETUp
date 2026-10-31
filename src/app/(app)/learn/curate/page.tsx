import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { canCurateLessonMedia } from "@/lib/auth/policy";
import { toViewer } from "@/lib/services/access";
import { referenceCounts } from "@/lib/services/lesson-media";
import { REFERENCES, TRACKS, pick } from "@/lib/learn";
import { Page } from "@/components/shell/page";
import { PageHeader } from "@/components/ui/misc";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Lesson photo shot list") };
}

/** For instructors: which lessons still need reference pictures, and what to shoot for each. */
export default async function CuratePage() {
  const t = await getT();
  const locale = await getLocale();
  const user = await requireUser();
  if (!canCurateLessonMedia(await toViewer(user))) notFound();
  const counts = await referenceCounts();
  const n = (id: string) => (counts[id] ?? 0) + (REFERENCES[id]?.length ?? 0);
  const all = TRACKS.flatMap((tr) => tr.modules.flatMap((m) => m.lessons));
  const covered = all.filter((l) => n(l.id) > 0).length;

  return (
    <Page className="max-w-5xl">
      <PageHeader
        eyebrow={t("For instructors")}
        title={t("Lesson photo shot list")}
        description={t("{a} of {b} lessons have reference pictures. Each lesson's drill is the brief: shoot it, pick the clearest frames, and add them on the lesson page.", { a: covered, b: all.length })}
      />
      {TRACKS.map((track) => (
        <section key={track.id} className="mb-10">
          <h2 className="mb-3 text-2xl font-black">{pick(track.title, locale)}</h2>
          {track.modules.map((m) => (
            <div key={m.id} className="mb-6">
              <h3 className="slate-label mb-2">{pick(m.title, locale)}</h3>
              <ul className="grid gap-2">
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <Link href={`/learn/${l.id}#photos`} className="card flex items-start gap-3 p-3">
                      {n(l.id) > 0 ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : <Camera className="mt-0.5 size-5 shrink-0 text-faint" aria-hidden />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-extrabold">{pick(l.title, locale)}</span>
                        <span className="block text-[13px] font-semibold text-muted">{pick(l.drill, locale)}</span>
                      </span>
                      <span className="shrink-0 text-[12px] font-bold text-faint">{t("{n} pictures", { n: n(l.id) })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </Page>
  );
}
