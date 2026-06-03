"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { Brand, Project, SubProject, Stage, Channel } from "@/lib/types";

/* ─── Types ─────────────────────────────────────────────── */
interface WBNode {
  id: string;
  type: "brand" | "project" | "subproject";
  label: string;
  emoji: string;
  color: string;
  parentId: string | null;
  existingId?: string;
  x: number;
  y: number;
}

/* ─── Constants ──────────────────────────────────────────── */
const BRAND_W = 240;
const PROJECT_W = 200;
const SUB_W = 170;
const NODE_H = 80;
const BRAND_Y = 100;
const PROJECT_DY = 260;
const SUB_DY = 220;

/* Minimum gap between NODE EDGES (not centers) */
const GAP_SUB   = 40;   // gap between adjacent sub edges within a project
const GAP_PROJ  = 60;   // gap between adjacent project footprint edges within a brand
const GAP_BRAND = 140;  // gap between adjacent brand footprint edges

const BRAND_COLORS = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6",
  "#ec4899", "#f59e0b", "#ef4444", "#14b8a6",
];

const EMOJI_PALETTE = [
  "🏢", "🚀", "💡", "🎯", "🌟", "🔥", "💎", "🎨",
  "🌈", "⚡", "🎵", "🍀", "🏆", "🌙", "🌊", "🦋",
  "🎪", "🔮", "🌺", "🦁",
];

/* ─── Layout helpers ────────────────────────────────────── */

/**
 * Returns the total pixel FOOTPRINT of a node (left-edge to right-edge)
 * including all its visible children, using GAP_* constants between edges.
 *
 * All coordinates are LEFT-EDGE based (matching CSS `left`).
 */
function footprint(
  node: WBNode,
  allNodes: WBNode[],
  collapsed: Set<string>
): number {
  if (node.type === "subproject") return SUB_W;

  const children = allNodes.filter((n) => n.parentId === node.id);

  if (node.type === "project") {
    if (collapsed.has(node.id) || children.length === 0) return PROJECT_W;
    const childSpan =
      children.length * SUB_W + (children.length - 1) * GAP_SUB;
    return Math.max(PROJECT_W, childSpan);
  }

  // brand
  if (collapsed.has(node.id) || children.length === 0) return BRAND_W;
  const projFootprints = children.map((p) => footprint(p, allNodes, collapsed));
  const childSpan =
    projFootprints.reduce((s, fp) => s + fp, 0) +
    (children.length - 1) * GAP_PROJ;
  return Math.max(BRAND_W, childSpan);
}

function layoutNodes(nodes: WBNode[], collapsed: Set<string>): WBNode[] {
  const brands   = nodes.filter((n) => n.type === "brand");
  const projects = nodes.filter((n) => n.type === "project");
  const subs     = nodes.filter((n) => n.type === "subproject");

  /* ── total canvas width ── */
  const brandFootprints = brands.map((b) => footprint(b, nodes, collapsed));
  const totalCanvasW =
    brandFootprints.reduce((s, fp) => s + fp, 0) +
    (brands.length - 1) * GAP_BRAND;

  const out: WBNode[] = [];
  /* Start left-edge of first brand so everything is centred on x=0 */
  let brandLeft = -totalCanvasW / 2;

  for (let bi = 0; bi < brands.length; bi++) {
    const brand  = brands[bi];
    const brandFP = brandFootprints[bi];
    const brandCX = brandLeft + brandFP / 2; // visual centre of brand footprint

    /* Brand node — centred in its footprint */
    out.push({ ...brand, x: brandCX - BRAND_W / 2, y: BRAND_Y });

    if (!collapsed.has(brand.id)) {
      const brandProjects = projects.filter((p) => p.parentId === brand.id);
      if (brandProjects.length > 0) {
        const projFPs = brandProjects.map((p) =>
          footprint(p, nodes, collapsed)
        );
        const totalProjSpan =
          projFPs.reduce((s, fp) => s + fp, 0) +
          (brandProjects.length - 1) * GAP_PROJ;

        /* centre projects inside brand footprint */
        let projLeft = brandLeft + (brandFP - totalProjSpan) / 2;

        for (let pi = 0; pi < brandProjects.length; pi++) {
          const project = brandProjects[pi];
          const projFP  = projFPs[pi];
          const projCX  = projLeft + projFP / 2;

          out.push({
            ...project,
            x: projCX - PROJECT_W / 2,
            y: BRAND_Y + PROJECT_DY,
          });

          if (!collapsed.has(project.id)) {
            const projectSubs = subs.filter((s) => s.parentId === project.id);
            if (projectSubs.length > 0) {
              const totalSubSpan =
                projectSubs.length * SUB_W +
                (projectSubs.length - 1) * GAP_SUB;
              /* centre subs inside project footprint */
              let subLeft = projCX - totalSubSpan / 2;
              for (const sub of projectSubs) {
                out.push({
                  ...sub,
                  x: subLeft,
                  y: BRAND_Y + PROJECT_DY + SUB_DY,
                });
                subLeft += SUB_W + GAP_SUB;
              }
            }
          }

          projLeft += projFP + GAP_PROJ;
        }
      }
    }

    brandLeft += brandFP + GAP_BRAND;
  }

  /* Orphans (nodes not placed above) */
  const placedIds = new Set(out.map((n) => n.id));
  for (const n of nodes) {
    if (!placedIds.has(n.id)) out.push(n);
  }

  return out;
}

/* ─── Convert Brand[] → WBNode[] ───────────────────────── */
function brandsToNodes(brands: Brand[]): WBNode[] {
  const nodes: WBNode[] = [];
  for (const brand of brands) {
    const brandNode: WBNode = {
      id: uuidv4(),
      type: "brand",
      label: brand.name,
      emoji: brand.emoji,
      color: brand.color,
      parentId: null,
      existingId: brand.id,
      x: 0,
      y: 0,
    };
    nodes.push(brandNode);

    for (const project of brand.projects) {
      const projectNode: WBNode = {
        id: uuidv4(),
        type: "project",
        label: project.name,
        emoji: project.emoji,
        color: brand.color,
        parentId: brandNode.id,
        existingId: project.id,
        x: 0,
        y: 0,
      };
      nodes.push(projectNode);

      for (const sub of project.subProjects) {
        nodes.push({
          id: uuidv4(),
          type: "subproject",
          label: sub.name,
          emoji: sub.emoji,
          color: brand.color,
          parentId: projectNode.id,
          existingId: sub.id,
          x: 0,
          y: 0,
        });
      }
    }
  }
  return nodes;
}

/* ─── Convert WBNode[] → Brand[] ───────────────────────── */
function nodesToBrands(nodes: WBNode[], existingBrands: Brand[]): Brand[] {
  const brandMap = new Map<string, Brand>();
  for (const b of existingBrands) brandMap.set(b.id, b);

  const brandNodes = nodes.filter((n) => n.type === "brand");
  const projectNodes = nodes.filter((n) => n.type === "project");
  const subNodes = nodes.filter((n) => n.type === "subproject");

  return brandNodes.map((bNode, bi) => {
    const existingBrand = bNode.existingId ? brandMap.get(bNode.existingId) : undefined;
    const childProjects = projectNodes.filter((p) => p.parentId === bNode.id);

    const projects: Project[] = childProjects.map((pNode, pi) => {
      const existingProject = existingBrand?.projects.find(
        (p) => p.id === pNode.existingId
      );
      const childSubs = subNodes.filter((s) => s.parentId === pNode.id);

      const subProjects: SubProject[] = childSubs.map((sNode, si) => {
        const existingSub = existingProject?.subProjects.find(
          (s) => s.id === sNode.existingId
        );
        return {
          ...(existingSub ?? {
            id: uuidv4(),
            description: "",
            stages: [],
            channels: [],
            order: si,
          }),
          id: sNode.existingId ?? uuidv4(),
          name: sNode.label,
          emoji: sNode.emoji,
          order: si,
        } as SubProject;
      });

      return {
        ...(existingProject ?? {
          id: uuidv4(),
          description: "",
          color: pNode.color,
          subProjects: [],
          order: pi,
        }),
        id: pNode.existingId ?? uuidv4(),
        name: pNode.label,
        emoji: pNode.emoji,
        color: pNode.color,
        subProjects,
        order: pi,
      } as Project;
    });

    return {
      ...(existingBrand ?? {
        id: uuidv4(),
        description: "",
        createdAt: new Date().toISOString(),
        projects: [],
        goals: [],
      }),
      id: bNode.existingId ?? uuidv4(),
      name: bNode.label,
      emoji: bNode.emoji,
      color: bNode.color,
      projects,
    } as Brand;
  });
}

/* ─── Node width by type ───────────────────────────────── */
function nodeWidth(type: WBNode["type"]) {
  if (type === "brand") return BRAND_W;
  if (type === "project") return PROJECT_W;
  return SUB_W;
}

/* ─── Get visible node IDs (respects collapse) ─────────── */
function getVisibleNodeIds(nodes: WBNode[], collapsed: Set<string>): Set<string> {
  const visible = new Set<string>();
  for (const n of nodes) {
    if (n.type === "brand") {
      visible.add(n.id);
      continue;
    }
    if (!n.parentId) { visible.add(n.id); continue; }
    // Check all ancestors
    let parentId: string | null = n.parentId;
    let ok = true;
    while (parentId) {
      if (collapsed.has(parentId)) { ok = false; break; }
      const parent = nodes.find(x => x.id === parentId);
      parentId = parent?.parentId ?? null;
    }
    if (ok) visible.add(n.id);
  }
  return visible;
}

/* ─── Canvas themes ──────────────────────────────────────── */
const WB_THEME_KEY = "beseder_wb_theme_v2";

interface WBTheme {
  id: string;
  label: string;
  preview: string;          // CSS for the swatch dot
  canvasBg: string;         // canvas background
  canvasBgImg?: string;     // optional background-image for patterns/gradients
  canvasBgSize?: string;
  dotColor: string;         // dot-grid color (if no bgImg)
  toolbarBg: string;
  toolbarBorder: string;
  btnBg: string; btnBorder: string; btnText: string;
  titleColor: string; subtitleColor: string;
  nodeBrandBg: (c: string) => string;
  nodeBrandBorder: (c: string) => string;
  nodeProjectBg: (c: string) => string;
  nodeSubBg: (c: string) => string;
  labelColor: string;
  zoomBtnBg: string; zoomBtnBorder: string;
  collapseIdleBg: string;
  emojiPickerBg: string; emojiPickerBorder: string; emojiPickerHover: string;
  inputBg: string; inputColor: string;
  addChildBg: string; deleteBtnBg: string;
}

const WB_THEMES: WBTheme[] = [
  /* ── כהים ── */
  {
    id: "noir", label: "שחור", preview: "#0d0f18",
    canvasBg: "#0d0f18", dotColor: "rgba(255,255,255,0.025)",
    toolbarBg: "rgba(13,15,24,0.96)", toolbarBorder: "#1a1d2c",
    btnBg: "#181b28", btnBorder: "#252838", btnText: "#9ca3af",
    titleColor: "#e2e8f0", subtitleColor: "#4b5563",
    nodeBrandBg: c => `linear-gradient(135deg,${c}30 0%,#1a1d2a 100%)`,
    nodeBrandBorder: c => c + "55",
    nodeProjectBg: c => `linear-gradient(135deg,${c}20 0%,#151821 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}15 0%,#131620 100%)`,
    labelColor: "#f1f5f9",
    zoomBtnBg: "#181b28", zoomBtnBorder: "#252838",
    collapseIdleBg: "#1e2130",
    emojiPickerBg: "#1a1d2a", emojiPickerBorder: "#2a2d3e", emojiPickerHover: "rgba(255,255,255,0.1)",
    inputBg: "rgba(255,255,255,0.08)", inputColor: "#fff",
    addChildBg: "rgba(15,17,23,0.9)", deleteBtnBg: "#ef4444",
  },
  {
    id: "midnight", label: "חצות", preview: "#070b1a",
    canvasBg: "#070b1a", dotColor: "rgba(255,255,255,0.02)",
    toolbarBg: "rgba(7,11,26,0.96)", toolbarBorder: "#141930",
    btnBg: "#0f1428", btnBorder: "#1e2440", btnText: "#8b9ab5",
    titleColor: "#c8d6f0", subtitleColor: "#3d4e70",
    nodeBrandBg: c => `linear-gradient(135deg,${c}28 0%,#0d1530 100%)`,
    nodeBrandBorder: c => c + "50",
    nodeProjectBg: c => `linear-gradient(135deg,${c}1e 0%,#0b1228 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}16 0%,#090f22 100%)`,
    labelColor: "#dde6f8",
    zoomBtnBg: "#0f1428", zoomBtnBorder: "#1e2440",
    collapseIdleBg: "#141930",
    emojiPickerBg: "#0f1428", emojiPickerBorder: "#1e2440", emojiPickerHover: "rgba(255,255,255,0.08)",
    inputBg: "rgba(255,255,255,0.07)", inputColor: "#dde6f8",
    addChildBg: "rgba(7,11,26,0.9)", deleteBtnBg: "#ef4444",
  },
  {
    id: "forest", label: "יער", preview: "#071510",
    canvasBg: "#071510", dotColor: "rgba(255,255,255,0.02)",
    toolbarBg: "rgba(7,21,16,0.96)", toolbarBorder: "#122b1e",
    btnBg: "#0d2018", btnBorder: "#1a3828", btnText: "#6ba587",
    titleColor: "#c8f0dc", subtitleColor: "#2d5440",
    nodeBrandBg: c => `linear-gradient(135deg,${c}28 0%,#0d2018 100%)`,
    nodeBrandBorder: c => c + "55",
    nodeProjectBg: c => `linear-gradient(135deg,${c}1e 0%,#091a12 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}16 0%,#071510 100%)`,
    labelColor: "#e0f5ea",
    zoomBtnBg: "#0d2018", zoomBtnBorder: "#1a3828",
    collapseIdleBg: "#122b1e",
    emojiPickerBg: "#0d2018", emojiPickerBorder: "#1a3828", emojiPickerHover: "rgba(255,255,255,0.08)",
    inputBg: "rgba(255,255,255,0.07)", inputColor: "#e0f5ea",
    addChildBg: "rgba(7,21,16,0.9)", deleteBtnBg: "#ef4444",
  },
  {
    id: "wine", label: "יין", preview: "#160a1e",
    canvasBg: "#160a1e", dotColor: "rgba(255,255,255,0.02)",
    toolbarBg: "rgba(22,10,30,0.96)", toolbarBorder: "#2a1538",
    btnBg: "#200e2c", btnBorder: "#38204a", btnText: "#a080c0",
    titleColor: "#f0d0ff", subtitleColor: "#5a3870",
    nodeBrandBg: c => `linear-gradient(135deg,${c}28 0%,#1e0c2a 100%)`,
    nodeBrandBorder: c => c + "55",
    nodeProjectBg: c => `linear-gradient(135deg,${c}1e 0%,#180a24 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}16 0%,#130820 100%)`,
    labelColor: "#f2e0ff",
    zoomBtnBg: "#200e2c", zoomBtnBorder: "#38204a",
    collapseIdleBg: "#2a1538",
    emojiPickerBg: "#200e2c", emojiPickerBorder: "#38204a", emojiPickerHover: "rgba(255,255,255,0.08)",
    inputBg: "rgba(255,255,255,0.07)", inputColor: "#f2e0ff",
    addChildBg: "rgba(22,10,30,0.9)", deleteBtnBg: "#ef4444",
  },
  {
    id: "galaxy", label: "גלקסיה", preview: "linear-gradient(135deg,#0a0a2e,#3a0a5e)",
    canvasBg: "#0a0a2e",
    canvasBgImg: "radial-gradient(ellipse at 20% 30%,#3f51b530 0%,transparent 50%),radial-gradient(ellipse at 80% 70%,#7c4dff25 0%,transparent 50%),radial-gradient(circle,rgba(255,255,255,0.018) 1px,transparent 1px)",
    canvasBgSize: "auto,auto,32px 32px",
    dotColor: "transparent",
    toolbarBg: "rgba(10,10,46,0.96)", toolbarBorder: "#1a1850",
    btnBg: "#14123a", btnBorder: "#28265a", btnText: "#9090e0",
    titleColor: "#d8d0ff", subtitleColor: "#44408a",
    nodeBrandBg: c => `linear-gradient(135deg,${c}28 0%,#16144a 100%)`,
    nodeBrandBorder: c => c + "55",
    nodeProjectBg: c => `linear-gradient(135deg,${c}1e 0%,#10103c 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}16 0%,#0c0c30 100%)`,
    labelColor: "#ece8ff",
    zoomBtnBg: "#14123a", zoomBtnBorder: "#28265a",
    collapseIdleBg: "#1a1850",
    emojiPickerBg: "#14123a", emojiPickerBorder: "#28265a", emojiPickerHover: "rgba(255,255,255,0.08)",
    inputBg: "rgba(255,255,255,0.07)", inputColor: "#ece8ff",
    addChildBg: "rgba(10,10,46,0.9)", deleteBtnBg: "#ef4444",
  },
  /* ── בהירים ── */
  {
    id: "minimal", label: "מינימל", preview: "#f1f5f9",
    canvasBg: "#f1f5f9", dotColor: "rgba(0,0,0,0.055)",
    toolbarBg: "rgba(255,255,255,0.97)", toolbarBorder: "#e5e7eb",
    btnBg: "#f3f4f6", btnBorder: "#d1d5db", btnText: "#6b7280",
    titleColor: "#111827", subtitleColor: "#9ca3af",
    nodeBrandBg: c => `linear-gradient(135deg,${c}18 0%,#ffffff 100%)`,
    nodeBrandBorder: c => c + "50",
    nodeProjectBg: c => `linear-gradient(135deg,${c}12 0%,#f9fafb 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}0e 0%,#f9fafb 100%)`,
    labelColor: "#111827",
    zoomBtnBg: "#f3f4f6", zoomBtnBorder: "#d1d5db",
    collapseIdleBg: "#f3f4f6",
    emojiPickerBg: "#ffffff", emojiPickerBorder: "#e5e7eb", emojiPickerHover: "rgba(0,0,0,0.06)",
    inputBg: "rgba(0,0,0,0.06)", inputColor: "#111827",
    addChildBg: "rgba(245,247,250,0.95)", deleteBtnBg: "#ef4444",
  },
  {
    id: "warm", label: "קרם", preview: "#fef9f0",
    canvasBg: "#fef9f0", dotColor: "rgba(180,120,40,0.06)",
    toolbarBg: "rgba(255,253,245,0.97)", toolbarBorder: "#f0d8a8",
    btnBg: "#fdf3df", btnBorder: "#e8c878", btnText: "#8a6820",
    titleColor: "#5a3e10", subtitleColor: "#b8963c",
    nodeBrandBg: c => `linear-gradient(135deg,${c}18 0%,#fffdf5 100%)`,
    nodeBrandBorder: c => c + "50",
    nodeProjectBg: c => `linear-gradient(135deg,${c}12 0%,#fffef8 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}0e 0%,#fffef8 100%)`,
    labelColor: "#3a2808",
    zoomBtnBg: "#fdf3df", zoomBtnBorder: "#e8c878",
    collapseIdleBg: "#fdf3df",
    emojiPickerBg: "#fffef5", emojiPickerBorder: "#f0d8a8", emojiPickerHover: "rgba(0,0,0,0.05)",
    inputBg: "rgba(0,0,0,0.05)", inputColor: "#3a2808",
    addChildBg: "rgba(254,249,240,0.95)", deleteBtnBg: "#ef4444",
  },
  {
    id: "sky", label: "שמיים", preview: "#f0f9ff",
    canvasBg: "#f0f9ff", dotColor: "rgba(14,100,180,0.055)",
    toolbarBg: "rgba(240,249,255,0.97)", toolbarBorder: "#bae6fd",
    btnBg: "#e0f2fe", btnBorder: "#7dd3fc", btnText: "#0369a1",
    titleColor: "#0c4a6e", subtitleColor: "#7db8d8",
    nodeBrandBg: c => `linear-gradient(135deg,${c}18 0%,#f8fcff 100%)`,
    nodeBrandBorder: c => c + "50",
    nodeProjectBg: c => `linear-gradient(135deg,${c}12 0%,#f3faff 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}0e 0%,#f3faff 100%)`,
    labelColor: "#0c3050",
    zoomBtnBg: "#e0f2fe", zoomBtnBorder: "#7dd3fc",
    collapseIdleBg: "#e0f2fe",
    emojiPickerBg: "#f8fcff", emojiPickerBorder: "#bae6fd", emojiPickerHover: "rgba(0,0,0,0.05)",
    inputBg: "rgba(0,0,0,0.05)", inputColor: "#0c3050",
    addChildBg: "rgba(240,249,255,0.95)", deleteBtnBg: "#ef4444",
  },
  {
    id: "rose", label: "ורוד", preview: "#fff1f2",
    canvasBg: "#fff1f2", dotColor: "rgba(180,40,80,0.055)",
    toolbarBg: "rgba(255,245,246,0.97)", toolbarBorder: "#fda4af",
    btnBg: "#ffe4e6", btnBorder: "#fb7185", btnText: "#be123c",
    titleColor: "#881337", subtitleColor: "#f08090",
    nodeBrandBg: c => `linear-gradient(135deg,${c}18 0%,#fff8f9 100%)`,
    nodeBrandBorder: c => c + "50",
    nodeProjectBg: c => `linear-gradient(135deg,${c}12 0%,#fff5f6 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}0e 0%,#fff5f6 100%)`,
    labelColor: "#6b0a22",
    zoomBtnBg: "#ffe4e6", zoomBtnBorder: "#fb7185",
    collapseIdleBg: "#ffe4e6",
    emojiPickerBg: "#fff8f9", emojiPickerBorder: "#fda4af", emojiPickerHover: "rgba(0,0,0,0.05)",
    inputBg: "rgba(0,0,0,0.05)", inputColor: "#6b0a22",
    addChildBg: "rgba(255,241,242,0.95)", deleteBtnBg: "#ef4444",
  },
  {
    id: "mint", label: "מנטה", preview: "#f0fdf4",
    canvasBg: "#f0fdf4", dotColor: "rgba(20,140,80,0.055)",
    toolbarBg: "rgba(240,253,244,0.97)", toolbarBorder: "#86efac",
    btnBg: "#dcfce7", btnBorder: "#4ade80", btnText: "#15803d",
    titleColor: "#14532d", subtitleColor: "#6aaa85",
    nodeBrandBg: c => `linear-gradient(135deg,${c}18 0%,#f8fffe 100%)`,
    nodeBrandBorder: c => c + "50",
    nodeProjectBg: c => `linear-gradient(135deg,${c}12 0%,#f5fffb 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}0e 0%,#f5fffb 100%)`,
    labelColor: "#0f401e",
    zoomBtnBg: "#dcfce7", zoomBtnBorder: "#4ade80",
    collapseIdleBg: "#dcfce7",
    emojiPickerBg: "#f8fffe", emojiPickerBorder: "#86efac", emojiPickerHover: "rgba(0,0,0,0.05)",
    inputBg: "rgba(0,0,0,0.05)", inputColor: "#0f401e",
    addChildBg: "rgba(240,253,244,0.95)", deleteBtnBg: "#ef4444",
  },
  {
    id: "grid-light", label: "גריד", preview: "#f8fafc",
    canvasBg: "#f8fafc",
    canvasBgImg: "linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)",
    canvasBgSize: "24px 24px",
    dotColor: "transparent",
    toolbarBg: "rgba(255,255,255,0.97)", toolbarBorder: "#e5e7eb",
    btnBg: "#f3f4f6", btnBorder: "#d1d5db", btnText: "#6b7280",
    titleColor: "#111827", subtitleColor: "#9ca3af",
    nodeBrandBg: c => `linear-gradient(135deg,${c}18 0%,#ffffff 100%)`,
    nodeBrandBorder: c => c + "50",
    nodeProjectBg: c => `linear-gradient(135deg,${c}12 0%,#f9fafb 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}0e 0%,#f9fafb 100%)`,
    labelColor: "#111827",
    zoomBtnBg: "#f3f4f6", zoomBtnBorder: "#d1d5db",
    collapseIdleBg: "#f3f4f6",
    emojiPickerBg: "#ffffff", emojiPickerBorder: "#e5e7eb", emojiPickerHover: "rgba(0,0,0,0.06)",
    inputBg: "rgba(0,0,0,0.06)", inputColor: "#111827",
    addChildBg: "rgba(248,250,252,0.95)", deleteBtnBg: "#ef4444",
  },
  {
    id: "dots-dark", label: "נקודות כהות", preview: "#1e2130",
    canvasBg: "#1e2130",
    canvasBgImg: "radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px)",
    canvasBgSize: "24px 24px",
    dotColor: "transparent",
    toolbarBg: "rgba(20,22,36,0.96)", toolbarBorder: "#2a2d42",
    btnBg: "#252838", btnBorder: "#353850", btnText: "#8890aa",
    titleColor: "#dde4f4", subtitleColor: "#525870",
    nodeBrandBg: c => `linear-gradient(135deg,${c}2a 0%,#1e2238 100%)`,
    nodeBrandBorder: c => c + "55",
    nodeProjectBg: c => `linear-gradient(135deg,${c}20 0%,#191d30 100%)`,
    nodeSubBg: c => `linear-gradient(135deg,${c}18 0%,#161928 100%)`,
    labelColor: "#e8eeff",
    zoomBtnBg: "#252838", zoomBtnBorder: "#353850",
    collapseIdleBg: "#2a2d42",
    emojiPickerBg: "#1e2238", emojiPickerBorder: "#2a2d42", emojiPickerHover: "rgba(255,255,255,0.08)",
    inputBg: "rgba(255,255,255,0.08)", inputColor: "#e8eeff",
    addChildBg: "rgba(30,33,48,0.9)", deleteBtnBg: "#ef4444",
  },
];

/* ─── Brand financials helper ────────────────────────────── */
function brandFinancials(brand: Brand): { income: number; expenses: number } {
  let income = 0, expenses = 0;
  for (const proj of brand.projects) {
    for (const sub of proj.subProjects) {
      expenses += (sub.expenses ?? []).reduce((s, e) => s + e.amount, 0);
      for (const st of sub.stages) expenses += (st.expenses ?? []).reduce((a, e) => a + e.amount, 0);
      for (const ch of (sub.channels ?? [])) {
        expenses += (ch.expenses ?? []).reduce((a, e) => a + e.amount, 0);
        for (const st of ch.stages) expenses += (st.expenses ?? []).reduce((a, e) => a + e.amount, 0);
        income += (ch.incomes ?? []).reduce((a, e) => a + e.amount, 0);
      }
      income += (sub.incomes ?? []).reduce((s, e) => s + e.amount, 0);
      expenses += (sub.commitments ?? []).reduce((s, c) => {
        const paid = (c.payments ?? []).filter((p: { paid: boolean }) => p.paid).length;
        if (paid >= c.totalPayments && c.totalPayments > 0) return s;
        if (c.frequency === 'monthly') return s + c.amountPerPayment;
        if (c.frequency === 'weekly') return s + c.amountPerPayment * 4;
        return s;
      }, 0);
    }
  }
  return { income, expenses };
}

/* ─── Edit-panel target ──────────────────────────────────── */
interface EditTarget {
  brandId: string;    // brand.id (existingId)
  projectId: string;  // project.id
  subId?: string;     // subProject.id (if drilling into sub)
}

const STATUS_CYCLE: Stage["status"][] = ["todo", "active", "done", "blocked"];
const STATUS_META: Record<Stage["status"], { label: string; bg: string; text: string }> = {
  todo:    { label: "לא התחיל", bg: "#2a2d3e",   text: "#9ca3af" },
  active:  { label: "בתהליך",   bg: "#1e3a5f55", text: "#60a5fa" },
  done:    { label: "הושלם",    bg: "#14532d44", text: "#4ade80" },
  blocked: { label: "תקוע",     bg: "#4c051944", text: "#f87171" },
};

/* ─── Main component ─────────────────────────────────────── */
export default function WhiteboardBuilder({
  brands,
  onSave,
  onClose,
  onBrandUpdate,
}: {
  brands: Brand[];
  onSave: (updated: Brand[]) => void;
  onClose: () => void;
  onBrandUpdate?: (brand: Brand) => void;
}) {
  const rawNodes = useMemo(() => brandsToNodes(brands), []);
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(WB_THEME_KEY) ?? "noir";
    }
    return "noir";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const th = WB_THEMES.find(t => t.id === themeId) ?? WB_THEMES[0];
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [addingStage, setAddingStage] = useState<{ name: string; notes: string; status: Stage["status"]; nextAction: string } | null>(null);

  const applyTheme = (id: string) => {
    setThemeId(id);
    if (typeof localStorage !== "undefined") localStorage.setItem(WB_THEME_KEY, id);
    setShowThemePicker(false);
  };

  // Projects collapsed by default, brands open
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const n of rawNodes) {
      if (n.type === "project") s.add(n.id);
    }
    return s;
  });
  const [nodes, setNodes] = useState<WBNode[]>(() => layoutNodes(rawNodes, collapsed));
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [emojiPickerId, setEmojiPickerId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const offsetAtStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  /* Live refs so the non-passive wheel handler never reads stale state */
  const scaleRef  = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOffset({ x: window.innerWidth / 2, y: 80 });
    }
  }, []);

  /* ── Non-passive wheel: zoom anchored to cursor, no browser page zoom ── */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const oldScale  = scaleRef.current;
      const oldOffset = offsetRef.current;
      const factor    = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale  = Math.min(2.5, Math.max(0.2, oldScale * factor));

      /* cursor position relative to the canvas div */
      const rect = el.getBoundingClientRect();
      const cx   = e.clientX - rect.left;
      const cy   = e.clientY - rect.top;

      /* Keep the canvas point under the cursor stationary:
         canvas_pt = (cursor - offset) / scale  must stay the same
         ⟹ newOffset = cursor - canvas_pt * newScale                */
      const newOffset = {
        x: cx - ((cx - oldOffset.x) / oldScale) * newScale,
        y: cy - ((cy - oldOffset.y) / oldScale) * newScale,
      };

      setScale(newScale);
      setOffset(newOffset);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []); // only attaches once; reads live values via refs

  // Relayout whenever nodes structure or collapsed changes
  const relayout = useCallback((newNodes: WBNode[], newCollapsed: Set<string>) => {
    setNodes(layoutNodes(newNodes, newCollapsed));
  }, []);

  const visibleIds = useMemo(() => getVisibleNodeIds(nodes, collapsed), [nodes, collapsed]);
  const visibleNodes = useMemo(() => nodes.filter(n => visibleIds.has(n.id)), [nodes, visibleIds]);

  /* ── Canvas bounds for SVG ── */
  const { minX, minY, maxX, maxY } = useMemo(() => {
    if (!visibleNodes.length) return { minX: -500, minY: -100, maxX: 500, maxY: 400 };
    const xs = visibleNodes.map((n) => n.x);
    const ys = visibleNodes.map((n) => n.y);
    return {
      minX: Math.min(...xs) - 300,
      minY: Math.min(...ys) - 120,
      maxX: Math.max(...xs) + 400,
      maxY: Math.max(...ys) + 280,
    };
  }, [visibleNodes]);

  const svgW = maxX - minX;
  const svgH = maxY - minY;


  /* ── Pan: mouse ── */
  const handleBgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-node]")) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      offsetAtStart.current = { ...offset };
    },
    [offset]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setOffset({
      x: offsetAtStart.current.x + dx,
      y: offsetAtStart.current.y + dy,
    });
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  /* ── Pan: touch ── */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest("[data-node]")) return;
      const t = e.touches[0];
      isPanning.current = true;
      panStart.current = { x: t.clientX, y: t.clientY };
      offsetAtStart.current = { ...offset };
    },
    [offset]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPanning.current) return;
    const t = e.touches[0];
    setOffset({
      x: offsetAtStart.current.x + (t.clientX - panStart.current.x),
      y: offsetAtStart.current.y + (t.clientY - panStart.current.y),
    });
  }, []);

  const handleTouchEnd = useCallback(() => { isPanning.current = false; }, []);

  /* ── Toggle collapse ── */
  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // When collapsed changes, relayout
  useEffect(() => {
    setNodes(prev => layoutNodes(prev, collapsed));
  }, [collapsed]);

  /* ── Edit label ── */
  const startEdit = useCallback((node: WBNode) => {
    setEditingId(node.id);
    setEditValue(node.label);
    setEmojiPickerId(null);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === editingId ? { ...n, label: editValue.trim() || n.label } : n
      )
    );
    setEditingId(null);
  }, [editingId, editValue]);

  /* ── Add child ── */
  const addChild = useCallback((parentNode: WBNode) => {
    const childType = parentNode.type === "brand" ? "project" : "subproject";
    const defaultLabel = childType === "project" ? "מחלקה חדשה" : "פרויקט חדש";
    const newId = uuidv4();
    const newNode: WBNode = {
      id: newId,
      type: childType,
      label: defaultLabel,
      emoji: "✨",
      color: parentNode.color,
      parentId: parentNode.id,
      x: 0,
      y: 0,
    };
    // Expand the parent if it was collapsed
    setCollapsed(prev => {
      const next = new Set(prev);
      next.delete(parentNode.id);
      return next;
    });
    setNodes((prev) => {
      const updated = [...prev, newNode];
      return layoutNodes(updated, collapsed);
    });
    setEditingId(newId);
    setEditValue(defaultLabel);
  }, [collapsed]);

  /* ── Delete node ── */
  const deleteNode = useCallback((node: WBNode) => {
    if (node.type === "brand" && !confirm("למחוק את המותג וכל המחלקות שלו?")) return;
    setNodes((prev) => {
      const toRemove = new Set<string>();
      const queue = [node.id];
      while (queue.length) {
        const id = queue.shift()!;
        toRemove.add(id);
        prev.filter((n) => n.parentId === id).forEach((n) => queue.push(n.id));
      }
      const filtered = prev.filter((n) => !toRemove.has(n.id));
      return layoutNodes(filtered, collapsed);
    });
  }, [collapsed]);

  /* ── Change emoji ── */
  const setEmoji = useCallback((nodeId: string, emoji: string) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, emoji } : n)));
    setEmojiPickerId(null);
  }, []);

  /* ── Change color (brand only, cascades to children) ── */
  const setBrandColor = useCallback((nodeId: string, color: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, color }
        : n.parentId === nodeId ? { ...n, color }
        : n
      )
    );
  }, []);

  /* ── Add new brand ── */
  const addBrand = useCallback(() => {
    const newId = uuidv4();
    const takenColors = new Set(nodes.filter((n) => n.type === "brand").map((n) => n.color));
    const color = BRAND_COLORS.find((c) => !takenColors.has(c)) ?? BRAND_COLORS[0];
    const newNode: WBNode = {
      id: newId, type: "brand", label: "מותג חדש",
      emoji: "🏢", color, parentId: null, x: 0, y: 0,
    };
    setNodes((prev) => {
      const updated = [...prev, newNode];
      return layoutNodes(updated, collapsed);
    });
    setEditingId(newId);
    setEditValue("מותג חדש");
  }, [nodes, collapsed]);

  /* ── Save ── */
  const handleSave = useCallback(() => {
    const updated = nodesToBrands(nodes, brands);
    onSave(updated);
  }, [nodes, brands, onSave]);

  /* ── SVG connections (only between visible nodes) ── */
  function renderConnections() {
    const lines: React.ReactElement[] = [];
    for (const node of visibleNodes) {
      if (!node.parentId) continue;
      const parent = visibleNodes.find((n) => n.id === node.parentId);
      if (!parent) continue;
      const pw = nodeWidth(parent.type);
      const cw = nodeWidth(node.type);
      const x1 = parent.x + pw / 2;
      const y1 = parent.y + NODE_H;
      const x2 = node.x + cw / 2;
      const y2 = node.y;
      const midY = (y1 + y2) / 2;
      const color = parent.color;
      const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

      lines.push(
        <g key={`${parent.id}-${node.id}`}>
          <defs>
            <marker
              id={`arrow-${parent.id}-${node.id}`}
              markerWidth="6" markerHeight="6"
              refX="5" refY="3" orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 z" fill={color + "88"} />
            </marker>
          </defs>
          <path
            d={pathD} fill="none"
            stroke={color + "55"} strokeWidth="2"
            markerEnd={`url(#arrow-${parent.id}-${node.id})`}
            strokeDasharray={node.type === "subproject" ? "4 3" : undefined}
          />
        </g>
      );
    }
    return lines;
  }

  /* ── Render a single node ── */
  function renderNode(node: WBNode) {
    const w = nodeWidth(node.type);
    const isEditing = editingId === node.id;
    const isHovered = hoveredId === node.id;
    const isCollapsed = collapsed.has(node.id);
    const childCount = nodes.filter((n) => n.parentId === node.id).length;
    const canAddChild = node.type !== "subproject";
    const canCollapse = canAddChild && childCount > 0;
    const showEmojiPicker = emojiPickerId === node.id;

    const bgStyle =
      node.type === "brand"
        ? {
            background: th.nodeBrandBg(node.color),
            border: `2px solid ${th.nodeBrandBorder(node.color)}`,
            boxShadow: isHovered
              ? `0 0 60px ${node.color}30, 0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 ${node.color}22`
              : `0 0 40px ${node.color}18, 0 8px 32px rgba(0,0,0,0.55)`,
          }
        : node.type === "project"
        ? {
            background: th.nodeProjectBg(node.color),
            border: `1.5px solid ${node.color}40`,
            boxShadow: isHovered
              ? `0 0 32px ${node.color}25, 0 6px 24px rgba(0,0,0,0.6)`
              : `0 0 20px ${node.color}12, 0 4px 16px rgba(0,0,0,0.45)`,
          }
        : {
            background: th.nodeSubBg(node.color),
            border: `1px solid ${node.color}30`,
            boxShadow: isHovered
              ? `0 0 20px ${node.color}20, 0 4px 12px rgba(0,0,0,0.5)`
              : `0 2px 10px rgba(0,0,0,0.35)`,
          };

    const radius = node.type === "brand" ? 20 : node.type === "project" ? 16 : 12;
    const emojiSize = node.type === "brand" ? 24 : node.type === "project" ? 20 : 16;
    const emojiBoxSize = node.type === "brand" ? 46 : node.type === "project" ? 38 : 32;
    const labelSize = node.type === "brand" ? 15 : node.type === "project" ? 13 : 12;

    // Financial data for brand nodes
    const fin = node.type === "brand" && node.existingId
      ? brandFinancials(brands.find(b => b.id === node.existingId) ?? { projects: [], name: "", emoji: "", color: "", id: "", description: "", createdAt: "", goals: [] })
      : null;

    const openModal = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.type === "brand" || !node.existingId) return;
      // Find parent brand
      let cur: WBNode | undefined = node;
      let brandId = "";
      while (cur) {
        const parentNode = nodes.find(n => n.id === cur!.parentId);
        if (!parentNode && cur.type === "brand") { brandId = cur.existingId ?? ""; break; }
        if (parentNode?.type === "brand") { brandId = parentNode.existingId ?? ""; break; }
        cur = parentNode;
      }
      if (node.type === "project") {
        setEditTarget({ brandId, projectId: node.existingId });
      } else {
        const projNode = nodes.find(n => n.id === node.parentId);
        setEditTarget({ brandId, projectId: projNode?.existingId ?? "", subId: node.existingId });
      }
      setAddingStage(null);
    };

    return (
      <div
        key={node.id}
        data-node="true"
        onClick={node.type !== "brand" && node.existingId ? openModal : undefined}
        style={{
          position: "absolute",
          left: node.x,
          top: node.y,
          width: w,
          minHeight: NODE_H,
          borderRadius: radius,
          padding: "12px 14px",
          cursor: node.type !== "brand" && node.existingId ? "pointer" : "default",
          userSelect: "none",
          direction: "rtl",
          transition: "box-shadow 0.2s, border-color 0.2s",
          ...bgStyle,
        }}
        onMouseEnter={() => setHoveredId(node.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* Delete button */}
        {isHovered && (
          <button
            data-node="true"
            onClick={(e) => { e.stopPropagation(); deleteNode(node); }}
            style={{
              position: "absolute", top: -10, left: -10,
              width: 24, height: 24, borderRadius: "50%",
              background: th.deleteBtnBg, color: "white",
              fontSize: 15, fontWeight: 700, border: "none",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              lineHeight: 1, zIndex: 10,
              boxShadow: "0 2px 8px rgba(239,68,68,0.5)",
            }}
            title="מחק"
          >×</button>
        )}

        {/* Collapse toggle — appears top-right of node */}
        {canCollapse && (
          <button
            data-node="true"
            onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
            style={{
              position: "absolute", top: -10, right: -10,
              width: 24, height: 24, borderRadius: "50%",
              background: isCollapsed ? node.color : th.collapseIdleBg,
              color: isCollapsed ? "white" : node.color,
              fontSize: 11, fontWeight: 700,
              border: `2px solid ${node.color}66`,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              zIndex: 10, transition: "background 0.15s, color 0.15s",
            }}
            title={isCollapsed ? "הרחב" : "כווץ"}
          >
            {isCollapsed ? "▶" : "▼"}
          </button>
        )}

        {/* Emoji + label row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Emoji button */}
          <button
            data-node="true"
            onClick={(e) => {
              e.stopPropagation();
              setEmojiPickerId(showEmojiPicker ? null : node.id);
              setEditingId(null);
            }}
            style={{
              fontSize: emojiSize,
              background: node.color + "28",
              border: `1.5px solid ${node.color}44`,
              borderRadius: 12,
              width: emojiBoxSize, height: emojiBoxSize,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
              transition: "transform 0.1s, background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = node.color + "44")}
            onMouseLeave={e => (e.currentTarget.style.background = node.color + "28")}
            title="שנה אמוג׳י"
          >
            {node.emoji}
          </button>

          {/* Label */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <input
                data-node="true"
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={commitEdit}
                style={{
                  background: th.inputBg,
                  border: `1.5px solid ${node.color}77`,
                  borderRadius: 8, color: th.inputColor,
                  fontSize: labelSize, fontWeight: 700,
                  padding: "4px 8px", width: "100%",
                  outline: "none", direction: "rtl",
                }}
              />
            ) : (
              <p
                onClick={(e) => { e.stopPropagation(); startEdit(node); }}
                style={{
                  color: th.labelColor,
                  fontWeight: node.type === "brand" ? 900 : 700,
                  fontSize: labelSize,
                  lineHeight: 1.3, cursor: "text",
                  whiteSpace: "nowrap", overflow: "hidden",
                  textOverflow: "ellipsis", margin: 0,
                }}
                title="לחץ פעמיים לעריכת שם"
              >
                {node.label}
              </p>
            )}

            {/* Subtext */}
            {!isEditing && (
              <p style={{ color: node.color + "99", fontSize: 10, margin: "3px 0 0 0" }}>
                {node.type === "brand"
                  ? isCollapsed
                    ? `${childCount} מחלקות — לחץ ▶ להרחבה`
                    : `${childCount} מחלקות`
                  : node.type === "project"
                  ? isCollapsed
                    ? `${childCount} פרויקטים — לחץ ▶ להרחבה`
                    : `${childCount} פרויקטים`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {/* Financial data row (brand only) */}
        {fin && (fin.income > 0 || fin.expenses > 0) && (
          <div
            data-node="true"
            style={{
              display: "flex", gap: 8, marginTop: 8,
              paddingTop: 7, borderTop: `1px solid ${node.color}22`,
              flexWrap: "wrap",
            }}
          >
            {fin.income > 0 && (
              <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>
                💰 ₪{fin.income.toLocaleString("he-IL")}
              </span>
            )}
            {fin.expenses > 0 && (
              <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600 }}>
                ↓ ₪{fin.expenses.toLocaleString("he-IL")}
              </span>
            )}
          </div>
        )}

        {/* Color picker (brand only, on hover) */}
        {node.type === "brand" && isHovered && (
          <div
            data-node="true"
            style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}
          >
            {BRAND_COLORS.map((c) => (
              <button
                key={c}
                data-node="true"
                onClick={(e) => { e.stopPropagation(); setBrandColor(node.id, c); }}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: c,
                  border: node.color === c ? "2.5px solid white" : `1.5px solid ${th.btnBorder}`,
                  cursor: "pointer", padding: 0,
                  boxShadow: node.color === c ? `0 0 8px ${c}` : "none",
                  transition: "transform 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              />
            ))}
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div
            data-node="true"
            style={{
              position: "absolute", top: "100%", right: 0, marginTop: 6,
              background: th.emojiPickerBg,
              border: `1px solid ${th.emojiPickerBorder}`,
              borderRadius: 14, padding: 10,
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
              gap: 4, zIndex: 50,
              boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {EMOJI_PALETTE.map((em) => (
              <button
                key={em}
                data-node="true"
                onClick={() => setEmoji(node.id, em)}
                style={{
                  fontSize: 20, background: "transparent",
                  border: "none", cursor: "pointer",
                  borderRadius: 8, padding: "3px 5px",
                  lineHeight: 1.4, transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = th.emojiPickerHover)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {em}
              </button>
            ))}
          </div>
        )}

        {/* Add child button */}
        {canAddChild && isHovered && !isEditing && (
          <button
            data-node="true"
            onClick={(e) => { e.stopPropagation(); addChild(node); }}
            style={{
              position: "absolute",
              bottom: -(NODE_H / 2 - 6),
              left: "50%",
              transform: "translateX(-50%)",
              width: 32, height: 32, borderRadius: "50%",
              border: `2px dashed ${node.color}77`,
              background: th.addChildBg,
              color: node.color, fontSize: 20, fontWeight: 700,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              zIndex: 20, lineHeight: 1,
              boxShadow: `0 0 16px ${node.color}30`,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = node.color + "22";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = th.addChildBg;
            }}
            title={node.type === "brand" ? "הוסף מחלקה" : "הוסף פרויקט"}
          >+</button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: th.canvasBg, overflow: "hidden",
        direction: "rtl", fontFamily: "'Heebo', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.93) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
      {/* ── Toolbar ── */}
      <div
        style={{
          position: "absolute", top: 0, width: "100%", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px",
          background: th.toolbarBg,
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${th.toolbarBorder}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              background: th.btnBg, border: `1px solid ${th.btnBorder}`,
              color: th.btnText, borderRadius: 10,
              padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            × סגור
          </button>

          {/* Theme picker button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowThemePicker(v => !v)}
              style={{
                background: th.btnBg, border: `1px solid ${th.btnBorder}`,
                color: th.btnText, borderRadius: 10,
                padding: "7px 11px", fontSize: 15, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
              title="שנה רקע"
            >
              🎨
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: th.preview.startsWith("linear") || th.preview.startsWith("radial") ? th.preview : th.canvasBg, display: "inline-block", border: `1.5px solid ${th.btnBorder}`, flexShrink: 0 }} />
            </button>

            {/* Theme picker popup */}
            {showThemePicker && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: th.toolbarBg, border: `1px solid ${th.toolbarBorder}`,
                  borderRadius: 16, padding: 14, zIndex: 100,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                  backdropFilter: "blur(12px)",
                  width: 240,
                }}
              >
                <p style={{ color: th.subtitleColor, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 10 }}>
                  בחר רקע לבד
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {WB_THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTheme(t.id)}
                      title={t.label}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        background: "transparent", border: "none", cursor: "pointer", padding: "4px 2px",
                        borderRadius: 8,
                        outline: t.id === themeId ? `2px solid #f97316` : "none",
                        outlineOffset: 2,
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: t.preview.startsWith("linear") || t.preview.startsWith("radial") ? t.preview : t.canvasBg,
                        border: `1.5px solid ${t.id === themeId ? "#f97316" : "rgba(128,128,128,0.3)"}`,
                        flexShrink: 0,
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        {t.canvasBgImg && (
                          <div style={{
                            position: "absolute", inset: 0,
                            backgroundImage: t.canvasBgImg,
                            backgroundSize: t.canvasBgSize ?? "24px 24px",
                          }} />
                        )}
                        {t.id === themeId && (
                          <div style={{
                            position: "absolute", inset: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14,
                          }}>✓</div>
                        )}
                      </div>
                      <span style={{ color: th.btnText, fontSize: 9, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ color: th.titleColor, fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>
            🗺️ מפת המותגים
          </span>
          <span style={{ color: th.subtitleColor, fontSize: 11 }}>
            לחץ ▶/▼ לכיווץ/הרחבה · גרור לניווט · scroll לזום
          </span>
        </div>

        <button
          onClick={handleSave}
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            border: "none", color: "white", borderRadius: 10,
            padding: "8px 20px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 18px rgba(249,115,22,0.4)",
          }}
        >
          שמור מבנה ✓
        </button>
      </div>

      {/* ── Pan canvas ── */}
      <div
        ref={canvasRef}
        style={{
          position: "absolute", inset: 0,
          cursor: isPanning.current ? "grabbing" : "grab",
          backgroundImage: th.canvasBgImg ?? `radial-gradient(circle, ${th.dotColor} 1px, transparent 1px)`,
          backgroundSize: th.canvasBgSize ?? "32px 32px",
        }}
        onMouseDown={handleBgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { setEmojiPickerId(null); setShowThemePicker(false); }}
      >
        {/* Transform wrapper: pan + zoom */}
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            position: "absolute", top: 0, left: 0,
          }}
        >
          {/* SVG connections */}
          <svg
            style={{
              position: "absolute",
              left: minX, top: minY,
              pointerEvents: "none", overflow: "visible",
            }}
            width={svgW} height={svgH}
            viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
          >
            {renderConnections()}
          </svg>

          {/* Nodes */}
          {visibleNodes.map((node) => renderNode(node))}
        </div>
      </div>

      {/* ── Ambient glows ── */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: 400, height: 400,
        background: "radial-gradient(circle at top right, rgba(99,102,241,0.06), transparent 70%)",
        pointerEvents: "none", zIndex: 1,
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, width: 350, height: 350,
        background: "radial-gradient(circle at bottom left, rgba(249,115,22,0.05), transparent 70%)",
        pointerEvents: "none", zIndex: 1,
      }} />

      {/* ── Zoom controls ── */}
      <div style={{
        position: "fixed", bottom: 28, right: 20, zIndex: 20,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <button
          onClick={() => setScale(s => Math.min(2, s * 1.15))}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: th.zoomBtnBg, border: `1px solid ${th.zoomBtnBorder}`,
            color: th.btnText, fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >+</button>
        <button
          onClick={() => setScale(1)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: th.zoomBtnBg, border: `1px solid ${th.zoomBtnBorder}`,
            color: th.btnText, fontSize: 10, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700,
          }}
        >{Math.round(scale * 100)}%</button>
        <button
          onClick={() => setScale(s => Math.max(0.3, s * 0.85))}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: th.zoomBtnBg, border: `1px solid ${th.zoomBtnBorder}`,
            color: th.btnText, fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >−</button>
      </div>

      {/* ── Expand all / Collapse all ── */}
      <div style={{
        position: "fixed", bottom: 28, left: "50%",
        transform: "translateX(-50%)", zIndex: 20,
        display: "flex", gap: 10, alignItems: "center",
      }}>
        <button
          onClick={() => setCollapsed(new Set())}
          style={{
            background: th.btnBg, border: `1px solid ${th.btnBorder}`,
            color: th.btnText, borderRadius: 12,
            padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >הרחב הכל ▼</button>
        <button
          onClick={addBrand}
          style={{
            background: th.btnBg,
            border: `1.5px dashed ${th.btnBorder}`,
            color: th.btnText, borderRadius: 20,
            padding: "9px 22px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#f97316";
            (e.currentTarget as HTMLButtonElement).style.color = "#f97316";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = th.btnBorder;
            (e.currentTarget as HTMLButtonElement).style.color = th.btnText;
          }}
        >+ מותג חדש</button>
        <button
          onClick={() => {
            const projIds = new Set(nodes.filter(n => n.type === "project" || n.type === "brand").map(n => n.id));
            setCollapsed(projIds);
          }}
          style={{
            background: th.btnBg, border: `1px solid ${th.btnBorder}`,
            color: th.btnText, borderRadius: 12,
            padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >כווץ הכל ▶</button>
      </div>

      {/* ── Node task modal ── */}
      {editTarget && (() => {
        const brand   = brands.find(b => b.id === editTarget.brandId);
        const project = brand?.projects.find(p => p.id === editTarget.projectId);
        const sub     = editTarget.subId ? project?.subProjects.find(s => s.id === editTarget.subId) : null;
        if (!brand || !project) return null;

        const accent  = project.color || "#f97316";
        const isDarkTheme = th.id !== "minimal" && th.id !== "cream" && th.id !== "sky" && th.id !== "pink" && th.id !== "mint";
        const modalBg = isDarkTheme ? "#1a1d2e" : "#ffffff";
        const cardBg  = isDarkTheme ? "#22253a" : "#f8f8fb";
        const border  = isDarkTheme ? "#2e3150" : "#e8e8f0";
        const textPrim = isDarkTheme ? "#f0f0f8" : "#1a1a2e";
        const textSec  = isDarkTheme ? "#8890b0" : "#7878a0";

        const inputSt: React.CSSProperties = {
          background: isDarkTheme ? "#2a2d45" : "#f0f0f8",
          border: `1.5px solid ${border}`,
          color: textPrim,
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 13,
          width: "100%",
          outline: "none",
          direction: "rtl",
          fontFamily: "'Heebo', system-ui, sans-serif",
          boxSizing: "border-box",
        };

        /* Patch a stage field */
        const patchStage = (subId: string, stageId: string, changes: Partial<Stage>, channelId?: string) => {
          const updated: Brand = JSON.parse(JSON.stringify(brand));
          const updProj = updated.projects.find(p => p.id === project.id)!;
          const updSub  = updProj.subProjects.find(s => s.id === subId)!;
          if (channelId) {
            const ch = updSub.channels.find(c => c.id === channelId);
            const st = ch?.stages.find(s => s.id === stageId);
            if (st) Object.assign(st, changes);
          } else {
            const st = updSub.stages.find(s => s.id === stageId);
            if (st) Object.assign(st, changes);
          }
          onBrandUpdate?.(updated);
        };

        /* Add a brand-new stage */
        const commitAddStage = (subId: string, channelId?: string) => {
          if (!addingStage || !addingStage.name.trim()) return;
          const updated: Brand = JSON.parse(JSON.stringify(brand));
          const updProj = updated.projects.find(p => p.id === project.id)!;
          const updSub  = updProj.subProjects.find(s => s.id === subId)!;
          const newStage: Stage = {
            id: uuidv4(),
            name: addingStage.name.trim(),
            step: String((updSub.stages.length + 1)),
            goal: "",
            status: addingStage.status,
            notes: addingStage.notes,
            nextAction: addingStage.nextAction,
            order: updSub.stages.length,
          };
          if (channelId) {
            const ch = updSub.channels.find(c => c.id === channelId);
            if (ch) ch.stages.push(newStage);
          } else {
            updSub.stages.push(newStage);
          }
          onBrandUpdate?.(updated);
          setAddingStage(null);
        };

        /* Stage row */
        const renderStageRow = (stage: Stage, targetSubId: string, channelId?: string) => {
          const sm = STATUS_META[stage.status];
          return (
            <div key={stage.id} style={{
              background: cardBg, borderRadius: 12,
              border: `1.5px solid ${border}`,
              padding: "10px 14px",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => {
                    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(stage.status) + 1) % 4];
                    patchStage(targetSubId, stage.id, { status: next }, channelId);
                  }}
                  style={{
                    background: sm.bg, color: sm.text,
                    border: "none", borderRadius: 7,
                    padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                  }}
                >{sm.label}</button>
                <span style={{ color: textPrim, fontSize: 13, fontWeight: 700, flex: 1, textAlign: "right" }}>{stage.name}</span>
              </div>
              <input
                style={{ ...inputSt, fontSize: 12, padding: "6px 10px" }}
                placeholder="תיאור / הערות..."
                value={stage.notes ?? ""}
                onChange={e => patchStage(targetSubId, stage.id, { notes: e.target.value }, channelId)}
              />
            </div>
          );
        };

        /* "Add stage" inline form */
        const renderAddForm = (subId: string, channelId?: string) => (
          addingStage ? (
            <div style={{
              background: cardBg, borderRadius: 14,
              border: `2px solid ${accent}55`,
              padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 10,
              marginTop: 4,
            }}>
              <input
                autoFocus
                style={inputSt}
                placeholder="שם המשימה..."
                value={addingStage.name}
                onChange={e => setAddingStage({ ...addingStage, name: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter") commitAddStage(subId, channelId); if (e.key === "Escape") setAddingStage(null); }}
              />
              <textarea
                style={{ ...inputSt, resize: "none", minHeight: 56, lineHeight: 1.5 } as React.CSSProperties}
                placeholder="תיאור / הערות (אופציונלי)..."
                value={addingStage.notes}
                onChange={e => setAddingStage({ ...addingStage, notes: e.target.value })}
              />
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: textSec, fontSize: 12, marginRight: 2 }}>סטטוס:</span>
                {STATUS_CYCLE.map(s => {
                  const sm = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setAddingStage({ ...addingStage, status: s })}
                      style={{
                        background: addingStage.status === s ? sm.bg : "transparent",
                        color: addingStage.status === s ? sm.text : textSec,
                        border: `1.5px solid ${addingStage.status === s ? sm.text + "66" : border}`,
                        borderRadius: 7, padding: "3px 9px",
                        fontSize: 11, fontWeight: 700, cursor: "pointer",
                      }}
                    >{sm.label}</button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}>
                <button
                  onClick={() => commitAddStage(subId, channelId)}
                  style={{
                    background: accent, color: "white",
                    border: "none", borderRadius: 10,
                    padding: "8px 20px", fontSize: 13, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >הוסף</button>
                <button
                  onClick={() => setAddingStage(null)}
                  style={{
                    background: "transparent", color: textSec,
                    border: `1px solid ${border}`, borderRadius: 10,
                    padding: "8px 16px", fontSize: 13, cursor: "pointer",
                  }}
                >ביטול</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingStage({ name: "", notes: "", status: "todo", nextAction: "" })}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: "transparent",
                border: `2px dashed ${accent}55`,
                color: accent, borderRadius: 12,
                padding: "10px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", width: "100%", marginTop: 4,
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = accent + "11"; (e.currentTarget as HTMLButtonElement).style.borderColor = accent + "99"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor = accent + "55"; }}
            >+ הוסף משימה</button>
          )
        );

        return (
          /* Backdrop */
          <div
            onClick={() => { setEditTarget(null); setAddingStage(null); }}
            style={{
              position: "fixed", inset: 0, zIndex: 80,
              background: "rgba(0,0,0,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(3px)",
            }}
          >
            {/* Modal card */}
            <div
              data-node="true"
              onClick={e => e.stopPropagation()}
              style={{
                background: modalBg,
                borderRadius: 20,
                width: 500,
                maxWidth: "94vw",
                maxHeight: "82vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 32px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
                border: `1px solid ${border}`,
                fontFamily: "'Heebo', system-ui, sans-serif",
                direction: "rtl",
                overflow: "hidden",
                animation: "modalPop 0.18s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              {/* Header */}
              <div style={{
                padding: "18px 20px 14px",
                borderBottom: `1px solid ${border}`,
                display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
              }}>
                {sub && (
                  <button
                    onClick={() => { setEditTarget({ ...editTarget, subId: undefined }); setAddingStage(null); }}
                    style={{
                      background: cardBg, border: `1px solid ${border}`,
                      color: textSec, borderRadius: 8,
                      padding: "5px 12px", fontSize: 12,
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >← חזור</button>
                )}
                <span style={{ fontSize: 26, flexShrink: 0 }}>{sub ? sub.emoji : project.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: textPrim, fontWeight: 900, fontSize: 16, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sub ? sub.name : project.name}
                  </p>
                  <p style={{ color: textSec, fontSize: 11, margin: "2px 0 0" }}>
                    {sub
                      ? `${sub.stages.length + sub.channels.reduce((n,c) => n + c.stages.length, 0)} משימות`
                      : `${project.subProjects.length} פרויקטים — לחץ להכנסה`
                    }
                  </p>
                </div>
                <button
                  onClick={() => { setEditTarget(null); setAddingStage(null); }}
                  style={{
                    background: "transparent", border: "none",
                    color: textSec, fontSize: 20,
                    cursor: "pointer", lineHeight: 1,
                    width: 32, height: 32, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >×</button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                {sub ? (
                  /* ── Sub level: stage list + add ── */
                  <>
                    {sub.channels.length > 0 ? (
                      sub.channels.map(ch => (
                        <div key={ch.id} style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <span style={{ fontSize: 15 }}>{ch.emoji}</span>
                            <span style={{ color: textSec, fontSize: 12, fontWeight: 700 }}>{ch.name}</span>
                            <span style={{ color: textSec + "88", fontSize: 10 }}>· {ch.stages.length} משימות</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {ch.stages.map(st => renderStageRow(st, sub.id, ch.id))}
                          </div>
                          {renderAddForm(sub.id, ch.id)}
                        </div>
                      ))
                    ) : (
                      <>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {sub.stages.map(st => renderStageRow(st, sub.id))}
                        </div>
                        {renderAddForm(sub.id)}
                      </>
                    )}
                  </>
                ) : (
                  /* ── Project level: sub list ── */
                  project.subProjects.map(s => {
                    const totalSt = s.stages.length + s.channels.reduce((n,c) => n + c.stages.length, 0);
                    const doneN   = s.stages.filter(st => st.status === "done").length + s.channels.reduce((n,c) => n + c.stages.filter(st => st.status === "done").length, 0);
                    const activeN = s.stages.filter(st => st.status === "active").length + s.channels.reduce((n,c) => n + c.stages.filter(st => st.status === "active").length, 0);
                    const blockedN = s.stages.filter(st => st.status === "blocked").length + s.channels.reduce((n,c) => n + c.stages.filter(st => st.status === "blocked").length, 0);
                    const pct = totalSt > 0 ? Math.round((doneN / totalSt) * 100) : 0;
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setEditTarget({ ...editTarget, subId: s.id }); setAddingStage(null); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          background: cardBg, borderRadius: 14,
                          border: `1.5px solid ${border}`,
                          padding: "12px 16px",
                          cursor: "pointer", textAlign: "right", width: "100%",
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = accent + "77"; (e.currentTarget as HTMLButtonElement).style.background = isDarkTheme ? "#2a2d45" : "#f0f0fa"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = border; (e.currentTarget as HTMLButtonElement).style.background = cardBg; }}
                      >
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{s.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                          <p style={{ color: textPrim, fontWeight: 800, fontSize: 13, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                            <div style={{ flex: 1, height: 4, background: isDarkTheme ? "#2e3150" : "#e0e0f0", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 4, transition: "width 0.3s" }} />
                            </div>
                            <span style={{ color: textSec, fontSize: 10, flexShrink: 0 }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          {doneN > 0    && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "#14532d33", color: "#4ade80" }}>✓{doneN}</span>}
                          {activeN > 0  && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "#1e3a5f33", color: "#60a5fa" }}>●{activeN}</span>}
                          {blockedN > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "#4c051933", color: "#f87171" }}>⚠{blockedN}</span>}
                          {totalSt === 0 && <span style={{ fontSize: 10, color: textSec }}>אין משימות</span>}
                        </div>
                        <span style={{ color: accent + "88", fontSize: 16, flexShrink: 0 }}>←</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
