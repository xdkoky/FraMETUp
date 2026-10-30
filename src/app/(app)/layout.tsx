import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/shell/sidebar";
import { DemoBanner } from "@/components/ui/misc";
import { getT } from "@/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getT();
  const pendingReviews = await db.peerReviewRequest.count({ where: { reviewerId: user.id, status: "PENDING" } });
  return (
    <div className="min-h-dvh">
      <Sidebar isAdmin={user.roles.includes("ADMIN")} displayName={user.displayName} pendingReviews={pendingReviews} />
      <div className="lg:pl-60">
        {user.isDemo && <DemoBanner>{t("Demonstration account — all people, projects and feedback here are fictional.")}</DemoBanner>}
        {children}
      </div>
    </div>
  );
}
