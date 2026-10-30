import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n/server";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { QUIZ } from "@/lib/quiz/questions";
import { db } from "@/lib/db";
import { QuizFlow } from "./quiz-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Starting-point quiz") };
}

export default async function QuizPage() {
  const user = await requireUser();
  const [{ skillById, categoryById }, profile] = await Promise.all([getTaxonomy(), db.userProfile.findUnique({ where: { userId: user.id } })]);
  const skills = Object.fromEntries(
    Object.values(skillById).map((s) => [s.id, { name: s.name, category: categoryById[s.categoryId].name, color: categoryById[s.categoryId].color, levels: s.levels }]),
  );
  return (
    <main className="min-h-dvh px-4 py-6 sm:py-10">
      <QuizFlow questions={QUIZ} skills={skills} firstName={user.displayName.split(" ")[0]} retake={Boolean(profile?.quizCompletedAt)} />
    </main>
  );
}
