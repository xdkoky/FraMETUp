"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { History, List, Network, Search, X } from "lucide-react";
import type { ProficiencyState } from "@/lib/assessment/engine";
import { STATE_ORDER, STATE_STYLE } from "@/lib/skill-state";
import { cn } from "@/lib/utils";
import { CategoryNode, CenterNode, SectorNode, SkillNode, type CategoryNodeData, type SectorNodeData, type SkillNodeData } from "./nodes";
import { FloatingEdge, type FloatingEdgeData } from "./floating-edge";
import { SkillDetail, type LinkedSkill } from "./skill-detail";
import type { TreeData } from "./types";

const nodeTypes = { skill: SkillNode, category: CategoryNode, center: CenterNode, sector: SectorNode };
const edgeTypes = { floating: FloatingEdge };

// Node boxes: skill 132×~90 (circle at top), category 150×~110, center 112×~130.
const SKILL_W = 132;
const CAT_W = 150;

function TreeInner({ data }: { data: TreeData }) {
  const router = useRouter();
  const params = useSearchParams();
  const { setCenter, fitView } = useReactFlow();

  const [selected, setSelected] = useState<string | null>(params.get("skill"));
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<ProficiencyState | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [sliceKey, setSliceKey] = useState<string>("now");
  const [view, setView] = useState<"graph" | "list">("graph");

  const skillById = useMemo(() => Object.fromEntries(data.skills.map((s) => [s.id, s])), [data.skills]);
  const catById = useMemo(() => Object.fromEntries(data.categories.map((c) => [c.id, c])), [data.categories]);

  const slice = data.slices.find((s) => s.key === sliceKey) ?? data.slices[0];
  const stateOf = useCallback(
    (id: string) => slice.states[id] ?? data.status[id],
    [slice, data.status],
  );

  // Graph neighbourhoods for focus mode
  const graph = useMemo(() => {
    const pre = new Map<string, string[]>();
    const post = new Map<string, string[]>();
    const rel = new Map<string, string[]>();
    for (const e of data.edges) {
      if (e.kind === "PREREQUISITE") {
        pre.set(e.to, [...(pre.get(e.to) ?? []), e.from]);
        post.set(e.from, [...(post.get(e.from) ?? []), e.to]);
      } else {
        rel.set(e.to, [...(rel.get(e.to) ?? []), e.from]);
        rel.set(e.from, [...(rel.get(e.from) ?? []), e.to]);
      }
    }
    return { pre, post, rel };
  }, [data.edges]);

  const neighbourhood = useMemo(() => {
    if (!selected) return null;
    const walk = (start: string, m: Map<string, string[]>, depth: number) => {
      const out = new Set<string>();
      let frontier = [start];
      for (let d = 0; d < depth; d++) {
        const next: string[] = [];
        for (const id of frontier)
          for (const n of m.get(id) ?? [])
            if (!out.has(n)) {
              out.add(n);
              next.push(n);
            }
        frontier = next;
      }
      return out;
    };
    const depth = focusMode ? 6 : 1;
    return { up: walk(selected, graph.pre, depth), down: walk(selected, graph.post, depth), rel: new Set(graph.rel.get(selected) ?? []) };
  }, [selected, graph, focusMode]);

  const matches = useCallback(
    (id: string) => {
      const s = skillById[id];
      if (categoryFilter && s.categoryId !== categoryFilter) return false;
      if (stateFilter && stateOf(id).state !== stateFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
      }
      return true;
    },
    [skillById, categoryFilter, stateFilter, query, stateOf],
  );

  const nodes: Node[] = useMemo(() => {
    const rimRadius = data.positions.radius + 110;
    const out: Node[] = [
      {
        id: "__sectors",
        type: "sector",
        position: { x: -rimRadius, y: -rimRadius },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: -1,
        data: {
          radius: rimRadius,
          sectors: data.categories.map((c, i) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            angle: -Math.PI / 2 + (i * Math.PI * 2) / data.categories.length,
            dim: Boolean(categoryFilter && categoryFilter !== c.id),
          })),
        } satisfies SectorNodeData,
      },
      { id: "__center", type: "center", position: { x: -56, y: -60 }, data: { name: data.displayName, tier: data.tierName }, draggable: false, selectable: false },
    ];
    for (const c of data.categories) {
      const p = data.positions.categories[c.id];
      const skillsInCat = data.skills.filter((s) => s.categoryId === c.id);
      out.push({
        id: `cat:${c.id}`,
        type: "category",
        position: { x: p.x - CAT_W / 2, y: p.y - 36 },
        draggable: false,
        data: {
          code: c.code,
          name: c.name,
          color: c.color,
          dim: Boolean(categoryFilter && categoryFilter !== c.id),
          assessed: skillsInCat.filter((s) => stateOf(s.id).mastery !== null).length,
          total: skillsInCat.length,
        } satisfies CategoryNodeData,
      });
    }
    for (const s of data.skills) {
      const p = data.positions.skills[s.id];
      const st = stateOf(s.id);
      let highlight: SkillNodeData["highlight"] = null;
      let inHood = true;
      if (neighbourhood) {
        if (s.id === selected) highlight = "selected";
        else if (neighbourhood.up.has(s.id)) highlight = "upstream";
        else if (neighbourhood.down.has(s.id)) highlight = "downstream";
        else if (neighbourhood.rel.has(s.id)) highlight = "related";
        else inHood = false;
      }
      out.push({
        id: s.id,
        type: "skill",
        position: { x: p.x - SKILL_W / 2, y: p.y - 28 },
        draggable: false,
        selected: s.id === selected,
        data: {
          name: s.name,
          categoryColor: catById[s.categoryId].color,
          state: st.state,
          mastery: st.mastery,
          confidence: st.confidence,
          dim: !matches(s.id) || (focusMode && !inHood),
          highlight,
          recent: sliceKey === "now" && data.recentlyImproved.includes(s.id),
          goal: data.goalSkills.includes(s.id),
          reassess: sliceKey === "now" && Boolean(data.status[s.id]?.needsReassessment),
        } satisfies SkillNodeData,
      });
    }
    return out;
  }, [data, catById, stateOf, neighbourhood, selected, matches, focusMode, categoryFilter, sliceKey]);

  const edges: Edge[] = useMemo(() => {
    const out: Edge[] = [];
    for (const c of data.categories) {
      out.push({ id: `hub:${c.id}`, source: "__center", target: `cat:${c.id}`, type: "floating", data: { kind: "HUB", emphasis: "none", cross: false } });
    }
    // Spoke from each category hub to its foundational skills
    const hasInCatPrereq = new Set(
      data.edges
        .filter((e) => e.kind === "PREREQUISITE" && skillById[e.from]?.categoryId === skillById[e.to]?.categoryId)
        .map((e) => e.to),
    );
    for (const s of data.skills) {
      if (!hasInCatPrereq.has(s.id)) {
        out.push({
          id: `spoke:${s.id}`,
          source: `cat:${s.categoryId}`,
          target: s.id,
          type: "floating",
          data: { kind: "HUB", emphasis: neighbourhood || (categoryFilter && categoryFilter !== s.categoryId) ? "dim" : "none", cross: false },
        });
      }
    }
    data.edges.forEach((e, i) => {
      const cross = skillById[e.from]?.categoryId !== skillById[e.to]?.categoryId;
      let emphasis: FloatingEdgeData["emphasis"] = "none";
      if (neighbourhood && selected) {
        const inUp = (id: string) => id === selected || neighbourhood.up.has(id);
        const inDown = (id: string) => id === selected || neighbourhood.down.has(id);
        if (e.kind === "PREREQUISITE" && inUp(e.to) && (neighbourhood.up.has(e.from))) emphasis = "upstream";
        else if (e.kind === "PREREQUISITE" && inDown(e.from) && neighbourhood.down.has(e.to)) emphasis = "downstream";
        else if (e.kind === "RELATED" && (e.from === selected || e.to === selected)) emphasis = "related";
        else emphasis = "dim";
      } else if (categoryFilter && skillById[e.from]?.categoryId !== categoryFilter && skillById[e.to]?.categoryId !== categoryFilter) {
        emphasis = "dim";
      } else if (e.kind === "RELATED") {
        emphasis = "dim"; // keep the resting map calm; related links appear on selection
      }
      out.push({ id: `e${i}`, source: e.from, target: e.to, type: "floating", data: { kind: e.kind, emphasis, cross }, zIndex: emphasis === "none" || emphasis === "dim" ? 0 : 1 });
    });
    return out;
  }, [data, skillById, neighbourhood, selected, categoryFilter]);

  const select = useCallback(
    (id: string | null, pan = true) => {
      setSelected(id);
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("skill", id);
      else url.searchParams.delete("skill");
      router.replace(url.pathname + url.search, { scroll: false });
      if (id && pan) {
        const p = data.positions.skills[id];
        if (p) setCenter(p.x + 180, p.y, { zoom: 1.05, duration: 600 });
      }
    },
    [router, data.positions.skills, setCenter],
  );

  // Keyboard: Escape clears selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null, false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  useEffect(() => {
    if (categoryFilter) {
      fitView({ nodes: data.skills.filter((s) => s.categoryId === categoryFilter).map((s) => ({ id: s.id })), duration: 600, padding: 0.25 });
    }
  }, [categoryFilter, fitView, data.skills]);

  const searchResults = query.trim() ? data.skills.filter((s) => matches(s.id)).slice(0, 8) : [];
  const sel = selected ? skillById[selected] : null;
  const linked = (ids: Iterable<string>): LinkedSkill[] =>
    [...ids].filter((id) => skillById[id]).map((id) => ({ id, name: skillById[id].name, state: stateOf(id).state }));

  const counts = useMemo(() => {
    const c: Partial<Record<ProficiencyState, number>> = {};
    for (const s of data.skills) c[stateOf(s.id).state] = (c[stateOf(s.id).state] ?? 0) + 1;
    return c;
  }, [data.skills, stateOf]);

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] lg:h-dvh w-full overflow-hidden">
      {/* Toolbar */}
      <div className="absolute left-3 right-3 top-3 z-20 flex flex-col gap-2 pointer-events-none lg:left-5 lg:top-5 lg:right-auto lg:w-[360px]">
        <div className="card pointer-events-auto p-3 shadow-xl shadow-black/30">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 105 skills…"
                aria-label="Search skills"
                className="h-9 w-full rounded-lg border border-line bg-ink/60 pl-8 pr-8 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-text" aria-label="Clear search">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setView(view === "graph" ? "list" : "graph")}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs text-muted hover:text-text"
              aria-label={view === "graph" ? "Switch to list view" : "Switch to graph view"}
            >
              {view === "graph" ? <List className="size-4" /> : <Network className="size-4" />}
            </button>
          </div>
          {searchResults.length > 0 && (
            <ul className="mt-2 max-h-60 overflow-auto rounded-lg border border-line-soft" role="listbox" aria-label="Search results">
              {searchResults.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      select(s.id);
                      setQuery("");
                      setView("graph");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="size-2 rounded-full" style={{ background: catById[s.categoryId].color }} aria-hidden />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="text-[11px] text-faint">{STATE_STYLE[stateOf(s.id).state].short}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Filter by category">
            {data.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
                aria-pressed={categoryFilter === c.id}
                title={c.name}
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                  categoryFilter === c.id ? "text-ink" : "border-line text-muted hover:text-text",
                )}
                style={categoryFilter === c.id ? { background: c.color, borderColor: c.color } : undefined}
              >
                {c.code}
                <span className="sr-only"> {c.name}</span>
              </button>
            ))}
            {(categoryFilter || stateFilter) && (
              <button
                onClick={() => {
                  setCategoryFilter(null);
                  setStateFilter(null);
                  fitView({ duration: 500, padding: 0.1 });
                }}
                className="rounded-md px-2 py-1 text-[11px] text-faint hover:text-text"
              >
                Reset
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-soft pt-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={focusMode} onChange={(e) => setFocusMode(e.target.checked)} className="accent-[#6E9BFF]" />
              Focus branch
            </label>
            {data.slices.length > 1 && (
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <History className="size-3.5 text-faint" aria-hidden />
                <span className="sr-only">View tree as of</span>
                <select
                  value={sliceKey}
                  onChange={(e) => setSliceKey(e.target.value)}
                  className="rounded-md border border-line bg-ink/60 px-1.5 py-1 text-xs focus:outline-none focus:border-accent"
                >
                  {data.slices.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
        {sliceKey !== "now" && (
          <div className="pointer-events-auto rounded-lg border border-amber/30 bg-amber-soft px-3 py-2 text-xs text-amber">
            Viewing your tree as it was at the end of {slice.label}. Evidence added later is hidden.
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 hidden md:block lg:bottom-5 lg:left-5">
        <div className="card px-3 py-2.5" role="group" aria-label="Filter by proficiency state">
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {STATE_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setStateFilter(stateFilter === s ? null : s)}
                aria-pressed={stateFilter === s}
                className={cn("flex items-center gap-1.5 text-[11px] transition-opacity", stateFilter && stateFilter !== s ? "opacity-40" : "opacity-100")}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={s === "NOT_ASSESSED" ? { border: `1.5px dashed ${STATE_STYLE[s].color}` } : { background: STATE_STYLE[s].color }}
                  aria-hidden
                />
                <span className="text-muted">{STATE_STYLE[s].short}</span>
                <span className="font-mono text-faint">{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[10.5px] text-faint">
            <span>Ring = estimate · opacity = confidence</span>
            <span className="text-accent">— builds on</span>
            <span className="text-amber">— supports</span>
          </div>
        </div>
      </div>

      {view === "graph" ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_, n) => {
            if (n.type === "skill") select(n.id);
            if (n.type === "category") setCategoryFilter(n.id.slice(4) === categoryFilter ? null : n.id.slice(4));
          }}
          onPaneClick={() => select(null, false)}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable
          fitView
          fitViewOptions={{ padding: 0.08, nodes: selected ? [{ id: selected }] : undefined, maxZoom: selected ? 1 : undefined }}
          minZoom={0.15}
          maxZoom={2.2}
          proOptions={{ hideAttribution: true }}
          className="!bg-transparent"
          aria-label="Director skill tree"
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#1C2230" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      ) : (
        <div className="h-full overflow-auto px-4 pb-10 pt-[260px] lg:pl-[400px] lg:pt-6">
          <div className="max-w-3xl space-y-8">
            {data.categories.map((c) => {
              const list = data.skills.filter((s) => s.categoryId === c.id && matches(s.id));
              if (!list.length) return null;
              return (
                <section key={c.id} aria-labelledby={`list-${c.id}`}>
                  <h2 id={`list-${c.id}`} className="flex items-center gap-2 text-sm font-semibold">
                    <span className="font-mono" style={{ color: c.color }}>
                      {c.code}
                    </span>
                    {c.name}
                  </h2>
                  <ul className="mt-2 divide-y divide-line-soft rounded-xl border border-line-soft">
                    {list.map((s) => {
                      const st = stateOf(s.id);
                      return (
                        <li key={s.id}>
                          <button onClick={() => select(s.id, false)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface">
                            <span className="flex-1 text-sm">{s.name}</span>
                            <span className="text-xs" style={{ color: STATE_STYLE[st.state].color }}>
                              {STATE_STYLE[st.state].label}
                            </span>
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

      {/* Detail panel */}
      {sel && data.status[sel.id] && (
        <aside
          className="absolute inset-x-0 bottom-0 z-30 max-h-[75dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface/95 px-5 pt-5 backdrop-blur-xl shadow-2xl shadow-black/50 animate-[fadein_.2s_ease-out] md:inset-y-3 md:right-3 md:left-auto md:bottom-3 md:max-h-none md:w-[420px] md:rounded-2xl md:border lg:inset-y-5 lg:right-5"
          aria-label={`${sel.name} details`}
        >
          <button
            onClick={() => select(null, false)}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-text"
            aria-label="Close details"
          >
            <X className="size-4" />
          </button>
          <SkillDetail
            compact
            skill={sel}
            category={catById[sel.categoryId]}
            status={stateOf(sel.id)}
            prerequisites={linked(graph.pre.get(sel.id) ?? [])}
            enables={linked(graph.post.get(sel.id) ?? [])}
            related={linked(graph.rel.get(sel.id) ?? [])}
            extras={data.extras[sel.id] ?? { projects: [], challenges: [] }}
            isGoal={data.goalSkills.includes(sel.id)}
            onNavigate={(id) => select(id)}
          />
        </aside>
      )}
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
