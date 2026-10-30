import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/shell/sidebar";
import { DemoBanner } from "@/components/ui/misc";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pendingReviews = await db.peerReviewRequest.count({ where: { reviewerId: user.id, status: "PENDING" } });
  return (
    <div className="min-h-dvh">
      <Sidebar isAdmin={user.roles.includes("ADMIN")} displayName={user.displayName} pendingReviews={pendingReviews} />
      <div className="lg:pl-60">
        {user.isDemo && <DemoBanner />}
        {children}
      </div>
    </div>
  );
}
