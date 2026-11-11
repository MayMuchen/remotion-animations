import React, { useCallback } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Canvas2D } from "../lib/Canvas2D";
import { MONO, SERIF } from "../lib/fonts";
import { HudFrame } from "../lib/Overlays";
import { Glitch, ScrambleText } from "../lib/ScrambleText";
import { CL, EASE_IN, EASE_OUT, hash, shakeAt } from "../lib/util";
import { EV } from "../timeline";

const E = EV.tech;
const X0 = 250;
const X1 = 1670;
const Y0 = 860;
const Y1 = 250;

const f = (x: number) => Math.exp(11 * Math.pow(x, 3.2)) - 1;

const MILESTONES: [number, string, string][] = [
  [0.08, "农业", "AGRICULTURE"],
  [0.3, "文字", "WRITING"],
  [0.52, "印刷术", "PRINTING"],
  [0.66, "蒸汽机", "STEAM"],
  [0.74, "电力", "ELECTRICITY"],
  [0.8, "核裂变", "FISSION"],
  [0.85, "信息时代", "INFORMATION"],
  [0.9, "可控核聚变", "FUSION"],
  [0.95, "曲率驱动", "CURVATURE DRIVE"],
  [0.99, "？？？", "UNKNOWN"],
];

const xNowAt = (frame: number) =>
  frame < E.explode
    ? interpolate(frame, [16, E.explode], [0, 0.9], CL)
    : interpolate(frame, [E.explode, E.flash], [0.9, 1.0], { ...CL, easing: EASE_OUT });

const fmt = (v: number) => {
  if (v < 1000) return v.toFixed(0);
  const e = Math.floor(Math.log10(v));
  return `${(v / 10 ** e).toFixed(1)}e${e}`;
};

const drawScene = (ctx: CanvasRenderingContext2D, frame: number, w: number, h: number) => {
  ctx.fillStyle = "#030305";
  ctx.fillRect(0, 0, w, h);
  const xNow = xNowAt(frame);
  const yMax = Math.max(4, f(xNow) * 1.35);
  const px = (x: number) => X0 + (X1 - X0) * x;
  const py = (y: number) => Y0 - (Y0 - Y1) * (y / yMax);
  const hot = interpolate(frame, [E.explode - 10, E.explode + 20], [0, 1], CL);

  // grid with auto-rescaling y ticks
  ctx.font = `14px ${MONO}`;
  ctx.textAlign = "right";
  const step = 10 ** Math.floor(Math.log10(yMax / 2));
  for (let v = 0; v <= yMax; v += step) {
    const y = py(v);
    ctx.strokeStyle = "rgba(160,200,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(X0, y);
    ctx.lineTo(X1, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(160,200,255,0.45)";
    ctx.fillText(fmt(v), X0 - 14, y + 5);
  }
  for (let i = 0; i <= 20; i++) {
    const x = px(i / 20);
    ctx.strokeStyle = "rgba(160,200,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(x, Y1);
    ctx.lineTo(x, Y0);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(200,230,255,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X0, Y1 - 20);
  ctx.lineTo(X0, Y0);
  ctx.lineTo(X1 + 20, Y0);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(200,230,255,0.6)";
  ctx.fillText("TIME →", X1 - 40, Y0 + 30);

  // curve
  const pts: [number, number][] = [];
  for (let i = 0; i <= 600; i++) {
    const x = (i / 600) * xNow;
    pts.push([px(x), Math.max(-200, py(f(x)))]);
  }
  const grd = ctx.createLinearGradient(0, Y1, 0, Y0);
  grd.addColorStop(0, "rgba(255,110,60,0.35)");
  grd.addColorStop(1, "rgba(80,160,255,0.0)");
  ctx.beginPath();
  ctx.moveTo(px(0), Y0);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(pts[pts.length - 1][0], Y0);
  ctx.closePath();
  ctx.fillStyle = grd;
  ctx.fill();
  const strokes = [
    [14, `rgba(255,${140 - hot * 80},60,${0.15 + hot * 0.2})`],
    [5, `rgba(255,${200 - hot * 80},120,0.45)`],
    [2, "#ffffff"],
  ] as const;
  for (const [lw, c] of strokes) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  const [hx, hy] = pts[pts.length - 1];
  const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 60 + hot * 80);
  hg.addColorStop(0, "rgba(255,255,255,1)");
  hg.addColorStop(0.2, "rgba(255,180,90,0.7)");
  hg.addColorStop(1, "rgba(255,80,40,0)");
  ctx.fillStyle = hg;
  ctx.fillRect(hx - 160, hy - 160, 320, 320);

  // milestones (alternating heights so labels never collide)
  ctx.textAlign = "center";
  MILESTONES.forEach(([x, zh, en], mi) => {
    if (x > xNow) return;
    const lift = mi >= 4 && mi % 2 === 1 ? 70 : 0;
    const mx = px(x);
    const my = Math.max(Y1 - 40, py(f(x)));
    const a = Math.min(1, (xNow - x) * 40);
    ctx.globalAlpha = a;
    if (mi >= 7) {
      // the curve is near-vertical here: put labels to the right of the point
      ctx.fillStyle = "#fff";
      ctx.fillRect(mx - 3, my - 3, 6, 6);
      ctx.textAlign = "left";
      ctx.font = `bold 22px ${SERIF}`;
      ctx.fillText(zh, mx + 18, my + 2);
      ctx.font = `12px ${MONO}`;
      ctx.fillStyle = "rgba(200,220,255,0.6)";
      ctx.fillText(en, mx + 18, my + 20);
      ctx.textAlign = "center";
      ctx.globalAlpha = 1;
      return;
    }
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx, my - 60 - lift);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillRect(mx - 3, my - 3, 6, 6);
    ctx.font = `bold 22px ${SERIF}`;
    ctx.fillText(zh, mx, my - 90 - lift);
    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = "rgba(200,220,255,0.6)";
    ctx.fillText(en, mx, my - 70 - lift);
    ctx.globalAlpha = 1;
  });

  // scanline tearing after the explosion
  if (hot > 0.5) {
    for (let i = 0; i < 8; i++) {
      const y = hash(frame * 3 + i) * h;
      const hh = 2 + hash(frame + i * 9) * 20;
      const dx = (hash(frame * 7 + i) - 0.5) * 80 * hot;
      ctx.drawImage(ctx.canvas, 0, y, w, hh, dx, y, w, hh);
    }
  }
};

export const TechExplosion: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = useCallback(drawScene, []);
  const shake = shakeAt(frame, [E.explode], 18, 14);
  const v = f(xNowAt(frame));
  const exp10 = frame < E.explode ? Math.log10(v + 1) : Math.log10(v + 1) + Math.pow(frame - E.explode, 1.6) * 0.6;
  const mant = 1 + hash(Math.floor(frame)) * 8.99;
  const hot = interpolate(frame, [E.explode, E.explode + 20], [0, 1], CL);
  return (
    <AbsoluteFill style={{ translate: `${shake.x}px ${shake.y}px` }}>
      <Canvas2D draw={draw} />
      <HudFrame code="EXPLOSION" title="技术爆炸 · TECHNOLOGICAL EXPLOSION" color="rgba(255,170,110,0.8)" />
      <div style={{ position: "absolute", left: 300, top: 250 }}>
        <Glitch intensity={frame >= E.explode ? interpolate(frame, [E.explode, E.explode + 14], [1, 0.1], CL) : 0} style={{ color: "#fff" }}>
          <div
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 104,
              letterSpacing: "0.12em",
              lineHeight: 1,
              opacity: interpolate(frame, [4, 24], [0, 1], CL),
              translate: `0 ${interpolate(frame, [4, 30], [30, 0], { ...CL, easing: EASE_OUT })}px`,
            }}
          >
            技术爆炸
          </div>
        </Glitch>
        <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.3em", color: "rgba(255,200,160,0.75)", marginTop: 20 }}>
          <ScrambleText text="TECHNOLOGICAL EXPLOSION" start={14} speed={1.5} accent="#ffb36a" />
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 36,
            color: "rgba(235,240,250,0.92)",
            marginTop: 34,
            lineHeight: 1.5,
            opacity: interpolate(frame, [60, 80], [0, 1], CL),
          }}
        >
          今天弱小的文明，
          <br />
          几百年后可能远远超越你
        </div>
      </div>
      <div style={{ position: "absolute", left: 300, top: 600, fontFamily: MONO, color: hot > 0.5 ? "#ffd0a0" : "#cfe6ff" }}>
        <div style={{ fontSize: 16, letterSpacing: "0.4em", opacity: 0.7 }}>TECH INDEX</div>
        <div
          style={{
            fontSize: 64,
            textShadow: `0 0 ${10 + hot * 30}px rgba(255,150,80,${0.3 + hot * 0.6})`,
            scale: String(1 + hot * 0.15 * interpolate(frame, [E.explode, E.flash], [1, 1.6], { ...CL, easing: EASE_IN })),
            transformOrigin: "left center",
          }}
        >
          {frame < E.explode ? (v + 1).toFixed(2) : `${mant.toFixed(2)}×10`}
          {frame >= E.explode && <sup style={{ fontSize: 34 }}>{Math.floor(exp10)}</sup>}
        </div>
        <div style={{ fontSize: 15, letterSpacing: "0.3em", color: hot > 0.5 ? "#ff6a4a" : "rgba(200,220,255,0.5)", marginTop: 6 }}>
          {hot > 0.5 ? "▲ EXPONENTIAL · UNBOUNDED" : "GROWTH NOMINAL"}
        </div>
      </div>
    </AbsoluteFill>
  );
};
