"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { BookOpen, ExternalLink, Eye, EyeOff, Lock, Pin, Play, Trash2, Upload, Users, Wrench } from "lucide-react";
import type { Guide } from "@/lib/learn";
import type { LessonPhoto } from "@/lib/services/lesson-media";
import { deleteLessonPhoto, setLessonPhotoVisibility, toggleLessonPhotoPin, uploadLessonPhoto, type PhotoState } from "@/app/(app)/learn/actions";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

export const LICENSE_OPTIONS = ["Own work", "CC BY 4.0", "CC BY-SA 4.0", "CC0", "Public domain", "Used with permission"] as const;

/** A static, curated reference shipped with the course (openly licensed). */
export interface StaticReference {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  license: string;
  sourceUrl: string;
}

function Credit({ credit, license, sourceUrl }: { credit: string; license: string; sourceUrl?: string | null }) {
  const t = useT();
  return (
    <p className="text-[11.5px] font-semibold text-faint">
      {t("Photo:")} {credit} · {t(license)}
      {sourceUrl && (
        <>
          {" · "}
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            {t("source")}
          </a>
        </>
      )}
    </p>
  );
}

/** Drag to compare two pictures of the same setup. */
export function CompareSlider({ before, after, beforeLabel, afterLabel, alt }: { before: string; after: string; beforeLabel?: string | null; afterLabel?: string | null; alt: string }) {
  const t = useT();
  const id = useId();
  const [pos, setPos] = useState(50);
  return (
    <div className="relative select-none overflow-hidden rounded-2xl border-2 border-line bg-surface-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`${alt} — ${afterLabel ?? t("After")}`} className="block w-full" loading="lazy" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={`${alt} — ${beforeLabel ?? t("Before")}`} className="block h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${pos}%` }} aria-hidden>
        <span className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-line bg-surface text-xs font-black text-muted">⇆</span>
      </div>
      <span className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-extrabold text-white">{beforeLabel || t("Before")}</span>
      <span className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-extrabold text-white">{afterLabel || t("After")}</span>
      <label htmlFor={id} className="sr-only">
        {t("Compare before and after")}
      </label>
      <input id={id} type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}

export function StaticReferenceCard({ r }: { r: StaticReference }) {
  return (
    <figure className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={r.src} alt={r.alt} className="w-full rounded-2xl border-2 border-line" loading="lazy" />
      <figcaption className="space-y-0.5">
        <p className="text-[14px] font-bold text-text">{r.caption}</p>
        <Credit credit={r.credit} license={r.license} sourceUrl={r.sourceUrl} />
      </figcaption>
    </figure>
  );
}

export function PhotoCard({ p, canCurate }: { p: LessonPhoto; canCurate?: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <figure className={cn("space-y-2", pending && "opacity-50")}>
      {p.afterSrc ? (
        <CompareSlider before={p.src} after={p.afterSrc} beforeLabel={p.beforeLabel} afterLabel={p.afterLabel} alt={p.caption} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.src} alt={p.caption} className="w-full rounded-2xl border-2 border-line bg-surface-2" loading="lazy" />
      )}
      <figcaption className="space-y-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-[14px] font-bold text-text">{p.caption}</p>
          {p.pinned && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-extrabold text-amber">
              <Pin className="size-3" aria-hidden /> {t("Pinned")}
            </span>
          )}
        </div>
        <Credit credit={p.credit} license={p.license} sourceUrl={p.sourceUrl} />
        {(p.canManage || (canCurate && p.kind === "EXAMPLE")) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {p.mine && p.kind === "EXAMPLE" && (
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => start(() => setLessonPhotoVisibility(p.id, p.visibility === "SHARED" ? "PRIVATE" : "SHARED"))}>
                {p.visibility === "SHARED" ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
                {p.visibility === "SHARED" ? t("Make private") : t("Share with my class")}
              </button>
            )}
            {canCurate && p.kind === "EXAMPLE" && p.visibility === "SHARED" && (
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => start(() => toggleLessonPhotoPin(p.id))}>
                <Pin className="size-3.5" aria-hidden /> {p.pinned ? t("Unpin") : t("Pin as a good example")}
              </button>
            )}
            {p.canManage && (
              <button
                type="button"
                className={cn(buttonClass("ghost", "sm"), "!text-danger")}
                onClick={() => {
                  if (confirm(t("Delete this picture?"))) start(() => deleteLessonPhoto(p.id));
                }}
              >
                <Trash2 className="size-3.5" aria-hidden /> {t("Delete")}
              </button>
            )}
          </div>
        )}
        {p.kind === "EXAMPLE" && p.mine && (
          <p className="inline-flex items-center gap-1 text-[11.5px] font-bold text-faint">
            {p.visibility === "SHARED" ? <Users className="size-3" aria-hidden /> : <Lock className="size-3" aria-hidden />}
            {p.visibility === "SHARED" ? t("Visible to your class") : t("Only you can see this")}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

/** Loads YouTube only after a click, so nothing is sent to Google until the student chooses to watch. */
export function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  const t = useT();
  const [on, setOn] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border-2 border-line bg-[#111]">
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setOn(true)} className="group absolute inset-0 grid place-items-center text-white">
          <span className="absolute inset-0 bg-gradient-to-br from-[#2a3348] to-[#11151d]" aria-hidden />
          <span className="relative flex flex-col items-center gap-2">
            <span className="grid size-16 place-items-center rounded-full bg-[#e5484d] shadow-[0_5px_0_#a8262b] transition-transform group-hover:scale-105">
              <Play className="size-7 fill-white" aria-hidden />
            </span>
            <span className="max-w-xs px-4 text-center text-[13px] font-bold">{title}</span>
            <span className="text-[11px] font-semibold opacity-70">{t("Plays from YouTube")}</span>
          </span>
        </button>
      )}
    </div>
  );
}

const KIND_ICON = { video: Play, article: ExternalLink, tool: Wrench, book: BookOpen } as const;

export function GuideList({ guides, locale }: { guides: Guide[]; locale: "en" | "hu" }) {
  const t = useT();
  const kindLabel = { video: t("Video"), article: t("Article"), tool: t("Tool"), book: t("Book") };
  return (
    <div className="space-y-4">
      {guides
        .filter((g) => g.youtube)
        .map((g) => (
          <div key={`v-${g.youtube}`}>
            <YouTubeEmbed id={g.youtube!} title={`${g.title} — ${g.source}`} />
            <p className="mt-1.5 text-[13px] font-semibold text-muted">{g.note[locale]}</p>
          </div>
        ))}
      <ul className="grid gap-2">
        {guides.map((g) => {
          const Icon = KIND_ICON[g.kind];
          const body = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-extrabold text-text">{g.title}</span>
                <span className="block text-[12px] font-semibold text-faint">
                  {kindLabel[g.kind]} · {g.source}
                </span>
                <span className="mt-0.5 block text-[13px] font-semibold text-muted">{g.note[locale]}</span>
              </span>
              {g.url && <ExternalLink className="mt-1 size-4 shrink-0 text-faint" aria-hidden />}
            </>
          );
          return (
            <li key={`${g.kind}-${g.title}-${g.source}`}>
              {g.url ? (
                <a href={g.url} target="_blank" rel="noopener noreferrer" className="press flex items-start gap-3 rounded-2xl border-2 border-line p-3 shadow-[0_3px_0_var(--color-line)] hover:bg-surface-2">
                  {body}
                </a>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl border-2 border-line p-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PhotoUploadForm({ lessonId, kind, displayName }: { lessonId: string; kind: "REFERENCE" | "EXAMPLE"; displayName: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<PhotoState, FormData>(uploadLessonPhoto.bind(null, lessonId), null);
  const [license, setLicense] = useState<string>("Own work");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  const err = (k: string) => state?.fieldErrors?.[k]?.[0];
  const field = "w-full rounded-xl border-2 border-line bg-surface px-3 py-2 text-[14px] font-semibold text-text outline-none focus:border-accent";
  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-2xl border-2 border-dashed border-line p-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex items-center gap-2 text-[14px] font-extrabold">
        <Upload className="size-4 text-accent" aria-hidden /> {kind === "REFERENCE" ? t("Add a reference picture") : t("Add your drill result")}
      </div>
      <label className="block text-[13px] font-bold text-muted">
        {kind === "REFERENCE" ? t("Picture (or the 'before' picture)") : t("Picture")}
        <input type="file" name="file" accept="image/png,image/jpeg" required className="mt-1 block w-full text-[13px]" />
        {err("file") && <span className="text-[12px] text-danger">{t(err("file")!)}</span>}
      </label>
      {kind === "REFERENCE" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-[13px] font-bold text-muted sm:col-span-3">
            {t("Optional 'after' picture for a before/after slider")}
            <input type="file" name="afterFile" accept="image/png,image/jpeg" className="mt-1 block w-full text-[13px]" />
          </label>
          <input name="beforeLabel" placeholder={t("Before label, e.g. Flat light")} className={field} maxLength={40} />
          <input name="afterLabel" placeholder={t("After label, e.g. Negative fill")} className={field} maxLength={40} />
        </div>
      )}
      <label className="block text-[13px] font-bold text-muted">
        {t("Caption — what should people notice?")}
        <input name="caption" required maxLength={300} className={cn(field, "mt-1")} placeholder={t("e.g. Key light from the window, the far cheek falls into shadow")} />
        {err("caption") && <span className="text-[12px] text-danger">{t(err("caption")!)}</span>}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] font-bold text-muted">
          {t("Credit")}
          <input name="credit" maxLength={120} className={cn(field, "mt-1")} placeholder={displayName} />
        </label>
        <label className="block text-[13px] font-bold text-muted">
          {t("Licence")}
          <select name="license" value={license} onChange={(e) => setLicense(e.target.value)} className={cn(field, "mt-1")}>
            {LICENSE_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {t(l)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {license !== "Own work" && (
        <label className="block text-[13px] font-bold text-muted">
          {t("Source link")}
          <input name="sourceUrl" type="url" maxLength={500} className={cn(field, "mt-1")} placeholder="https://" />
          {err("sourceUrl") && <span className="text-[12px] text-danger">{t(err("sourceUrl")!)}</span>}
        </label>
      )}
      {kind === "EXAMPLE" && (
        <label className="flex items-center gap-2 text-[13px] font-bold text-muted">
          <input type="checkbox" name="visibility" value="SHARED" className="size-4 accent-[var(--color-accent)]" />
          {t("Share with my class (otherwise only you can see it)")}
        </label>
      )}
      <label className="flex items-start gap-2 text-[13px] font-bold text-muted">
        <input type="checkbox" name="rightsConfirmed" className="mt-0.5 size-4 accent-[var(--color-accent)]" required />
        {t("I took this picture or have the right to share it, and everyone recognisable in it agreed.")}
      </label>
      {err("rightsConfirmed") && <p className="text-[12px] text-danger">{t(err("rightsConfirmed")!)}</p>}
      {state?.error && <p className="text-[13px] font-bold text-danger">{t(state.error)}</p>}
      {state?.ok && <p className="text-[13px] font-bold text-success-strong">{t(state.ok)}</p>}
      <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
        {pending ? t("Uploading…") : t("Upload")}
      </button>
    </form>
  );
}
