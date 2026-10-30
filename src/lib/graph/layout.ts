/**
 * Radial skill-tree layout. Each category owns an angular sector around the centre;
 * within a sector, skills sit on rings by prerequisite depth (foundations near the
 * centre, advanced syntheses at the rim). Deterministic, so the map is stable
 * between visits — students learn where things are.
 */

export interface LayoutSkill {
  id: string;
  categoryId: string;
}

export interface LayoutCategory {
  id: string;
  order: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
  kind: "PREREQUISITE" | "RELATED";
}

export interface Point {
  x: number;
  y: number;
}

export interface LayoutResult {
  skills: Record<string, Point & { depth: number; angle: number }>;
  categories: Record<string, Point & { angle: number }>;
  radius: number;
}

const HUB_RADIUS = 260;
const FIRST_RING = 470;
const RING_GAP = 175;
const NODE_SPACING = 150;

export function computeDepths(skills: LayoutSkill[], edges: LayoutEdge[]): Record<string, number> {
  const cat = new Map(skills.map((s) => [s.id, s.categoryId]));
  const prereqs = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind !== "PREREQUISITE") continue;
    if (cat.get(e.from) !== cat.get(e.to)) continue; // depth is computed within a category
    prereqs.set(e.to, [...(prereqs.get(e.to) ?? []), e.from]);
  }
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const depth = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return 0; // defensive: cycles shouldn't exist
    visiting.add(id);
    const d = Math.max(-1, ...(prereqs.get(id) ?? []).map(depth)) + 1;
    visiting.delete(id);
    memo.set(id, d);
    return d;
  };
  return Object.fromEntries(skills.map((s) => [s.id, depth(s.id)]));
}

export function computeRadialLayout(
  categories: LayoutCategory[],
  skills: LayoutSkill[],
  edges: LayoutEdge[],
): LayoutResult {
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  const sector = (Math.PI * 2) / sorted.length;
  const depths = computeDepths(skills, edges);
  const result: LayoutResult = { skills: {}, categories: {}, radius: 0 };

  sorted.forEach((c, i) => {
    const centerAngle = -Math.PI / 2 + i * sector;
    result.categories[c.id] = {
      x: Math.cos(centerAngle) * HUB_RADIUS,
      y: Math.sin(centerAngle) * HUB_RADIUS,
      angle: centerAngle,
    };

    const inCat = skills.filter((s) => s.categoryId === c.id);
    const byDepth = new Map<number, LayoutSkill[]>();
    for (const s of inCat) {
      const d = depths[s.id];
      byDepth.set(d, [...(byDepth.get(d) ?? []), s]);
    }

    // Stagger alternate sectors by half a ring so neighbours never collide at the seam.
    let radius = FIRST_RING + (i % 2) * (RING_GAP / 2);
    const usable = sector * 0.8;
    for (const d of [...byDepth.keys()].sort((a, b) => a - b)) {
      let queue = [...byDepth.get(d)!].sort((a, b) => a.id.localeCompare(b.id));
      while (queue.length) {
        const capacity = Math.max(1, Math.floor((usable * radius) / NODE_SPACING));
        const row = queue.slice(0, capacity);
        queue = queue.slice(capacity);
        const step = row.length > 1 ? usable / (row.length - 1) : 0;
        const startAngle = centerAngle - (step * (row.length - 1)) / 2;
        row.forEach((s, j) => {
          const angle = startAngle + j * step;
          result.skills[s.id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, depth: d, angle };
        });
        result.radius = Math.max(result.radius, radius);
        radius += RING_GAP;
      }
    }
  });

  return result;
}

export interface BranchLayout {
  nodes: Record<string, Point & { column: number }>;
  columns: number;
  height: number;
}

const COL_GAP = 300;
const ROW_GAP = 128;

/**
 * Left-to-right layered layout for one category: column = prerequisite depth
 * within the category, rows ordered by the average row of each skill's
 * prerequisites (barycentre) to keep links short and mostly uncrossed.
 */
export function computeBranchLayout(skills: LayoutSkill[], edges: LayoutEdge[]): BranchLayout {
  const depths = computeDepths(skills, edges);
  const ids = new Set(skills.map((s) => s.id));
  const pre = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind !== "PREREQUISITE" || !ids.has(e.from) || !ids.has(e.to)) continue;
    pre.set(e.to, [...(pre.get(e.to) ?? []), e.from]);
  }
  const columns: string[][] = [];
  for (const s of [...skills].sort((a, b) => a.id.localeCompare(b.id))) (columns[depths[s.id]] ??= []).push(s.id);
  const row = new Map<string, number>();
  columns.forEach((col, c) => {
    if (c > 0) {
      const score = (id: string) => {
        const ps = (pre.get(id) ?? []).filter((p) => row.has(p));
        return ps.length ? ps.reduce((sum, p) => sum + row.get(p)!, 0) / ps.length : Number.MAX_SAFE_INTEGER;
      };
      col.sort((a, b) => score(a) - score(b) || a.localeCompare(b));
    }
    col.forEach((id, i) => row.set(id, i - (col.length - 1) / 2));
  });
  const nodes: BranchLayout["nodes"] = {};
  columns.forEach((col, c) => col.forEach((id) => (nodes[id] = { x: c * COL_GAP, y: row.get(id)! * ROW_GAP, column: c })));
  const tallest = Math.max(1, ...columns.map((c) => c.length));
  return { nodes, columns: columns.length, height: tallest * ROW_GAP };
}
