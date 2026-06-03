"use client";

import { useState, useRef, useCallback, CSSProperties, ChangeEvent, ReactNode } from "react";
import { Brand } from "@/lib/types";

interface Props {
  brands: Brand[];
  onClose: () => void;
}

type AspectRatio = "portrait" | "square";

const CANVAS_DIMS: Record<AspectRatio, { w: number; h: number }> = {
  portrait: { w: 1080, h: 1350 },
  square:   { w: 1080, h: 1080 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number,
  w: number, h: number
) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string
): string[] {
  ctx.font = font;
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(" ").filter(Boolean);
    if (!words.length) { lines.push(""); continue; }
    let cur = "";
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (cur && ctx.measureText(test).width > maxWidth) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

export default function SocialContentGenerator({ brands, onClose }: Props) {
  const [bgImage,      setBgImage]      = useState<string | null>(null);
  const [brandId,      setBrandId]      = useState(brands[0]?.id ?? "");
  const [headline,     setHeadline]     = useState("");
  const [subtitle,     setSubtitle]     = useState("");
  const [textColor,    setTextColor]    = useState("#FFD700");
  const [aspectRatio,  setAspectRatio]  = useState<AspectRatio>("portrait");
  const [aiLoading,    setAiLoading]    = useState(false);
  const [isExporting,  setIsExporting]  = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const brand = brands.find(b => b.id === brandId) ?? brands[0] ?? null;
  const dims  = CANVAS_DIMS[aspectRatio];
  const imgHFraction = aspectRatio === "portrait" ? 0.57 : 0.63;
  const imgH  = Math.round(dims.h * imgHFraction);

  const handleBgUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBgImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerateAI = async () => {
    if (!brand) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/social-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: brand.name, brandDescription: brand.description }),
      });
      const data = await res.json();
      if (data.headline) setHeadline(data.headline);
      if (data.subtitle) setSubtitle(data.subtitle);
    } catch { /* silent */ }
    finally { setAiLoading(false); }
  };

  const renderCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width  = dims.w;
    canvas.height = dims.h;

    // Black base
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, dims.w, dims.h);

    // Background image (clipped to image section)
    if (bgImage) {
      try {
        const img = await loadImage(bgImage);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, dims.w, imgH);
        ctx.clip();
        drawImageCover(ctx, img, 0, 0, dims.w, imgH);
        ctx.restore();
      } catch { /* skip */ }
    }

    // Gradient overlay (bottom portion of image section)
    const gradStart = imgH * 0.42;
    const grad = ctx.createLinearGradient(0, gradStart, 0, imgH);
    grad.addColorStop(0,   "rgba(0,0,0,0)");
    grad.addColorStop(0.6, "rgba(0,0,0,0.88)");
    grad.addColorStop(1,   "rgba(0,0,0,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, gradStart, dims.w, imgH - gradStart);

    // Logo zone
    const LOGO_H   = 88;
    const LOGO_MAX_W = 300;
    const logoTopY  = imgH - LOGO_H - 28;

    if (brand?.logo) {
      try {
        const logoImg = await loadImage(brand.logo);
        const scale = Math.min(LOGO_MAX_W / logoImg.width, LOGO_H / logoImg.height);
        const lw = logoImg.width  * scale;
        const lh = logoImg.height * scale;
        const lx = (dims.w - lw) / 2;
        const ly = logoTopY + (LOGO_H - lh) / 2;
        ctx.drawImage(logoImg, lx, ly, lw, lh);

        // Decorative side lines
        const lineY   = logoTopY + LOGO_H / 2;
        const lineGap = lw / 2 + 22;
        ctx.strokeStyle = "rgba(255,255,255,0.42)";
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.moveTo(60, lineY); ctx.lineTo(dims.w / 2 - lineGap, lineY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dims.w / 2 + lineGap, lineY); ctx.lineTo(dims.w - 60, lineY); ctx.stroke();
      } catch { /* skip */ }
    } else if (brand?.name) {
      // Text fallback
      const fs = 52;
      ctx.font      = `900 ${fs}px Arial, sans-serif`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.direction = "rtl";
      ctx.fillText(brand.name, dims.w / 2, logoTopY + LOGO_H / 2 + fs / 3);
      const nameW = ctx.measureText(brand.name).width;
      const lineY = logoTopY + LOGO_H / 2;
      ctx.strokeStyle = "rgba(255,255,255,0.42)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(60, lineY); ctx.lineTo(dims.w / 2 - nameW / 2 - 20, lineY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dims.w / 2 + nameW / 2 + 20, lineY); ctx.lineTo(dims.w - 60, lineY); ctx.stroke();
    }

    // Subtitle below logo
    if (subtitle.trim()) {
      ctx.font      = `400 28px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.58)";
      ctx.textAlign = "center";
      ctx.direction = "rtl";
      ctx.fillText(subtitle, dims.w / 2, imgH - 16);
    }

    // Headline text
    if (headline.trim()) {
      const textAreaH  = dims.h - imgH;
      const fontSize   = headline.length > 60 ? 60 : headline.length > 40 ? 68 : 78;
      const font       = `900 ${fontSize}px Arial, sans-serif`;
      const lines      = wrapText(ctx, headline, dims.w - 140, font);
      const lineH      = fontSize * 1.32;
      const totalH     = lines.length * lineH;
      let   textY      = imgH + (textAreaH - totalH) / 2 + fontSize * 0.82;

      ctx.font      = font;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.direction = "rtl";
      for (const line of lines) {
        ctx.fillText(line, dims.w / 2, textY);
        textY += lineH;
      }
    }

    return canvas;
  }, [dims, imgH, bgImage, brand, headline, subtitle, textColor]);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const url  = canvas.toDataURL("image/png");
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${brand?.name ?? "post"}-${Date.now()}.png`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  // Preview sizing: scale down to fit the right panel
  const previewH = aspectRatio === "portrait" ? 500 : 400;
  const previewW = Math.round(previewH * (dims.w / dims.h));
  const previewImgH = Math.round(previewH * imgHFraction);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 70,
        background: "#111", display: "flex", flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      dir="rtl"
    >
      {/* ── Header ── */}
      <div style={{
        background: "#1a1a1a", borderBottom: "1px solid #2d2d2d",
        padding: "14px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              background: "#2d2d2d", border: "none", color: "#ccc",
              borderRadius: 8, width: 36, height: 36, cursor: "pointer",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
          <div>
            <h2 style={{ color: "#fff", margin: 0, fontWeight: 900, fontSize: 18 }}>
              🎨 יוצר תוכן לרשתות חברתיות
            </h2>
            <p style={{ color: "#555", margin: 0, fontSize: 12 }}>
              פוסט עם לוגו, כותרת ודרופ שאדו מקצועי — {dims.w}×{dims.h}px
            </p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={isExporting}
          style={{
            background: isExporting ? "#444" : "#f97316", color: "#fff",
            border: "none", borderRadius: 10, padding: "10px 22px",
            fontWeight: 700, cursor: isExporting ? "default" : "pointer", fontSize: 14,
          }}
        >
          {isExporting ? "⏳ מייצא..." : "⬇️ הורד PNG"}
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* ── Controls ── */}
        <div style={{
          width: 300, background: "#1a1a1a", borderLeft: "1px solid #2d2d2d",
          overflow: "auto", padding: 18, display: "flex", flexDirection: "column",
          gap: 20, flexShrink: 0,
        }}>

          {/* Brand selector */}
          <Section label="מותג">
            <select
              value={brandId}
              onChange={e => setBrandId(e.target.value)}
              style={inputStyle}
            >
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>
              ))}
            </select>
            {brand?.logo && (
              <div style={{
                marginTop: 8, display: "flex", alignItems: "center", gap: 8,
                background: "#252525", borderRadius: 8, padding: "8px 12px",
              }}>
                <img src={brand.logo} style={{ height: 26, maxWidth: 80, objectFit: "contain" }} alt="" />
                <span style={{ color: "#555", fontSize: 11 }}>לוגו מזוהה ✓</span>
              </div>
            )}
          </Section>

          {/* Aspect ratio */}
          <Section label="פורמט">
            <div style={{ display: "flex", gap: 8 }}>
              {([ ["portrait", "4:5 📱 פורטרט"], ["square", "1:1 🔲 ריבוע"] ] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setAspectRatio(val)}
                  style={{
                    flex: 1, padding: "9px 6px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: aspectRatio === val ? "#f97316" : "#252525",
                    border: `1.5px solid ${aspectRatio === val ? "#f97316" : "#3d3d3d"}`,
                    color: aspectRatio === val ? "#fff" : "#888", cursor: "pointer",
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </Section>

          {/* Background image */}
          <Section label="תמונת רקע">
            <button
              onClick={() => bgFileRef.current?.click()}
              style={{
                width: "100%",
                background: bgImage ? "#162316" : "#252525",
                color: bgImage ? "#4ade80" : "#777",
                border: `1.5px dashed ${bgImage ? "#4ade80" : "#3d3d3d"}`,
                borderRadius: 8, padding: "13px", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
              }}
            >
              {bgImage ? "✓ תמונה נטענה — לחץ להחלפה" : "📷 העלה תמונת רקע"}
            </button>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              onChange={handleBgUpload}
              style={{ display: "none" }}
            />
          </Section>

          {/* Headline */}
          <Section
            label="כותרת"
            action={
              <button
                onClick={handleGenerateAI}
                disabled={aiLoading}
                style={{
                  background: aiLoading ? "#333" : "#7c3aed", color: "#fff",
                  border: "none", borderRadius: 6, padding: "4px 12px",
                  fontSize: 11, fontWeight: 700,
                  cursor: aiLoading ? "default" : "pointer", opacity: aiLoading ? 0.7 : 1,
                }}
              >
                {aiLoading ? "⏳ מייצר..." : "✨ AI"}
              </button>
            }
          >
            <textarea
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="הכנס כותרת בעברית..."
              rows={4}
              dir="rtl"
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </Section>

          {/* Subtitle */}
          <Section label="כיתוב מתחת ללוגו" sublabel="(אופציונלי)">
            <input
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="למשל: כל המסעדות הכשרות במקום אחד"
              dir="rtl"
              style={{ ...inputStyle, fontFamily: "inherit" }}
            />
          </Section>

          {/* Text color */}
          <Section label="צבע כותרת">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "זהב",   value: "#FFD700" },
                { label: "לבן",   value: "#FFFFFF" },
                { label: "כתום",  value: "#FF9500" },
                { label: "אדום",  value: "#FF3B30" },
              ].map(c => (
                <button
                  key={c.value}
                  onClick={() => setTextColor(c.value)}
                  style={{
                    flex: "1 1 60px", padding: "8px 4px", borderRadius: 8,
                    fontSize: 12, fontWeight: 700,
                    background: textColor === c.value ? c.value + "25" : "#252525",
                    border: `2px solid ${textColor === c.value ? c.value : "#3d3d3d"}`,
                    color: c.value, cursor: "pointer",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Preview ── */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "auto", padding: 24, background: "#0d0d0d",
        }}>
          <SocialCardPreview
            bgImage={bgImage}
            brand={brand}
            headline={headline}
            subtitle={subtitle}
            textColor={textColor}
            width={previewW}
            height={previewH}
            imgHeight={previewImgH}
          />
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

/* ─── Section helper ─────────────────────────────────────── */
function Section({
  label, sublabel, action, children,
}: {
  label: string;
  sublabel?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ color: "#777", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
          {sublabel && <span style={{ fontWeight: 400, textTransform: "none", marginRight: 4, fontSize: 10 }}>{sublabel}</span>}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Shared input style ─────────────────────────────────── */
const inputStyle: CSSProperties = {
  width: "100%", background: "#252525", color: "#fff",
  border: "1px solid #3d3d3d", borderRadius: 8,
  padding: "9px 12px", fontSize: 14, outline: "none",
  boxSizing: "border-box",
};

/* ─── Live CSS preview ───────────────────────────────────── */
interface PreviewProps {
  bgImage: string | null;
  brand: Brand | null;
  headline: string;
  subtitle: string;
  textColor: string;
  width: number;
  height: number;
  imgHeight: number;
}

function SocialCardPreview({
  bgImage, brand, headline, subtitle, textColor, width, height, imgHeight,
}: PreviewProps) {
  const logoH    = Math.round(imgHeight * 0.105);
  const logoMaxW = Math.round(width * 0.36);
  const lineGap  = Math.round(width * 0.055);
  const textSize = Math.round(width * 0.073);

  return (
    <div style={{
      width, height, background: "#000",
      borderRadius: 14, overflow: "hidden", position: "relative", flexShrink: 0,
      boxShadow: "0 28px 90px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.07)",
    }}>
      {/* Background image */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: imgHeight,
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundColor: bgImage ? undefined : "#111",
      }}>
        {!bgImage && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#2a2a2a", fontSize: 13, fontWeight: 600 }}>ללא תמונת רקע</span>
          </div>
        )}
      </div>

      {/* Gradient overlay — bottom 58% of image section */}
      <div style={{
        position: "absolute", left: 0, right: 0,
        top: Math.round(imgHeight * 0.42), height: Math.round(imgHeight * 0.58),
        background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.88) 60%, #000 100%)",
        pointerEvents: "none",
      }} />

      {/* Logo + decorative lines */}
      <div style={{
        position: "absolute", left: 0, right: 0,
        top: imgHeight - logoH - Math.round(imgHeight * 0.06),
        display: "flex", alignItems: "center",
        padding: `0 ${lineGap}px`, gap: Math.round(width * 0.02),
      }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.32)" }} />
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {brand?.logo ? (
            <img
              src={brand.logo}
              style={{ height: logoH, maxWidth: logoMaxW, objectFit: "contain", display: "block" }}
              alt={brand.name}
            />
          ) : (
            <span style={{ color: "#fff", fontWeight: 900, fontSize: Math.round(width * 0.045) }}>
              {brand?.name ?? ""}
            </span>
          )}
        </div>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.32)" }} />
      </div>

      {/* Subtitle below logo */}
      {subtitle && (
        <div style={{
          position: "absolute", left: 0, right: 0,
          top: imgHeight - Math.round(imgHeight * 0.042),
          textAlign: "center",
        }}>
          <span style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: Math.round(width * 0.028),
            fontWeight: 400,
          }}>
            {subtitle}
          </span>
        </div>
      )}

      {/* Text section */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: imgHeight, bottom: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: `0 ${Math.round(width * 0.055)}px`,
      }}>
        {headline ? (
          <p style={{
            color: textColor, fontSize: textSize, fontWeight: 900,
            textAlign: "center", direction: "rtl",
            lineHeight: 1.35, margin: 0, wordBreak: "break-word",
          }}>
            {headline}
          </p>
        ) : (
          <p style={{
            color: "#2a2a2a", fontSize: Math.round(width * 0.045),
            fontWeight: 400, textAlign: "center", margin: 0,
          }}>
            הכנס כותרת...
          </p>
        )}
      </div>
    </div>
  );
}
