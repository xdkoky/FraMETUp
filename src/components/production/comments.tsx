import { MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { buttonClass } from "@/components/ui/button";
import { addComment } from "@/app/(app)/production/actions";
import { getFormat, getT } from "@/i18n/server";
import { field } from "./styles";

/** A small comment thread on a scene, shot, reference or task. */
export async function CommentThread({ productionId, targetType, targetId, canComment }: { productionId: string; targetType: "scene" | "shot" | "reference" | "task"; targetId: string; canComment: boolean }) {
  const t = await getT();
  const fmt = await getFormat();
  const comments = await db.productionComment.findMany({ where: { targetType, targetId }, orderBy: { createdAt: "asc" } });
  const authors = await db.userProfile.findMany({ where: { userId: { in: [...new Set(comments.map((c) => c.authorId))] } }, select: { userId: true, displayName: true } });
  const name = (id: string) => authors.find((a) => a.userId === id)?.displayName ?? "—";
  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="rounded-xl bg-surface-2 p-2.5">
          <div className="text-[12px] font-extrabold text-muted">
            {name(c.authorId)} · <span className="font-semibold text-faint">{fmt.date(c.createdAt)}</span>
          </div>
          <p className="whitespace-pre-line text-[13.5px] font-semibold">{c.body}</p>
        </div>
      ))}
      {canComment && (
        <form action={addComment.bind(null, productionId, targetType, targetId)} className="flex gap-2">
          <input name="body" required maxLength={1500} placeholder={t("Add a comment…")} className={field} />
          <button className={buttonClass("secondary", "sm")} aria-label={t("Comment")}>
            <MessageSquare className="size-4" aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}
