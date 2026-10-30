import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser({ allowUnonboarded: true });
  if (user.onboarded) redirect("/dashboard");
  const { categories, skills } = await getTaxonomy();
  return (
    <main className="min-h-dvh flex items-start sm:items-center justify-center px-4 py-10">
      <OnboardingFlow
        defaultName={user.displayName}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color, description: c.description }))}
        skills={skills.map((s) => ({ id: s.id, name: s.name, categoryId: s.categoryId }))}
        currentYear={new Date().getFullYear()}
      />
    </main>
  );
}
