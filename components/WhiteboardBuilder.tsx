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
const BRAND_W = 220;
const PROJECT_W = 180;
const SUB_W = 150;
const NODE_H = 70;
const BRAND_Y = 80;
const PROJECT_DY = 160;
const SUB_DY = 160;
const BRAND_GAP = 280;
const PROJECT_GAP = 220;
const SUB_GAP = 180;

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
function layoutNodes(nodes: WBNode[]): WBNode[] {
  const brands = nodes.filter((n) => n.type === "brand");
  const projects = nodes.filter((n) => n.type === "project");
  const subs = nodes.filter((n) => n.type === "subproject");

  const out: WBNode[] = [];

  // Position brands evenly
  const totalBrandW = brands.length * BRAND_W + (brands.length - 1) * (BRAND_GAP - BRAND_W);
  let bx = -(totalBrandW / 2) + BRAND_W / 2;

  for (const brand of brands) {
    // Children
    const brandProjects = projects.filter((p) => p.parentId === brand.id);
    const totalProjectW =
      brandProjects.length * PROJECT_W +
      (brandProjects.length - 1) * (PROJECT_GAP - PROJECT_W);
    let px = bx - totalProjectW / 2 + PROJECT_W / 2;

    for (const project of brandProjects) {
      const projectSubs = subs.filter((s) => s.parentId === project.id);
      const totalSubW =
        projectSubs.length * SUB_W + (projectSubs.length - 1) * (SUB_GAP - SUB_W);
      let sx = px - totalSubW / 2 + SUB_W / 2;

      for (const sub of projectSubs) {
        out.push({ ...sub, x: sx, y: BRAND_Y + PROJECT_DY + SUB_DY });
        sx += SUB_GAP;
      }

      out.push({ ...project, x: px, y: BRAND_Y + PROJECT_DY });
      px += PROJECT_GAP;
    }

    out.push({ ...brand, x: bx, y: BRAND_Y });
    bx += BRAND_GAP;
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
  return layoutNodes(nodes);
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
  const [nodes, setNodes] = useState<WBNode[]>(() => brandsToNodes(brands));
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [emojiPickerId, setEmojiPickerId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const offsetAtStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Centre the canvas initially
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOffset({ x: window.innerWidth / 2, y: 60 });
    }
  }, []);

  /* ── Computed canvas bounds for SVG size ── */
  const { minX, minY, maxX, maxY } = useMemo(() => {
    if (!nodes.length) return { minX: -500, minY: -100, maxX: 500, maxY: 400 };
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    return {
      minX: Math.min(...xs) - 200,
      minY: Math.min(...ys) - 80,
      maxX: Math.max(...xs) + 300,
      maxY: Math.max(...ys) + 200,
    };
  }, [nodes]);

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

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

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
    const dx = t.clientX - panStart.current.x;
    const dy = t.clientY - panStart.current.y;
    setOffset({
      x: offsetAtStart.current.x + dx,
      y: offsetAtStart.current.y + dy,
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false;
  }, []);

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
    const childType =
      parentNode.type === "brand" ? "project" : "subproject";
    const defaultLabel =
      childType === "project" ? "מחלקה חדשה" : "פרויקט חדש";
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
    setNodes((prev) => layoutNodes([...prev, newNode]));
    setEditingId(newId);
    setEditValue(defaultLabel);
  }, []);

  /* ── Delete node ── */
  const deleteNode = useCallback((node: WBNode) => {
    if (
      node.type === "brand" &&
      !confirm("למחוק את המותג וכל המחלקות שלו?")
    )
      return;

    setNodes((prev) => {
      const toRemove = new Set<string>();
      const queue = [node.id];
      while (queue.length) {
        const id = queue.shift()!;
        toRemove.add(id);
        prev.filter((n) => n.parentId === id).forEach((n) => queue.push(n.id));
      }
      return layoutNodes(prev.filter((n) => !toRemove.has(n.id)));
    });
  }, []);

  /* ── Change emoji ── */
  const setEmoji = useCallback((nodeId: string, emoji: string) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, emoji } : n)));
    setEmojiPickerId(null);
  }, []);

  /* ── Change color (brand only) ── */
  const setBrandColor = useCallback((nodeId: string, color: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, color }
          : n.parentId === nodeId
          ? { ...n, color }
          : n
      )
    );
  }, []);

  /* ── Add new brand ── */
  const addBrand = useCallback(() => {
    const newId = uuidv4();
    const takenColors = new Set(
      nodes.filter((n) => n.type === "brand").map((n) => n.color)
    );
    const color =
      BRAND_COLORS.find((c) => !takenColors.has(c)) ?? BRAND_COLORS[0];
    const newNode: WBNode = {
      id: newId,
      type: "brand",
      label: "מותג חדש",
      emoji: "🏢",
      color,
      parentId: null,
      x: 0,
      y: 0,
    };
    setNodes((prev) => layoutNodes([...prev, newNode]));
    setEditingId(newId);
    setEditValue("מותג חדש");
  }, [nodes]);

  /* ── Save ── */
  const handleSave = useCallback(() => {
    const updated = nodesToBrands(nodes, brands);
    onSave(updated);
  }, [nodes, brands, onSave]);

  /* ── SVG connections ── */
  function renderConnections() {
    const lines: React.ReactElement[] = [];
    for (const node of nodes) {
      if (!node.parentId) continue;
      const parent = nodes.find((n) => n.id === node.parentId);
      if (!parent) continue;
      const pw = nodeWidth(parent.type);
      const cw = nodeWidth(node.type);
      const x1 = parent.x;
      const y1 = parent.y + NODE_H;
      const x2 = node.x;
      const y2 = node.y;
      const midY = (y1 + y2) / 2;
      const color = parent.color;

      const pathD = `M ${x1 + pw / 2} ${y1} C ${x1 + pw / 2} ${midY}, ${
        x2 + cw / 2
      } ${midY}, ${x2 + cw / 2} ${y2}`;

      lines.push(
        <g key={`${parent.id}-${node.id}`}>
          <defs>
            <marker
              id={`arrow-${parent.id}-${node.id}`}
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 z" fill={color + "99"} />
            </marker>
          </defs>
          <path
            d={pathD}
            fill="none"
            stroke={color + "66"}
            strokeWidth="1.5"
            markerEnd={`url(#arrow-${parent.id}-${node.id})`}
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
    const childCount = nodes.filter((n) => n.parentId === node.id).length;
    const canAddChild = node.type !== "subproject";
    const showEmojiPicker = emojiPickerId === node.id;

    const bgStyle =
      node.type === "brand"
        ? {
            background: `linear-gradient(135deg, ${node.color}33 0%, #1a1d2a 100%)`,
            border: `1.5px solid ${node.color}66`,
            boxShadow: `0 0 40px ${node.color}22, 0 8px 32px rgba(0,0,0,0.6)`,
          }
        : node.type === "project"
        ? {
            background: `linear-gradient(135deg, ${node.color}22 0%, #151821 100%)`,
            border: `1.5px solid ${node.color}44`,
            boxShadow: `0 0 24px ${node.color}18, 0 4px 20px rgba(0,0,0,0.5)`,
          }
        : {
            background: `linear-gradient(135deg, ${node.color}18 0%, #131620 100%)`,
            border: `1px solid ${node.color}33`,
            boxShadow: `0 2px 12px rgba(0,0,0,0.4)`,
          };

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
          borderRadius: node.type === "brand" ? 18 : node.type === "project" ? 14 : 12,
          padding: "10px 12px",
          cursor: "default",
          userSelect: "none",
          direction: "rtl",
          ...bgStyle,
          transition: "box-shadow 0.15s",
        }}
        onMouseEnter={() => setHoveredId(node.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* Delete button */}
        {isHovered && (
          <button
            data-node="true"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node);
            }}
            style={{
              position: "absolute",
              top: -8,
              left: -8,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#ef4444",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              zIndex: 10,
            }}
            title="מחק"
          >
            ×
          </button>
        )}

        {/* Emoji + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Emoji */}
          <button
            data-node="true"
            onClick={(e) => {
              e.stopPropagation();
              setEmojiPickerId(showEmojiPicker ? null : node.id);
              setEditingId(null);
            }}
            style={{
              fontSize: node.type === "brand" ? 22 : node.type === "project" ? 18 : 16,
              background: node.color + "33",
              border: `1.5px solid ${node.color}55`,
              borderRadius: 10,
              width: node.type === "brand" ? 42 : node.type === "project" ? 36 : 30,
              height: node.type === "brand" ? 42 : node.type === "project" ? 36 : 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "transform 0.1s",
            }}
            title="שנה אמוג'י"
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
                  if (e.key === "Escape") { setEditingId(null); }
                }}
                onBlur={commitEdit}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: `1.5px solid ${node.color}88`,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: node.type === "brand" ? 14 : 12,
                  fontWeight: 700,
                  padding: "4px 8px",
                  width: "100%",
                  outline: "none",
                  direction: "rtl",
                }}
              />
            ) : (
              <p
                onClick={() => startEdit(node)}
                style={{
                  color: "#f1f5f9",
                  fontWeight: node.type === "brand" ? 900 : 700,
                  fontSize: node.type === "brand" ? 14 : node.type === "project" ? 13 : 12,
                  lineHeight: 1.3,
                  cursor: "text",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  margin: 0,
                }}
                title="לחץ לעריכה"
              >
                {node.label}
              </p>
            )}

            {/* Subtext */}
            {!isEditing && (
              <p
                style={{
                  color: node.color + "aa",
                  fontSize: 10,
                  margin: "2px 0 0 0",
                }}
              >
                {node.type === "brand"
                  ? `${childCount} מחלקות`
                  : node.type === "project"
                  ? `${childCount} פרויקטים`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {/* Color picker (brand only) */}
        {node.type === "brand" && isHovered && (
          <div
            data-node="true"
            style={{
              display: "flex",
              gap: 4,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            {BRAND_COLORS.map((c) => (
              <button
                key={c}
                data-node="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setBrandColor(node.id, c);
                }}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: c,
                  border:
                    node.color === c
                      ? "2px solid white"
                      : "1.5px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div
            data-node="true"
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 4,
              background: "#1e2130",
              border: "1px solid #2a2d3e",
              borderRadius: 12,
              padding: 10,
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 4,
              zIndex: 50,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {EMOJI_PALETTE.map((em) => (
              <button
                key={em}
                data-node="true"
                onClick={() => setEmoji(node.id, em)}
                style={{
                  fontSize: 18,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 6,
                  padding: "2px 4px",
                  lineHeight: 1.4,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.1)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "transparent")
                }
              >
                {em}
              </button>
            ))}
          </div>
        )}

        {/* Add child button */}
        {canAddChild && isHovered && (
          <button
            data-node="true"
            onClick={(e) => {
              e.stopPropagation();
              addChild(node);
            }}
            style={{
              position: "absolute",
              bottom: -(NODE_H / 2 - 4),
              left: "50%",
              transform: "translateX(-50%)",
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: `2px dashed ${node.color}88`,
              background: "rgba(20,22,32,0.85)",
              color: node.color,
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
              lineHeight: 1,
              transition: "background 0.1s",
            }}
            title={node.type === "brand" ? "הוסף מחלקה" : "הוסף פרויקט"}
          >
            +
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "#0f1117",
        overflow: "hidden",
        direction: "rtl",
        fontFamily: "'Heebo', system-ui, sans-serif",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          width: "100%",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "rgba(15,17,23,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1e2130",
        }}
      >
        {/* Right side: close */}
        <button
          onClick={onClose}
          style={{
            background: "#1a1d28",
            border: "1px solid #2a2d3e",
            color: "#9ca3af",
            borderRadius: 10,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          × סגור
        </button>

        {/* Centre: title */}
        <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em" }}>
          🗺️ בנה מפה
        </div>

        {/* Left side: save */}
        <button
          onClick={handleSave}
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            border: "none",
            color: "white",
            borderRadius: 10,
            padding: "7px 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(249,115,22,0.35)",
          }}
        >
          שמור מבנה ✓
        </button>
      </div>

      {/* ── Pan canvas ── */}
      <div
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          cursor: isPanning.current ? "grabbing" : "grab",
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.028) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        onMouseDown={handleBgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          setEmojiPickerId(null);
        }}
      >
        {/* Inner transform wrapper — both SVG and nodes share this */}
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* SVG connections layer (behind nodes) */}
          <svg
            style={{
              position: "absolute",
              left: minX,
              top: minY,
              pointerEvents: "none",
              overflow: "visible",
            }}
            width={svgW}
            height={svgH}
            viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
          >
            {renderConnections()}
          </svg>

          {/* Node layer */}
          {nodes.map((node) => renderNode(node))}
        </div>
      </div>

      {/* ── Ambient glow corners ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 300,
          height: 300,
          background:
            "radial-gradient(circle at top right, rgba(99,102,241,0.07), transparent 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: 260,
          height: 260,
          background:
            "radial-gradient(circle at bottom left, rgba(249,115,22,0.05), transparent 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ── Floating + New Brand button ── */}
      <button
        onClick={addBrand}
        style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "linear-gradient(135deg, #1e2130, #252838)",
          border: "1.5px dashed #3b4256",
          color: "#9ca3af",
          borderRadius: 20,
          padding: "10px 22px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#f97316";
          (e.currentTarget as HTMLButtonElement).style.color = "#f97316";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b4256";
          (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
        }}
      >
        + מותג חדש
      </button>

      {/* ── Help hint ── */}
      <div
        style={{
          position: "fixed",
          bottom: 28,
          right: 16,
          zIndex: 20,
          color: "#4b5563",
          fontSize: 11,
          textAlign: "right",
          lineHeight: 1.8,
          pointerEvents: "none",
        }}
      >
        <div>גרור רקע לניווט</div>
        <div>לחץ על שם לעריכה</div>
        <div>הורר על צומת לאפשרויות</div>
      </div>
    </div>
  );
}
