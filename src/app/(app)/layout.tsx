import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/shell/sidebar";
import { DemoBanner } from "@/components/ui/misc";
import { getT } from "@/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // New and existing users who have never seen the starting-point quiz get it once.
  if (!user.quizSeen) redirect("/quiz");
  const t = await getT();
  const pendingReviews = await db.peerReviewRequest.count({ where: { reviewerId: user.id, status: "PENDING" } });
  return (
    <div className="min-h-dvh">
      <Sidebar isAdmin={user.roles.includes("ADMIN")} displayName={user.displayName} pendingReviews={pendingReviews} />
      <div className="pb-16 lg:pb-0 lg:pl-60">
        {user.isDemo && <DemoBanner>{t("Demonstration account — all people, projects and feedback here are fictional.")}</DemoBanner>}
        {children}
      </div>
    </div>
  );
}
