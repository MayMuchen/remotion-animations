import React, { useCallback } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Canvas2D } from "../lib/Canvas2D";
import { MONO, SERIF } from "../lib/fonts";
import { HudFrame } from "../lib/Overlays";
import { Glitch, ScrambleText } from "../lib/ScrambleText";
import { CL, EASE_IN, EASE_OUT, hash, mulberry32, noise1, shakeAt } from "../lib/util";
import { EV } from "../timeline";

const E = EV.strike;
const SX = 1130;
const SY = 540;

const ORBITS = [
  { r: 150, s: 0.021, size: 5, col: "#c9a27a", ph: 1 },
  { r: 240, s: 0.014, size: 8, col: "#e8c38a", ph: 3 },
  { r: 350, s: 0.0095, size: 10, col: "#5fb6ff", ph: 4.2, hero: true },
  { r: 500, s: 0.006, size: 14, col: "#d89b6a", ph: 0.4 },
  { r: 650, s: 0.004, size: 11, col: "#9fd0ff", ph: 2.2 },
];
const TILT = 0.3;

const DEBRIS = (() => {
  const r = mulberry32(99);
  return Array.from({ length: 2600 }, () => ({
    a: r() * Math.PI * 2,
    v: 4 + Math.pow(r(), 2) * 34,
    s: 1 + r() * 2.5,
    hot: r(),
    wob: r(),
  }));
})();

const PH_FROM = { x: 1880, y: 180 };
const phPos = (f: number) => {
  const p = interpolate(f, [E.photoid, E.impact], [0, 1], { ...CL, easing: EASE_IN });
  return { x: PH_FROM.x + (SX - PH_FROM.x) * p, y: PH_FROM.y + (SY - PH_FROM.y) * p, p };
};

const planetPos = (o: (typeof ORBITS)[number], f: number) => {
  const a = o.ph + f * o.s;
  return { x: SX + Math.cos(a) * o.r, y: SY + Math.sin(a) * o.r * TILT, a };
};

const drawScene = (ctx: CanvasRenderingContext2D, f: number, w: number, h: number) => {
  ctx.fillStyle = "#010103";
  ctx.fillRect(0, 0, w, h);
  const rs = mulberry32(12);
  for (let i = 0; i < 900; i++) {
    const b = rs();
    ctx.fillStyle = `rgba(210,225,255,${0.05 + b * b * 0.6})`;
    ctx.fillRect(rs() * w, rs() * h, b > 0.97 ? 2 : 1, b > 0.97 ? 2 : 1);
  }
  const dead = f >= E.impact;
  const since = f - E.impact;

  const orbA = dead ? Math.max(0, 1 - since / 10) : interpolate(f, [0, 20], [0, 1], CL);
  ORBITS.forEach((o) => {
    ctx.strokeStyle = `rgba(160,200,255,${0.16 * orbA})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(SX, SY, o.r, o.r * TILT, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  const drawPlanets = (front: boolean) =>
    ORBITS.forEach((o) => {
      const p = planetPos(o, Math.min(f, E.impact));
      if (Math.sin(p.a) > 0 !== front) return;
      let x = p.x;
      let y = p.y;
      let alpha = 1;
      if (dead) {
        const k = since * (12 - o.r / 80);
        x += ((p.x - SX) / o.r) * k * 4;
        y += ((p.y - SY) / o.r) * k * 4;
        alpha = Math.max(0, 1 - since / (8 + o.r / 60));
      }
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      const g = ctx.createRadialGradient(x - o.size * 0.4, y - o.size * 0.4, 0, x, y, o.size);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.3, o.col);
      g.addColorStop(1, "#000");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, o.size, 0, Math.PI * 2);
      ctx.fill();
      if (o.hero) {
        ctx.strokeStyle = "rgba(120,220,255,0.9)";
        ctx.strokeRect(x - 18, y - 18, 36, 36);
        ctx.font = `13px ${MONO}`;
        ctx.fillStyle = "rgba(160,230,255,0.9)";
        ctx.fillText("SOL-III", x + 24, y - 8);
      }
      ctx.globalAlpha = 1;
    });

  drawPlanets(false);

  if (!dead || since < 4) {
    const flare = dead ? 1 + since * 4 : 1 + interpolate(f, [E.impact - 8, E.impact], [0, 1.5], CL);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const len = (60 + noise1(i * 0.7 + f * 0.05, 2) * 110) * flare;
      const gg = ctx.createLinearGradient(SX, SY, SX + Math.cos(a) * len, SY + Math.sin(a) * len);
      gg.addColorStop(0, "rgba(255,220,160,0.25)");
      gg.addColorStop(1, "rgba(255,140,60,0)");
      ctx.strokeStyle = gg;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(SX, SY);
      ctx.lineTo(SX + Math.cos(a) * len, SY + Math.sin(a) * len);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(SX, SY, 0, SX, SY, 200 * flare);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.1, "rgba(255,240,200,1)");
    g.addColorStop(0.22, "rgba(255,170,80,0.45)");
    g.addColorStop(1, "rgba(255,80,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(SX - 200 * flare, SY - 200 * flare, 400 * flare, 400 * flare);
    ctx.globalCompositeOperation = "source-over";
  }
  drawPlanets(true);

  // coordinate broadcast rings
  const hero = planetPos(ORBITS[2], Math.min(f, E.impact));
  if (f >= E.broadcast) {
    for (let i = 0; i < 9; i++) {
      const age = f - E.broadcast - i * 12;
      if (age < 0) continue;
      const R = age * 9;
      const a = Math.max(0, 0.6 - R / 2200) * (dead ? Math.max(0, 1 - since / 20) : 1);
      ctx.strokeStyle = `rgba(120,230,255,${a})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hero.x, hero.y, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(160,240,255,${a})`;
      ctx.font = `12px ${MONO}`;
      for (let k = 0; k < 18; k++) {
        const ang = (k / 18) * Math.PI * 2 + i;
        ctx.fillText(hash(k + i * 31) > 0.5 ? "1" : "0", hero.x + Math.cos(ang) * R, hero.y + Math.sin(ang) * R);
      }
    }
  }

  // photoid
  if (f >= E.photoid && !dead) {
    const p = phPos(f);
    ctx.globalCompositeOperation = "lighter";
    const dx = PH_FROM.x - SX;
    const dy = PH_FROM.y - SY;
    const dl = Math.hypot(dx, dy);
    const tail = 60 + 420 * p.p;
    const tx = p.x + (dx / dl) * tail;
    const ty = p.y + (dy / dl) * tail;
    const tg = ctx.createLinearGradient(tx, ty, p.x, p.y);
    tg.addColorStop(0, "rgba(255,255,255,0)");
    tg.addColorStop(1, "rgba(220,240,255,0.9)");
    ctx.strokeStyle = tg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 30);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(150,200,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - 30, p.y - 30, 60, 60);
    ctx.globalCompositeOperation = "source-over";
    ctx.setLineDash([4, 10]);
    ctx.strokeStyle = "rgba(255,90,90,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(SX, SY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // supernova
  if (dead) {
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const R = Math.pow(Math.max(0, since - i * 3), 0.85) * 32;
      const a = Math.max(0, 1 - R / 1700);
      ctx.strokeStyle = `rgba(${i % 2 ? "255,170,110" : "200,230,255"},${a * 0.8})`;
      ctx.lineWidth = 6 * a + 1;
      ctx.beginPath();
      ctx.ellipse(SX, SY, R, R * (0.5 + i * 0.12), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      const R = Math.pow(since, 0.6) * 38 * (0.75 + noise1(i * 0.9, 5) * 0.6);
      const x = SX + Math.cos(a) * R;
      const y = SY + Math.sin(a) * R * 0.8;
      const s = 40 + noise1(i * 1.3, 8) * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      const c = i % 3 === 0 ? "255,90,60" : i % 3 === 1 ? "255,170,90" : "120,140,255";
      g.addColorStop(0, `rgba(${c},${0.12 * Math.min(1, since / 10)})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    for (const d of DEBRIS) {
      const R = d.v * Math.pow(since, 0.82) * 2.2;
      const x = SX + Math.cos(d.a + d.wob * 0.02 * since) * R;
      const y = SY + Math.sin(d.a) * R * 0.85;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
      const life = Math.max(0, 1 - since / (90 + d.hot * 120));
      ctx.fillStyle = d.hot > 0.6 ? `rgba(255,240,220,${life})` : `rgba(255,${120 + d.hot * 100},60,${life * 0.8})`;
      ctx.fillRect(x, y, d.s, d.s);
    }
    const core = Math.max(0, 1 - since / 16);
    const g = ctx.createRadialGradient(SX, SY, 0, SX, SY, 900);
    g.addColorStop(0, `rgba(255,255,255,${core})`);
    g.addColorStop(0.3, `rgba(255,220,180,${core * 0.5})`);
    g.addColorStop(1, "rgba(255,120,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }
};

export const Strike: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = useCallback(drawScene, []);
  const shake = shakeAt(frame, [E.impact], 50, 12);
  const p = phPos(frame);
  const whiteout = interpolate(frame, [E.impact, E.impact + 2, E.impact + 14], [0, 1, 0], CL);
  const preText = interpolate(frame, [E.broadcast, E.broadcast + 16, E.impact - 4, E.impact], [0, 1, 1, 0], CL);
  const after = interpolate(frame, [E.aftermath, E.aftermath + 24], [0, 1], { ...CL, easing: EASE_OUT });
  return (
    <AbsoluteFill style={{ translate: `${shake.x}px ${shake.y}px` }}>
      <Canvas2D draw={draw} />
      <HudFrame code="STRIKE" title="打击 · DARK FOREST STRIKE" color="rgba(255,140,120,0.8)" />

      <div style={{ position: "absolute", left: 160, top: 250, opacity: preText, width: 560 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 64, color: "#eaf7ff", letterSpacing: "0.12em" }}>
          {frame < E.photoid ? "坐标广播" : "光粒"}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.35em", color: "#8fe3ff", marginTop: 12 }}>
          {frame < E.photoid ? (
            <ScrambleText text="COORDINATE BROADCAST" start={E.broadcast + 6} speed={1.2} />
          ) : (
            <ScrambleText text="PHOTOID · RELATIVISTIC WEAPON" start={E.photoid} speed={0.8} accent="#ff8a8a" />
          )}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 15, lineHeight: 1.9, color: "rgba(190,220,240,0.7)", marginTop: 26, letterSpacing: "0.1em" }}>
          {frame < E.photoid ? (
            <>
              <div>TARGET  187J3X1</div>
              <div>RA  14h 39m 36.5s</div>
              <div>DEC  −60° 50′ 02″</div>
              <div>TX  {"█".repeat(Math.max(0, Math.min(24, Math.floor((frame - E.broadcast) / 4))))}</div>
            </>
          ) : (
            <>
              <div style={{ color: "#ff8a8a" }}>VELOCITY  0.99999 c</div>
              <div>MASS  ≈ 1.0 g</div>
              <div>γ  {(224 + p.p * 9000).toFixed(0)}</div>
              <div>ETA  {Math.max(0, (E.impact - frame) / 30).toFixed(2)} s</div>
            </>
          )}
        </div>
      </div>

      {frame >= E.photoid + 6 && frame < E.impact && (
        <div
          style={{
            position: "absolute",
            left: p.x - 26,
            top: p.y - 26,
            width: 52,
            height: 52,
            border: "1.5px solid #ff5a5a",
            boxShadow: "0 0 12px rgba(255,60,60,0.6)",
          }}
        >
          <div style={{ position: "absolute", right: 64, top: 56, fontFamily: MONO, fontSize: 13, color: "#ff8a8a", whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
            PHOTOID ▸ {(p.p * 100).toFixed(1)}%
          </div>
        </div>
      )}

      <AbsoluteFill style={{ background: "#fff", opacity: whiteout }} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: after }}>
        <Glitch intensity={interpolate(frame, [E.aftermath, E.aftermath + 18], [0.8, 0], CL)} style={{ color: "#fff" }}>
          <div
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 150,
              letterSpacing: "0.5em",
              marginRight: "-0.5em",
              textShadow: "0 0 50px rgba(255,120,60,0.7), 0 0 10px #000",
              scale: String(interpolate(frame, [E.aftermath, 450], [1.06, 1], CL)),
            }}
          >
            清理
          </div>
        </Glitch>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: "rgba(255,235,220,0.92)", marginTop: 20, letterSpacing: "0.1em", textShadow: "0 0 20px #000" }}>
          一旦被发现，能生存下来的只有一方，或者都不能生存
        </div>
        <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: "0.4em", color: "rgba(255,200,180,0.65)", marginTop: 18 }}>
          <ScrambleText text="ONCE DISCOVERED, ONLY ONE SIDE SURVIVES — OR NEITHER." start={E.aftermath + 16} speed={0.8} accent="#ffb36a" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
