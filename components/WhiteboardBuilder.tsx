"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { Brand, Project, SubProject } from "@/lib/types";

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
const BRAND_GAP = 520;
const PROJECT_GAP = 380;
const SUB_GAP = 300;

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
function layoutNodes(nodes: WBNode[], collapsed: Set<string>): WBNode[] {
  const brands = nodes.filter((n) => n.type === "brand");
  const projects = nodes.filter((n) => n.type === "project");
  const subs = nodes.filter((n) => n.type === "subproject");

  const out: WBNode[] = [];

  // Calculate total width for centering
  let totalBrandW = 0;
  for (const brand of brands) {
    const brandProjects = projects.filter((p) => p.parentId === brand.id);
    if (collapsed.has(brand.id) || brandProjects.length === 0) {
      totalBrandW += BRAND_W;
    } else {
      const projWidth = brandProjects.length * PROJECT_W + (brandProjects.length - 1) * (PROJECT_GAP - PROJECT_W);
      totalBrandW += Math.max(BRAND_W, projWidth);
    }
  }
  totalBrandW += (brands.length - 1) * (BRAND_GAP - BRAND_W);

  let bx = -(totalBrandW / 2) + BRAND_W / 2;

  for (const brand of brands) {
    const brandProjects = projects.filter((p) => p.parentId === brand.id);
    const brandCollapsed = collapsed.has(brand.id);

    if (!brandCollapsed && brandProjects.length > 0) {
      // Calculate total width needed for this brand's children
      let totalProjW = 0;
      for (const project of brandProjects) {
        const projectSubs = subs.filter((s) => s.parentId === project.id);
        const projCollapsed = collapsed.has(project.id);
        if (projCollapsed || projectSubs.length === 0) {
          totalProjW += PROJECT_W;
        } else {
          const subWidth = projectSubs.length * SUB_W + (projectSubs.length - 1) * (SUB_GAP - SUB_W);
          totalProjW += Math.max(PROJECT_W, subWidth);
        }
      }
      totalProjW += (brandProjects.length - 1) * (PROJECT_GAP - PROJECT_W);

      const brandCenterX = bx;
      let px = brandCenterX - totalProjW / 2 + PROJECT_W / 2;

      for (const project of brandProjects) {
        const projectSubs = subs.filter((s) => s.parentId === project.id);
        const projCollapsed = collapsed.has(project.id);

        if (!projCollapsed && projectSubs.length > 0) {
          const totalSubW = projectSubs.length * SUB_W + (projectSubs.length - 1) * (SUB_GAP - SUB_W);
          let sx = px - totalSubW / 2 + SUB_W / 2;
          for (const sub of projectSubs) {
            out.push({ ...sub, x: sx, y: BRAND_Y + PROJECT_DY + SUB_DY });
            sx += SUB_GAP;
          }
        }
        out.push({ ...project, x: px, y: BRAND_Y + PROJECT_DY });

        // Advance px by either sub-span or PROJECT_GAP
        const projectSubs2 = subs.filter((s) => s.parentId === project.id);
        const projCollapsed2 = collapsed.has(project.id);
        if (!projCollapsed2 && projectSubs2.length > 0) {
          const subSpan = projectSubs2.length * SUB_W + (projectSubs2.length - 1) * (SUB_GAP - SUB_W);
          px += Math.max(PROJECT_GAP, subSpan + 40);
        } else {
          px += PROJECT_GAP;
        }
      }

      out.push({ ...brand, x: brandCenterX, y: BRAND_Y });
      const projSpan = totalProjW;
      bx += Math.max(BRAND_GAP, projSpan + 80);
    } else {
      out.push({ ...brand, x: bx, y: BRAND_Y });
      bx += BRAND_GAP;
    }
  }

  // Any orphan nodes not placed — fallback
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

/* ─── Main component ─────────────────────────────────────── */
export default function WhiteboardBuilder({
  brands,
  onSave,
  onClose,
}: {
  brands: Brand[];
  onSave: (updated: Brand[]) => void;
  onClose: () => void;
}) {
  const rawNodes = useMemo(() => brandsToNodes(brands), []);
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOffset({ x: window.innerWidth / 2, y: 80 });
    }
  }, []);

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

  /* ── Wheel zoom ── */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.min(2, Math.max(0.3, s * delta)));
  }, []);

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
            background: `linear-gradient(135deg, ${node.color}30 0%, #1a1d2a 100%)`,
            border: `2px solid ${node.color}55`,
            boxShadow: isHovered
              ? `0 0 60px ${node.color}30, 0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 ${node.color}22`
              : `0 0 40px ${node.color}18, 0 8px 32px rgba(0,0,0,0.55)`,
          }
        : node.type === "project"
        ? {
            background: `linear-gradient(135deg, ${node.color}20 0%, #151821 100%)`,
            border: `1.5px solid ${node.color}40`,
            boxShadow: isHovered
              ? `0 0 32px ${node.color}25, 0 6px 24px rgba(0,0,0,0.6)`
              : `0 0 20px ${node.color}12, 0 4px 16px rgba(0,0,0,0.45)`,
          }
        : {
            background: `linear-gradient(135deg, ${node.color}15 0%, #131620 100%)`,
            border: `1px solid ${node.color}30`,
            boxShadow: isHovered
              ? `0 0 20px ${node.color}20, 0 4px 12px rgba(0,0,0,0.5)`
              : `0 2px 10px rgba(0,0,0,0.35)`,
          };

    const radius = node.type === "brand" ? 20 : node.type === "project" ? 16 : 12;
    const emojiSize = node.type === "brand" ? 24 : node.type === "project" ? 20 : 16;
    const emojiBoxSize = node.type === "brand" ? 46 : node.type === "project" ? 38 : 32;
    const labelSize = node.type === "brand" ? 15 : node.type === "project" ? 13 : 12;

    return (
      <div
        key={node.id}
        data-node="true"
        style={{
          position: "absolute",
          left: node.x,
          top: node.y,
          width: w,
          minHeight: NODE_H,
          borderRadius: radius,
          padding: "12px 14px",
          cursor: "default",
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
              background: "#ef4444", color: "white",
              fontSize: 15, fontWeight: 700, border: "none",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              lineHeight: 1, zIndex: 10,
              boxShadow: "0 2px 8px rgba(239,68,68,0.5)",
            }}
            title="מחק"
          >×</button>
        )}

        {/* Collapse toggle — appears top-left of node */}
        {canCollapse && (
          <button
            data-node="true"
            onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
            style={{
              position: "absolute", top: -10, right: -10,
              width: 24, height: 24, borderRadius: "50%",
              background: isCollapsed ? node.color : "#1e2130",
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
                  background: "rgba(255,255,255,0.08)",
                  border: `1.5px solid ${node.color}77`,
                  borderRadius: 8, color: "#fff",
                  fontSize: labelSize, fontWeight: 700,
                  padding: "4px 8px", width: "100%",
                  outline: "none", direction: "rtl",
                }}
              />
            ) : (
              <p
                onClick={() => startEdit(node)}
                style={{
                  color: "#f1f5f9",
                  fontWeight: node.type === "brand" ? 900 : 700,
                  fontSize: labelSize,
                  lineHeight: 1.3, cursor: "text",
                  whiteSpace: "nowrap", overflow: "hidden",
                  textOverflow: "ellipsis", margin: 0,
                }}
                title="לחץ לעריכה"
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
                  border: node.color === c ? "2.5px solid white" : "1.5px solid rgba(255,255,255,0.15)",
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
              background: "#1a1d2a",
              border: "1px solid #2a2d3e",
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
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
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
              background: "rgba(15,17,23,0.9)",
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
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(15,17,23,0.9)";
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
        background: "#0d0f18", overflow: "hidden",
        direction: "rtl", fontFamily: "'Heebo', system-ui, sans-serif",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          position: "absolute", top: 0, width: "100%", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px",
          background: "rgba(13,15,24,0.94)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #1a1d2c",
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "#181b28", border: "1px solid #252838",
            color: "#9ca3af", borderRadius: 10,
            padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          × סגור
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>
            🗺️ מפת המותגים
          </span>
          <span style={{ color: "#4b5563", fontSize: 11 }}>
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
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        onWheel={handleWheel}
        onMouseDown={handleBgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setEmojiPickerId(null)}
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
            background: "#181b28", border: "1px solid #252838",
            color: "#9ca3af", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >+</button>
        <button
          onClick={() => setScale(1)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#181b28", border: "1px solid #252838",
            color: "#6b7280", fontSize: 10, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700,
          }}
        >{Math.round(scale * 100)}%</button>
        <button
          onClick={() => setScale(s => Math.max(0.3, s * 0.85))}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#181b28", border: "1px solid #252838",
            color: "#9ca3af", fontSize: 18, cursor: "pointer",
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
            background: "#181b28", border: "1px solid #252838",
            color: "#9ca3af", borderRadius: 12,
            padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >הרחב הכל ▼</button>
        <button
          onClick={addBrand}
          style={{
            background: "linear-gradient(135deg, #1e2130, #252838)",
            border: "1.5px dashed #3b4256",
            color: "#9ca3af", borderRadius: 20,
            padding: "9px 22px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#f97316";
            (e.currentTarget as HTMLButtonElement).style.color = "#f97316";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b4256";
            (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
          }}
        >+ מותג חדש</button>
        <button
          onClick={() => {
            const projIds = new Set(nodes.filter(n => n.type === "project" || n.type === "brand").map(n => n.id));
            setCollapsed(projIds);
          }}
          style={{
            background: "#181b28", border: "1px solid #252838",
            color: "#9ca3af", borderRadius: 12,
            padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >כווץ הכל ▶</button>
      </div>
    </div>
  );
}
