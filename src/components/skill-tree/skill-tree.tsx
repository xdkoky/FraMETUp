"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node } from "@xyflow/react";
import { ArrowLeft, ChevronRight, History, List, Network, Search, X } from "lucide-react";
import type { ProficiencyState } from "@/lib/assessment/engine";
import { computeBranchLayout } from "@/lib/graph/layout";
import { STATE_ORDER, STATE_STYLE } from "@/lib/skill-state";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { BranchNode, ColumnLabel, type BranchNodeData, type ColumnLabelData } from "./branch-node";
import { SkillDetail, type LinkedSkill } from "./skill-detail";
import type { TreeData } from "./types";

const nodeTypes = { skill: BranchNode, column: ColumnLabel };
const COLUMN_LABELS = ["Foundations", "Builds up", "Advanced"];

function TreeInner({ data }: { data: TreeData }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { fitView, setCenter, getZoom } = useReactFlow();

  const skillById = useMemo(() => Object.fromEntries(data.skills.map((s) => [s.id, s])), [data.skills]);
  const catById = useMemo(() => Object.fromEntries(data.categories.map((c) => [c.id, c])), [data.categories]);

  const initialSkill = params.get("skill");
  const [area, setArea] = useState<string | null>(params.get("area") ?? (initialSkill ? (skillById[initialSkill]?.categoryId ?? null) : null));
  const [selected, setSelected] = useState<string | null>(initialSkill);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<ProficiencyState | null>(null);
  const [sliceKey, setSliceKey] = useState("now");
  const [view, setView] = useState<"map" | "list">("map");

  const slice = data.slices.find((s) => s.key === sliceKey) ?? data.slices[0];
  const stateOf = useCallback((id: string) => slice.states[id] ?? data.status[id], [slice, data.status]);

  const syncUrl = useCallback(
    (nextArea: string | null, nextSkill: string | null) => {
      const url = new URL(window.location.href);
      url.searchParams.delete("area");
      url.searchParams.delete("skill");
      if (nextArea) url.searchParams.set("area", nextArea);
      if (nextSkill) url.searchParams.set("skill", nextSkill);
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router],
  );
  const openArea = (id: string | null) => {
    setArea(id);
    setSelected(null);
    syncUrl(id, null);
  };
  const select = useCallback(
    (id: string | null) => {
      const nextArea = id ? skillById[id].categoryId : area;
      setSelected(id);
      if (id) setArea(nextArea);
      syncUrl(nextArea, id);
    },
    [skillById, area, syncUrl],
  );

  // Phones get the readable stage list by default; the graph is one tap away.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setView("list");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Graph relations ──
  const rel = useMemo(() => {
    const pre = new Map<string, string[]>();
    const post = new Map<string, string[]>();
    const related = new Map<string, string[]>();
    for (const e of data.edges) {
      if (e.kind === "PREREQUISITE") {
        pre.set(e.to, [...(pre.get(e.to) ?? []), e.from]);
        post.set(e.from, [...(post.get(e.from) ?? []), e.to]);
      } else {
        related.set(e.to, [...(related.get(e.to) ?? []), e.from]);
        related.set(e.from, [...(related.get(e.from) ?? []), e.to]);
      }
    }
    return { pre, post, related };
  }, [data.edges]);

  const matches = useCallback(
    (id: string) => {
      if (stateFilter && stateOf(id).state !== stateFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return skillById[id].name.toLowerCase().includes(q) || skillById[id].description.toLowerCase().includes(q);
    },
    [stateFilter, stateOf, query, skillById],
  );

  // ── Area view graph ──
  const areaSkills = useMemo(() => (area ? data.skills.filter((s) => s.categoryId === area) : []), [area, data.skills]);
  const layout = useMemo(() => (area ? computeBranchLayout(areaSkills, data.edges) : null), [area, areaSkills, data.edges]);

  const { nodes, edges } = useMemo(() => {
    if (!area || !layout) return { nodes: [] as Node[], edges: [] as Edge[] };
    const inArea = new Set(areaSkills.map((s) => s.id));
    const up = new Set<string>();
    const down = new Set<string>();
    if (selected && inArea.has(selected)) {
      const walk = (start: string, m: Map<string, string[]>, out: Set<string>) => {
        for (const n of m.get(start) ?? [])
          if (inArea.has(n) && !out.has(n)) {
            out.add(n);
            walk(n, m, out);
          }
      };
      walk(selected, rel.pre, up);
      walk(selected, rel.post, down);
    }
    const color = catById[area].color;
    const top = Math.min(...Object.values(layout.nodes).map((p) => p.y)) - 70;
    const ns: Node[] = Array.from({ length: layout.columns }, (_, c) => ({
      id: `col-${c}`,
      type: "column",
      position: { x: c * 300, y: top },
      draggable: false,
      selectable: false,
      data: { label: t(c === 0 ? COLUMN_LABELS[0] : c === layout.columns - 1 ? COLUMN_LABELS[2] : COLUMN_LABELS[1]) } satisfies ColumnLabelData,
    }));
    for (const s of areaSkills) {
      const p = layout.nodes[s.id];
      const st = stateOf(s.id);
      const external = (rel.pre.get(s.id) ?? []).filter((x) => !inArea.has(x)).length + (rel.post.get(s.id) ?? []).filter((x) => !inArea.has(x)).length;
      ns.push({
        id: s.id,
        type: "skill",
        position: { x: p.x, y: p.y },
        draggable: false,
        data: {
          name: s.name,
          state: st.state,
          mastery: st.mastery,
          confidence: st.confidence,
          color,
          external,
          goal: data.goalSkills.includes(s.id),
          recent: sliceKey === "now" && data.recentlyImproved.includes(s.id),
          reassess: sliceKey === "now" && Boolean(data.status[s.id]?.needsReassessment),
          highlight: s.id === selected ? "selected" : up.has(s.id) ? "upstream" : down.has(s.id) ? "downstream" : null,
          dim: !matches(s.id) || (Boolean(selected) && s.id !== selected && !up.has(s.id) && !down.has(s.id)),
        } satisfies BranchNodeData,
      });
    }
    const es: Edge[] = data.edges
      .filter((e) => e.kind === "PREREQUISITE" && inArea.has(e.from) && inArea.has(e.to))
      .map((e) => {
        const onPath = selected && (e.to === selected || up.has(e.to)) && (up.has(e.from) || e.from === selected);
        const onDown = selected && (e.from === selected || down.has(e.from)) && (down.has(e.to) || e.to === selected);
        const quiet = Boolean(selected) && !onPath && !onDown;
        return {
          id: `${e.from}>${e.to}`,
          source: e.from,
          target: e.to,
          type: "default",
          animated: Boolean(onPath || onDown),
          style: {
            stroke: onPath ? "var(--color-accent)" : onDown ? "var(--color-amber-bright)" : "var(--color-line-strong)",
            strokeWidth: onPath || onDown ? 2 : 1.5,
            opacity: quiet ? 0.15 : 1,
          },
        };
      });
    return { nodes: ns, edges: es };
  }, [area, layout, areaSkills, selected, rel, catById, stateOf, data, sliceKey, matches, t]);

  useEffect(() => {
    if (area && view === "map") requestAnimationFrame(() => fitView({ padding: 0.08, duration: 450, maxZoom: 1.1 }));
  }, [area, view, fitView]);

  useEffect(() => {
    if (!selected || !layout || view !== "map") return;
    const p = layout.nodes[selected];
    if (!p) return;
    const wide = window.innerWidth >= 768;
    const zoom = Math.max(getZoom(), 0.75);
    // Shift the view so the card sits left of the side panel (or above the bottom sheet on phones).
    setCenter(p.x + 116 + (wide ? 210 / zoom : 0), p.y + 40 + (wide ? 0 : 160 / zoom), { zoom, duration: 400 });
  }, [selected, layout, view, setCenter, getZoom]);

  const sel = selected ? skillById[selected] : null;
  const linked = (ids: string[]): LinkedSkill[] => ids.filter((id) => skillById[id]).map((id) => ({ id, name: skillById[id].name, state: stateOf(id).state }));
  const searchResults = query.trim() ? data.skills.filter((s) => matches(s.id)).slice(0, 8) : [];
  const counts = useMemo(() => {
    const c: Partial<Record<ProficiencyState, number>> = {};
    for (const s of area ? areaSkills : data.skills) c[stateOf(s.id).state] = (c[stateOf(s.id).state] ?? 0) + 1;
    return c;
  }, [area, areaSkills, data.skills, stateOf]);

  return (
    <div className="relative flex h-[calc(100dvh-7.5rem)] w-full flex-col overflow-hidden lg:h-dvh">
      {/* Toolbar */}
      <div className="z-20 border-b border-line-soft bg-ink/80 px-4 py-3 backdrop-blur lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          {area ? (
            <button onClick={() => openArea(null)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-text">
              <ArrowLeft className="size-4" aria-hidden /> {t("All areas")}
            </button>
          ) : (
            <h2 className="px-1 font-display text-2xl">{t("Skill Tree")}</h2>
          )}
          {area && (
            <div className="flex items-center gap-2 text-sm">
              <ChevronRight className="size-4 text-faint" aria-hidden />
              <span className="size-2.5 rounded-full" style={{ background: catById[area].color }} aria-hidden />
              <span className="font-medium">{catById[area].name}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search skills…")}
                aria-label={t("Search skills")}
                className="h-9 w-44 rounded-xl border border-line bg-ink/60 pl-8 pr-7 text-sm placeholder:text-faint focus:border-accent focus:outline-none sm:w-60"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-text" aria-label={t("Clear search")}>
                  <X className="size-4" />
                </button>
              )}
              {searchResults.length > 0 && (
                <ul className="absolute right-0 top-11 z-40 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl" role="listbox" aria-label={t("Search results")}>
                  {searchResults.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          select(s.id);
                          setQuery("");
                          setView("map");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                      >
                        <span className="size-2 rounded-full" style={{ background: catById[s.categoryId].color }} aria-hidden />
                        <span className="flex-1 truncate">{s.name}</span>
                        <span className="text-[11px] text-faint">{t(STATE_STYLE[stateOf(s.id).state].short)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {data.slices.length > 1 && (
              <label className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
                <History className="size-3.5 text-faint" aria-hidden />
                <span className="sr-only">{t("View tree as of")}</span>
                <select value={sliceKey} onChange={(e) => setSliceKey(e.target.value)} className="h-9 rounded-xl border border-line bg-ink/60 px-2 text-xs focus:border-accent focus:outline-none">
                  {data.slices.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {area && (
              <button
                onClick={() => setView(view === "map" ? "list" : "map")}
                className="flex h-9 items-center rounded-xl border border-line px-2.5 text-muted hover:text-text"
                aria-label={view === "map" ? t("Switch to list view") : t("Switch to graph view")}
              >
                {view === "map" ? <List className="size-4" /> : <Network className="size-4" />}
              </button>
            )}
          </div>
        </div>
        {/* State legend doubles as a filter */}
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t("Filter by proficiency state")}>
          {STATE_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setStateFilter(stateFilter === s ? null : s)}
              aria-pressed={stateFilter === s}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                stateFilter === s ? "border-faint bg-surface-2 text-text" : "border-line-soft text-muted hover:text-text",
                stateFilter && stateFilter !== s && "opacity-50",
              )}
            >
              <span className="size-2 rounded-full" style={s === "NOT_ASSESSED" ? { border: `1.5px dashed ${STATE_STYLE[s].color}` } : { background: STATE_STYLE[s].color }} aria-hidden />
              {t(STATE_STYLE[s].short)}
              <span className="font-mono text-faint">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        {sliceKey !== "now" && (
          <p className="mt-2 text-xs text-amber">
            {t("Viewing your tree as it was at the end of")} {slice.label}
            {t(". Evidence added later is hidden.")}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="relative min-h-0 flex-1">
        {!area ? (
          <div className="h-full overflow-y-auto px-4 py-6 lg:px-8">
            <p className="mb-5 max-w-2xl text-sm text-muted">{t("Eight areas of directing. Open one to see how its skills build on each other, from foundations to advanced.")}</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.categories.map((c) => {
                const list = data.skills.filter((s) => s.categoryId === c.id);
                const assessed = list.filter((s) => stateOf(s.id).mastery !== null);
                const top = [...assessed].sort((a, b) => (stateOf(b.id).mastery ?? 0) - (stateOf(a.id).mastery ?? 0)).slice(0, 2);
                const pct = list.length ? assessed.length / list.length : 0;
                return (
                  <div key={c.id} className="card group flex flex-col p-5 hover:border-line">
                    <button onClick={() => openArea(c.id)} className="flex items-start gap-3 text-left" aria-label={`${c.name} — ${t("Open area")}`}>
                      <svg viewBox="0 0 44 44" className="size-11 shrink-0 -rotate-90" aria-hidden>
                        <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-surface-3)" strokeWidth="4" />
                        <circle cx="22" cy="22" r="18" fill="none" stroke={c.color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${113 * pct} 113`} />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[11px]" style={{ color: c.color }}>
                          {c.code}
                        </div>
                        <div className="font-semibold leading-snug group-hover:text-accent-strong">{c.name}</div>
                        <div className="text-xs text-faint">{t("{a} of {b} assessed", { a: assessed.length, b: list.length })}</div>
                      </div>
                      <ChevronRight className="mt-3 size-4 text-faint group-hover:text-text" aria-hidden />
                    </button>
                    <div className="mt-4 flex flex-wrap gap-1.5" aria-label={t("Skills")}>
                      {list.map((s) => {
                        const st = stateOf(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => select(s.id)}
                            title={`${s.name} · ${t(STATE_STYLE[st.state].label)}`}
                            aria-label={`${s.name}: ${t(STATE_STYLE[st.state].label)}`}
                            className={cn("size-3.5 rounded-full transition-transform hover:scale-125", !matches(s.id) && "opacity-20")}
                            style={st.mastery !== null ? { background: STATE_STYLE[st.state].color } : { border: `1.5px dashed ${STATE_STYLE[st.state].color}` }}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-auto pt-4 text-xs text-muted">
                      {top.length ? (
                        <>
                          <span className="text-faint">{t("Strongest so far:")}</span> {top.map((s) => s.name).join(", ")}
                        </>
                      ) : (
                        <span className="text-faint">{t("No evidence yet.")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === "map" ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => n.type === "skill" && select(n.id)}
            onPaneClick={() => select(null)}
            nodesConnectable={false}
            nodesDraggable={false}
            fitView
            minZoom={0.3}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            className="!bg-transparent"
            aria-label={t("Director skill tree")}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="var(--color-line-strong)" />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
        ) : (
          <div className="h-full overflow-y-auto px-4 py-6 lg:px-8">
            <div className="max-w-3xl space-y-6">
              {Array.from({ length: layout?.columns ?? 0 }, (_, c) => {
                const stage = areaSkills.filter((sk) => layout?.nodes[sk.id]?.column === c && matches(sk.id));
                if (!stage.length) return null;
                const label = c === 0 ? COLUMN_LABELS[0] : c === (layout?.columns ?? 1) - 1 ? COLUMN_LABELS[2] : COLUMN_LABELS[1];
                return (
                  <section key={c}>
                    <h3 className="slate-label mb-2">
                      {c + 1}. {t(label)}
                    </h3>
                    <ul className="divide-y divide-line-soft rounded-2xl border border-line-soft bg-surface/50">
                      {stage.map((sk) => {
                        const st = stateOf(sk.id);
                        const steps = st.mastery !== null ? Math.min(5, Math.max(1, Math.round((st.mastery - 10) / 20) + 1)) : 0;
                        return (
                          <li key={sk.id}>
                            <button onClick={() => select(sk.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={st.mastery !== null ? { background: STATE_STYLE[st.state].color } : { border: `1.5px dashed ${STATE_STYLE[st.state].color}` }}
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 text-sm">{sk.name}</span>
                              <span className="flex w-20 gap-0.5" aria-hidden>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <span key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= steps ? STATE_STYLE[st.state].color : "var(--color-surface-3)" }} />
                                ))}
                              </span>
                              <ChevronRight className="size-4 text-faint" aria-hidden />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {area && view === "map" && !selected && (
          <p className="pointer-events-none absolute bottom-4 right-4 hidden rounded-full border border-line-soft bg-surface/90 px-3 py-1.5 text-xs text-muted md:block">
            {t("Tap a skill to see details")} · <span className="text-accent">— {t("builds on")}</span> · <span className="text-amber">— {t("supports")}</span>
          </p>
        )}

        {sel && (
          <aside
            className="absolute inset-x-0 bottom-0 z-30 max-h-[75%] overflow-y-auto rounded-t-3xl border-t border-line bg-surface/95 px-5 pt-5 shadow-2xl shadow-black/50 backdrop-blur-xl animate-[sheetup_.22s_ease-out] md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[420px] md:rounded-2xl md:border"
            aria-label={`${sel.name} details`}
          >
            <button onClick={() => select(null)} className="absolute right-3 top-3 rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-text" aria-label={t("Close details")}>
              <X className="size-4" />
            </button>
            <SkillDetail
              key={sel.id}
              compact
              skill={sel}
              category={catById[sel.categoryId]}
              status={stateOf(sel.id)}
              prerequisites={linked(rel.pre.get(sel.id) ?? [])}
              enables={linked(rel.post.get(sel.id) ?? [])}
              related={linked(rel.related.get(sel.id) ?? [])}
              extras={data.extras[sel.id] ?? { projects: [], challenges: [] }}
              practice={data.practice}
              isGoal={data.goalSkills.includes(sel.id)}
              onNavigate={(id) => select(id)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

export function SkillTree({ data }: { data: TreeData }) {
  return (
    <ReactFlowProvider>
      <TreeInner data={data} />
    </ReactFlowProvider>
  );
}
