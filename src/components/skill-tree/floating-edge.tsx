"use client";

import { memo } from "react";
import { BaseEdge, useInternalNode, type EdgeProps, type Edge } from "@xyflow/react";

export type FloatingEdgeData = {
  kind: "PREREQUISITE" | "RELATED" | "HUB";
  emphasis: "none" | "upstream" | "downstream" | "related" | "dim";
  cross: boolean;
};

function center(n: ReturnType<typeof useInternalNode>) {
  if (!n) return null;
  const w = n.measured?.width ?? 0;
  const h = n.measured?.height ?? 0;
  // Anchor at the circle (top part) of skill nodes rather than the label.
  const isSkill = n.type === "skill";
  return { x: n.internals.positionAbsolute.x + w / 2, y: n.internals.positionAbsolute.y + (isSkill ? 28 : h / 2) };
}

/** Center-to-center curved edge; curves bow gently toward the tree's centre. */
export const FloatingEdge = memo(function FloatingEdge({ id, source, target, data }: EdgeProps<Edge<FloatingEdgeData>>) {
  const s = center(useInternalNode(source));
  const t = center(useInternalNode(target));
  if (!s || !t || !data) return null;

  const mx = (s.x + t.x) / 2;
  const my = (s.y + t.y) / 2;
  const pull = data.cross ? 0.35 : 0.12;
  const cx = mx * (1 - pull);
  const cy = my * (1 - pull);
  const path = `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;

  const e = data.emphasis;
  let stroke = data.kind === "HUB" ? "#1F2533" : data.cross ? "#20283A" : "#2A3142";
  let width = data.kind === "HUB" ? 1 : 1.2;
  // Resting map stays calm: cross-category links are whispers until a skill is selected.
  let opacity = data.cross && e === "none" ? 0.22 : 0.75;
  let dash: string | undefined = data.kind === "RELATED" ? "2 5" : undefined;
  let className: string | undefined;
  if (e === "upstream") {
    stroke = "#6E9BFF";
    width = 1.8;
    opacity = 1;
    dash = "6 4";
    className = "edge-flow";
  } else if (e === "downstream") {
    stroke = "#E8B04B";
    width = 1.6;
    opacity = 0.95;
    dash = "6 4";
    className = "edge-flow";
  } else if (e === "related") {
    stroke = "#9BA4B5";
    width = 1.2;
    opacity = 0.8;
  } else if (e === "dim") {
    opacity = 0.08;
  }

  return <BaseEdge id={id} path={path} className={className} style={{ stroke, strokeWidth: width, opacity, strokeDasharray: dash, transition: "opacity 300ms" }} />;
});
