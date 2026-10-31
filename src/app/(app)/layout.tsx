import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/shell/sidebar";
import { DemoBanner } from "@/components/ui/misc";
import { PageTransition, SwipeNav } from "@/components/shell/app-motion";
import { getT } from "@/i18n/server";
import { getThemePref } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // New and existing users who have never seen the starting-point quiz get it once.
  if (!user.quizSeen) redirect("/quiz");
  const t = await getT();
  const pendingReviews = await db.peerReviewRequest.count({ where: { reviewerId: user.id, status: "PENDING" } });
  return (
    <div className="min-h-dvh">
      <Sidebar isAdmin={user.roles.includes("ADMIN")} displayName={user.displayName} pendingReviews={pendingReviews} theme={await getThemePref()} />
      <SwipeNav />
      <div className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60">
        {user.isDemo && <DemoBanner>{t("Demonstration account — all people, projects and feedback here are fictional.")}</DemoBanner>}
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}
