import React, { useCallback } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Canvas2D } from "../lib/Canvas2D";
import { MONO, SERIF } from "../lib/fonts";
import { HudFrame } from "../lib/Overlays";
import { ScrambleText } from "../lib/ScrambleText";
import { CL, EASE_IO, EASE_OUT, mulberry32, smooth } from "../lib/util";
import { EV } from "../timeline";

const A2 = EV.axioms.axiom2;

// ---------- precomputed data ----------
const N = 9000;
const SPHERE: { x: number; y: number; z: number; city: boolean; land: number }[] = (() => {
  const r = mulberry32(42);
  const out = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = g * i;
    const x = Math.cos(th) * rad;
    const z = Math.sin(th) * rad;
    const land =
      Math.sin(x * 3.1 + 1.3) * Math.cos(z * 2.7 - 0.4) + Math.sin(y * 4.2 + x * 1.7) * 0.6 + Math.cos(z * 5.1) * 0.25;
    out.push({ x, y, z, land, city: land > 0.35 && r() < 0.35 });
  }
  return out;
})();

const CIVS = (() => {
  const r = mulberry32(9);
  const out: { x: number; y: number; b: number; k: number; hue: number }[] = [];
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, b: r() * 140, k: 0.018 + r() * 0.016, hue: r() });
  }
  out[0] = { x: 0.05, y: 0.02, b: 0, k: 0.03, hue: 0.9 };
  return out;
})();

const MATTER = (() => {
  const r = mulberry32(5);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < 2600; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
  }
  return out;
})();

const PCX = 1330;
const PCY = 540;
const RX = 520;
const RY = 290;

const drawPlanet = (ctx: CanvasRenderingContext2D, frame: number, cx: number, cy: number, R: number, alpha: number) => {
  if (alpha <= 0.001) return;
  ctx.globalAlpha = alpha;
  const spin = frame * 0.006;
  const tilt = 0.41;
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const L = { x: -0.62, y: -0.42, z: 0.66 };

  const atm = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.35);
  atm.addColorStop(0, "rgba(80,170,255,0.32)");
  atm.addColorStop(0.3, "rgba(60,130,255,0.12)");
  atm.addColorStop(1, "rgba(40,80,255,0)");
  ctx.fillStyle = atm;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#02050a";
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "lighter";
  for (const p of SPHERE) {
    const x1 = p.x * cs - p.z * sn;
    const z1 = p.x * sn + p.z * cs;
    const x = x1 * ct - p.y * st;
    const y = x1 * st + p.y * ct;
    const z = z1;
    if (z < 0) continue;
    const lit = Math.max(0, x * L.x + y * L.y + z * L.z);
    const sx = cx + x * R;
    const sy = cy + y * R;
    const rim = Math.pow(1 - z, 3);
    const ps = Math.max(1, R / 115);
    if (p.land > 0.15) {
      const b = 0.15 + lit * 0.85;
      ctx.fillStyle = `rgba(${90 + 80 * lit},${200 * b + 30},${255 * b},${0.25 + 0.6 * b})`;
      ctx.fillRect(sx, sy, 2.2 * ps, 2.2 * ps);
    } else {
      ctx.fillStyle = `rgba(50,110,230,${0.12 + lit * 0.45 + rim * 0.5})`;
      ctx.fillRect(sx, sy, 1.6 * ps, 1.6 * ps);
    }
    if (p.city && lit < 0.18) {
      ctx.fillStyle = `rgba(255,190,90,${0.9 - lit * 3})`;
      ctx.fillRect(sx - 0.5, sy - 0.5, 2.6 * ps, 2.6 * ps);
    }
  }
  ctx.globalCompositeOperation = "source-over";

  // orbits + satellites
  ctx.strokeStyle = "rgba(140,220,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, R * 1.75, R * 0.42, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, R * 2.15, R * 0.62, -0.28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 3; i++) {
    const a = frame * 0.02 + (i * Math.PI * 2) / 3;
    const ex = Math.cos(a) * R * 1.75;
    const ey = Math.sin(a) * R * 0.42;
    const rx = cx + ex * Math.cos(-0.35) - ey * Math.sin(-0.35);
    const ry = cy + ex * Math.sin(-0.35) + ey * Math.cos(-0.35);
    if (Math.sin(a) < 0 && Math.hypot(rx - cx, ry - cy) < R) continue;
    ctx.fillStyle = "#bff4ff";
    ctx.shadowColor = "#7fe6ff";
    ctx.shadowBlur = 12;
    ctx.fillRect(rx - 2, ry - 2, 4, 4);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
};

const drawField = (ctx: CanvasRenderingContext2D, f: number, alpha: number) => {
  if (alpha <= 0.001) return;
  ctx.globalAlpha = alpha;
  const cx = PCX;
  const cy = PCY + 20;
  ctx.strokeStyle = "rgba(120,200,255,0.08)";
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, (RX * i) / 5, (RY * i) / 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const rad = (c: (typeof CIVS)[number]) => {
    const t = f - c.b;
    if (t < 0) return 0;
    return Math.min(0.55, 0.012 * Math.exp(c.k * t));
  };
  for (const m of MATTER) {
    let used = false;
    for (const c of CIVS) {
      const r = rad(c);
      if (r > 0 && (m.x - c.x) ** 2 + (m.y - c.y) ** 2 < r * r) {
        used = true;
        break;
      }
    }
    ctx.fillStyle = used ? "rgba(255,120,80,0.16)" : "rgba(170,220,255,0.55)";
    ctx.fillRect(cx + m.x * RX, cy + m.y * RY, 1.8, 1.8);
  }
  ctx.globalCompositeOperation = "lighter";
  CIVS.forEach((c, i) => {
    const r = rad(c);
    if (r <= 0) return;
    const x = cx + c.x * RX;
    const y = cy + c.y * RY;
    const col = c.hue > 0.5 ? "90,210,255" : "255,170,80";
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * RX);
    g.addColorStop(0, `rgba(${col},0.10)`);
    g.addColorStop(1, `rgba(${col},0.02)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * RX, r * RY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${col},0.55)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `rgba(${col},1)`;
    ctx.fillRect(x - 2, y - 2, 4, 4);
    if (i === 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.strokeRect(x - 9, y - 9, 18, 18);
    }
  });
  for (let i = 0; i < CIVS.length; i++) {
    for (let j = i + 1; j < CIVS.length; j++) {
      const a = CIVS[i];
      const b = CIVS[j];
      const ra = rad(a);
      const rb = rad(b);
      if (!ra || !rb) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < ra + rb) {
        const t = (ra - (ra + rb - d) / 2) / d;
        const x = cx + (a.x + (b.x - a.x) * t) * RX;
        const y = cy + (a.y + (b.y - a.y) * t) * RY;
        const pulse = 0.5 + 0.5 * Math.sin(f * 0.5 + i * 3 + j);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
        g.addColorStop(0, `rgba(255,60,60,${0.6 + pulse * 0.4})`);
        g.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 26, y - 26, 52, 52);
        ctx.strokeStyle = "rgba(255,80,80,0.35)";
        ctx.beginPath();
        ctx.moveTo(cx + a.x * RX, cy + a.y * RY);
        ctx.lineTo(cx + b.x * RX, cy + b.y * RY);
        ctx.stroke();
      }
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
};

const drawScene = (ctx: CanvasRenderingContext2D, frame: number, w: number, h: number) => {
  ctx.fillStyle = "#010205";
  ctx.fillRect(0, 0, w, h);
  const r = mulberry32(77);
  for (let i = 0; i < 700; i++) {
    const x = r() * w;
    const y = r() * h;
    const b = r();
    ctx.fillStyle = `rgba(200,220,255,${0.08 + b * b * 0.5})`;
    ctx.fillRect((x - frame * 0.15 * b + w) % w, y, b > 0.95 ? 2 : 1, b > 0.95 ? 2 : 1);
  }
  const k = interpolate(frame, [A2 - 10, A2 + 40], [0, 1], { ...CL, easing: EASE_IO });
  const R = interpolate(k, [0, 1], [250, 6]);
  const px = interpolate(k, [0, 1], [PCX, PCX + 0.05 * RX]);
  const py = interpolate(k, [0, 1], [PCY, PCY + 20 + 0.02 * RY]);
  drawPlanet(ctx, frame, px, py, R * interpolate(frame, [0, 60], [0.8, 1], { ...CL, easing: EASE_OUT }), 1 - smooth(0.6, 1, k));
  drawField(ctx, Math.max(0, frame - A2 - 10), smooth(0.5, 1, k));
};

const Gauge: React.FC<{ label: string; value: number; display: string; color: string }> = ({
  label,
  value,
  display,
  color,
}) => (
  <div style={{ fontFamily: MONO, fontSize: 17, color, letterSpacing: "0.14em", marginTop: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", width: 560 }}>
      <span>{label}</span>
      <span>{display}</span>
    </div>
    <div style={{ width: 560, height: 6, background: "rgba(255,255,255,0.08)", marginTop: 8, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 560 * Math.min(1, value),
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
      <div style={{ position: "absolute", right: 0, top: -6, width: 2, height: 18, background: "#fff" }} />
    </div>
  </div>
);

export const Axioms: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = useCallback(drawScene, []);
  const a1 = interpolate(frame, [10, 30, A2 - 20, A2], [0, 1, 1, 0], CL);
  const a2 = interpolate(frame, [A2 + 10, A2 + 30], [0, 1], CL);
  const demand = Math.exp(Math.max(0, frame - A2 - 20) * 0.026) * 0.08;
  const over = demand > 1;
  const blink = Math.floor(frame / 6) % 2 === 0;
  const head: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 20,
    letterSpacing: "0.5em",
    color: "#7fdcff",
    marginBottom: 30,
  };
  const big: React.CSSProperties = {
    fontFamily: SERIF,
    fontWeight: 700,
    color: "#eef4ff",
    lineHeight: 1.28,
    letterSpacing: "0.06em",
    textShadow: "0 0 30px rgba(120,180,255,0.35)",
  };
  const en: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 19,
    color: "rgba(200,220,240,0.6)",
    letterSpacing: "0.12em",
    marginTop: 30,
    lineHeight: 1.7,
    maxWidth: 640,
    whiteSpace: "normal",
  };
  return (
    <AbsoluteFill>
      <Canvas2D draw={draw} />
      <HudFrame code="AXIOM" title="宇宙社会学 · COSMIC SOCIOLOGY" />

      <div style={{ position: "absolute", left: 170, top: 330, opacity: a1 }}>
        <div style={head}>
          <ScrambleText text="公理一 · AXIOM I" start={6} speed={2} />
        </div>
        <div
          style={{
            ...big,
            fontSize: 96,
            translate: `${interpolate(frame, [10, 50], [-40, 0], { ...CL, easing: EASE_OUT })}px 0`,
          }}
        >
          生存是文明的
          <br />
          <span style={{ color: "#8fe3ff" }}>第一需要</span>
        </div>
        <div style={en}>
          <ScrambleText text="SURVIVAL IS THE PRIMARY NEED OF CIVILIZATION." start={36} speed={1} window={6} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: PCX + 230,
          top: PCY - 250,
          fontFamily: MONO,
          fontSize: 15,
          lineHeight: 1.8,
          color: "rgba(160,230,255,0.75)",
          letterSpacing: "0.14em",
          opacity: a1 * interpolate(frame, [50, 70], [0, 1], CL),
          borderLeft: "1px solid rgba(160,230,255,0.5)",
          paddingLeft: 14,
        }}
      >
        <div>CIV-001 · 类型 I</div>
        <div>POP {(7.9 + frame * 0.004).toFixed(3)}e9</div>
        <div>PRIORITY: SURVIVAL = ∞</div>
      </div>

      <div style={{ position: "absolute", left: 170, top: 270, opacity: a2 }}>
        <div style={head}>
          <ScrambleText text="公理二 · AXIOM II" start={A2 + 10} speed={2} />
        </div>
        <div style={{ ...big, fontSize: 66 }}>
          文明不断增长和扩张，
          <br />
          但宇宙中的物质总量
          <br />
          <span style={{ color: "#ff8a6a" }}>保持不变</span>
        </div>
        <div style={{ ...en, maxWidth: 600 }}>
          CIVILIZATION GROWS AND EXPANDS, BUT THE TOTAL MATTER IN THE UNIVERSE REMAINS CONSTANT.
        </div>
        <div style={{ marginTop: 34, opacity: interpolate(frame, [A2 + 50, A2 + 70], [0, 1], CL) }}>
          <Gauge label="宇宙物质总量 TOTAL MATTER" value={1} display="100.000% · CONST" color="#8fe3ff" />
          <Gauge
            label="文明需求 DEMAND"
            value={demand}
            display={`${(demand * 100).toFixed(demand > 10 ? 0 : 1)}%`}
            color={over ? (blink ? "#ff3b3b" : "#ff7a5a") : "#ffb36a"}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
