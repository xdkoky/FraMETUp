import { notFound } from "next/navigation";
import { AlertOctagon, Trash2 } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { DEPARTMENT_LABEL, DEPARTMENTS } from "@/lib/production/roles";
import { Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { CommentThread } from "@/components/production/comments";
import { field, labelCls } from "@/components/production/styles";
import { createTask, deleteTask, setTaskStatus } from "../../actions";
import { getFormat, getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "TODO", label: "To do" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "BLOCKED", label: "Blocked" },
  { status: "DONE", label: "Completed" },
];

export default async function TasksPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mine?: string }> }) {
  const { id } = await params;
  const { mine } = await searchParams;
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (access.limited) notFound();
  const [tasks, members, scenes] = await Promise.all([
    db.productionTask.findMany({ where: { productionId: id }, include: { assignee: true, scene: { select: { number: true } } }, orderBy: [{ due: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] }),
    db.productionMember.findMany({ where: { productionId: id, status: "ACCEPTED" }, orderBy: { name: "asc" } }),
    db.scene.findMany({ where: { productionId: id }, orderBy: [{ order: "asc" }], select: { id: true, number: true, title: true } }),
  ]);
  const showMine = mine === "1" && access.member;
  const list = showMine ? tasks.filter((x) => x.assigneeId === access.member!.id) : tasks;
  const canAdd = Boolean(access.member) || access.manage;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <a href={`/production/${id}/tasks`} className={buttonClass(showMine ? "ghost" : "secondary", "sm")}>
          {t("All tasks")}
        </a>
        {access.member && (
          <a href={`/production/${id}/tasks?mine=1`} className={buttonClass(showMine ? "secondary" : "ghost", "sm")}>
            {t("Assigned to me")}
          </a>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = list.filter((x) => x.status === col.status);
          return (
            <section key={col.status} className="rounded-2xl border-2 border-line bg-surface-2 p-3">
              <h2 className="mb-2 flex items-center justify-between text-[13px] font-extrabold uppercase tracking-wide text-muted">
                {t(col.label)} <span>{items.length}</span>
              </h2>
              <ul className="space-y-2">
                {items.map((task) => {
                  const canMove = access.manage || task.assignee?.userId === user.id || task.createdById === user.id;
                  return (
                    <li key={task.id} id={`task-${task.id}`} className="card scroll-mt-24 p-3">
                      <div className="flex items-start gap-2">
                        {task.priority === "HIGH" && <AlertOctagon className="mt-0.5 size-4 shrink-0 text-danger" aria-label={t("High priority")} />}
                        <div className={cn("min-w-0 flex-1 text-[14px] font-extrabold", task.status === "DONE" && "text-muted line-through")}>{task.title}</div>
                      </div>
                      {task.description && <p className="mt-1 whitespace-pre-line text-[12.5px] font-semibold text-muted">{task.description}</p>}
                      <p className="mt-1 text-[12px] font-bold text-faint">
                        {[task.assignee?.name ?? t("Unassigned"), task.department ? t(DEPARTMENT_LABEL[task.department as keyof typeof DEPARTMENT_LABEL] ?? task.department) : null, task.scene ? `${t("Sc")} ${task.scene.number}` : null, task.due ? t("due {date}", { date: fmt.date(task.due) }) : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {canMove && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {COLUMNS.filter((c) => c.status !== task.status).map((c) => (
                            <form key={c.status} action={setTaskStatus.bind(null, id, task.id, c.status)}>
                              <button className="rounded-lg border-2 border-line px-2 py-0.5 text-[11px] font-extrabold text-muted hover:border-accent hover:text-accent">→ {t(c.label)}</button>
                            </form>
                          ))}
                          {(access.manage || task.createdById === user.id) && (
                            <form action={deleteTask.bind(null, id, task.id)}>
                              <button className="rounded-lg p-1 text-faint hover:text-danger" aria-label={t("Delete task")}>
                                <Trash2 className="size-3.5" />
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[12px] font-extrabold text-accent">{t("Comments")}</summary>
                        <div className="mt-2">
                          <CommentThread productionId={id} targetType="task" targetId={task.id} canComment />
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {canAdd && (
        <Card className="p-5">
          <h2 className="mb-3 text-[15px] font-black">{t("Add a task")}</h2>
          <form action={createTask.bind(null, id)} className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelCls} sm:col-span-2`}>
              {t("Title")}
              <input name="title" required maxLength={200} className={`${field} mt-1`} placeholder={t("e.g. Confirm the dolly track with the studio")} />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              {t("Description")}
              <textarea name="description" rows={2} maxLength={2000} className={`${field} mt-1`} />
            </label>
            <label className={labelCls}>
              {t("Assigned to")}
              <select name="assigneeId" className={`${field} mt-1`}>
                <option value="">{t("Unassigned")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              {t("Department")}
              <select name="department" className={`${field} mt-1`}>
                <option value="">—</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {t(DEPARTMENT_LABEL[d])}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              {t("Scene")}
              <select name="sceneId" className={`${field} mt-1`}>
                <option value="">—</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number} {s.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>
                {t("Deadline")}
                <input name="due" type="date" className={`${field} mt-1`} />
              </label>
              <label className={labelCls}>
                {t("Priority")}
                <select name="priority" defaultValue="NORMAL" className={`${field} mt-1`}>
                  <option value="LOW">{t("Low")}</option>
                  <option value="NORMAL">{t("Normal")}</option>
                  <option value="HIGH">{t("High")}</option>
                </select>
              </label>
            </div>
            <div className="sm:col-span-2">
              <button className={buttonClass("primary", "md")}>{t("Add task")}</button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
