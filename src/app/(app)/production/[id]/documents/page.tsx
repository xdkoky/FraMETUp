import { notFound } from "next/navigation";
import { Download, FileText, History, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { Card, EmptyState } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { ActionForm } from "@/components/production/forms";
import { field, labelCls } from "@/components/production/styles";
import { deleteDocument, uploadDocument } from "../../actions";
import { getFormat, getT } from "@/i18n/server";
import { DOCUMENT_KINDS } from "@/lib/production/lifecycle";

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (access.limited) notFound();
  const [docs, scenes] = await Promise.all([
    db.productionDocument.findMany({ where: { productionId: id, deletedAt: null }, include: { versions: { orderBy: { version: "desc" } }, scene: { select: { number: true } } }, orderBy: [{ kind: "asc" }, { createdAt: "desc" }] }),
    db.scene.findMany({ where: { productionId: id }, orderBy: [{ order: "asc" }], select: { id: true, number: true, title: true } }),
  ]);
  const kinds = [...new Set(docs.map((d) => d.kind))];
  const canUpload = Boolean(access.member) || access.manage;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {docs.length === 0 && <EmptyState icon={<FileText className="size-8" />} title={t("No documents yet")}>{t("Upload the screenplay, floor plans, lighting diagrams and anything else the crew needs.")}</EmptyState>}
        {kinds.map((k) => (
          <section key={k}>
            <h2 className="slate-label mb-2">{t(k)}</h2>
            <ul className="space-y-2">
              {docs
                .filter((d) => d.kind === k)
                .map((d) => {
                  const cur = d.versions[0];
                  return (
                    <li key={d.id} className="card p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[14.5px] font-extrabold">{d.title}</div>
                          <div className="text-[12px] font-semibold text-faint">
                            {t("Version {n}", { n: cur?.version ?? 1 })} · {cur ? fmt.date(cur.createdAt) : ""} {d.scene ? `· ${t("Sc")} ${d.scene.number}` : ""}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {cur && (
                            <a href={`/api/production-files/document/${cur.id}`} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>
                              <Download className="size-3.5" aria-hidden /> {t("Open")}
                            </a>
                          )}
                          {(access.manage || d.createdById === user.id) && (
                            <form action={deleteDocument.bind(null, id, d.id)}>
                              <button className="rounded-lg p-2 text-faint hover:text-danger" aria-label={t("Remove document")}>
                                <Trash2 className="size-4" />
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[12.5px] font-extrabold text-accent">
                          <History className="mr-1 inline size-3.5" aria-hidden />
                          {d.versions.length > 1 ? t("{n} versions", { n: d.versions.length }) : t("Upload a new version")}
                        </summary>
                        <ul className="mt-2 space-y-1">
                          {d.versions.map((v) => (
                            <li key={v.id} className="text-[12.5px] font-semibold text-muted">
                              <a href={`/api/production-files/document/${v.id}`} target="_blank" rel="noopener" className="text-accent">
                                v{v.version}
                              </a>{" "}
                              · {v.fileName} · {fmt.date(v.createdAt)} {v.note && `— ${v.note}`}
                            </li>
                          ))}
                        </ul>
                        {(access.manage || d.createdById === user.id) && (
                          <ActionForm action={uploadDocument.bind(null, id)} submit="Upload new version" className="mt-2">
                            <input type="hidden" name="documentId" value={d.id} />
                            <input type="file" name="file" required className="block w-full text-[13px]" />
                            <input name="note" maxLength={300} placeholder={t("What changed?")} className={`${field} mt-2`} />
                          </ActionForm>
                        )}
                      </details>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
      {canUpload && (
        <aside>
          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-black">{t("Add a document")}</h2>
            <ActionForm action={uploadDocument.bind(null, id)} submit="Upload">
              <div className="space-y-3">
                <label className={labelCls}>
                  {t("Type")}
                  <select name="kind" className={`${field} mt-1`}>
                    {DOCUMENT_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(k)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelCls}>
                  {t("Title")}
                  <input name="title" maxLength={140} className={`${field} mt-1`} />
                </label>
                <label className={labelCls}>
                  {t("Scene (optional)")}
                  <select name="sceneId" className={`${field} mt-1`}>
                    <option value="">—</option>
                    {scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.number} {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelCls}>
                  {t("File (PDF, PNG, JPEG, text)")}
                  <input type="file" name="file" required className="mt-1 block w-full text-[13px]" />
                </label>
                <p className="text-[12px] font-semibold text-faint">{t("New uploads never overwrite: each one becomes a new version and old versions stay available.")}</p>
              </div>
            </ActionForm>
          </Card>
        </aside>
      )}
    </div>
  );
}
