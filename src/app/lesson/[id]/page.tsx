import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLearnProgress } from "@/lib/services/learn";
import { COURSE, LESSON_BY_ID, nextLesson, pick } from "@/lib/learn";
import { DAILY_GOAL } from "@/lib/learn/progress";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { unitColor } from "@/components/learn/palette";
import { getLocale } from "@/i18n/server";
import { LessonFlow } from "./lesson-flow";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const entry = LESSON_BY_ID[id];
  return { title: entry ? pick(entry.lesson.title, await getLocale()) : "Lesson" };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = LESSON_BY_ID[id];
  if (!entry) notFound();
  const user = await requireUser();
  const locale = await getLocale();
  const [{ done }, { skillById }] = await Promise.all([getLearnProgress(user.id), getTaxonomy()]);
  const { lesson, module } = entry;
  const unit = COURSE.indexOf(module);
  const following = nextLesson(id);
  const L = (s: { en: string; hu: string }) => pick(s, locale);

  return (
    <LessonFlow
      data={{
        id: lesson.id,
        unit: unit + 1,
        unitTitle: L(module.title),
        color: unitColor(unit),
        title: L(lesson.title),
        summary: L(lesson.summary),
        minutes: lesson.minutes,
        points: lesson.points.map(L),
        drill: L(lesson.drill),
        widget: lesson.widget ?? null,
        question: L(lesson.check.q),
        options: lesson.check.options.map(L),
        answer: lesson.check.answer,
        why: L(lesson.check.why),
        skills: lesson.skills.filter((s) => skillById[s]).map((s) => ({ id: s, name: skillById[s].name })),
        alreadyDone: done.has(lesson.id),
        next: following ? { id: following.id, title: L(following.title) } : null,
        dailyGoal: DAILY_GOAL,
      }}
    />
  );
}
