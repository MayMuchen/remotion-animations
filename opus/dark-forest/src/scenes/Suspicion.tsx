import React, { useCallback } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Canvas2D } from "../lib/Canvas2D";
import { MONO, SERIF } from "../lib/fonts";
import { HudFrame } from "../lib/Overlays";
import { Glitch, ScrambleText } from "../lib/ScrambleText";
import { CL, EASE_IN, EASE_OUT, hash, mulberry32, smooth } from "../lib/util";
import { EV } from "../timeline";

const E = EV.suspicion;
const AX = 430;
const BX = 1490;
const NY = 600;
const CYAN = "110,220,255";
const AMBER = "255,176,90";

const LINES = [
  { who: "A", text: "我不知道你是善意的，还是恶意的" },
  { who: "B", text: "你也不知道我是善意的，还是恶意的" },
  { who: "A", text: "即使你是善意的，你也不知道我是否认为你是善意的" },
  { who: "B", text: "即使我知道你认为我是善意的，你也不知道我认为你认为我……" },
];

const TUNNEL_TEXT = "我认为你认为我认为你认为我认为你认为我认为你认为……";

const drawNode = (ctx: CanvasRenderingContext2D, x: number, y: number, col: string, f: number, a: number) => {
  if (a <= 0) return;
  ctx.globalAlpha = a;
  for (let i = 0; i < 4; i++) {
    const p = (f * 0.012 + i / 4) % 1;
    ctx.strokeStyle = `rgba(${col},${(1 - p) * 0.5})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, 20 + p * 160, 0, Math.PI * 2);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, 70);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.12, `rgba(${col},0.9)`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${col},0.8)`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const s = f * 0.02 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(x, y, 44, s, s + 1.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const drawScene = (ctx: CanvasRenderingContext2D, f: number, w: number, h: number) => {
  ctx.fillStyle = "#020306";
  ctx.fillRect(0, 0, w, h);

  const nodesA = interpolate(f, [0, 20, E.droste, E.droste + 20], [0, 1, 1, 0], CL);

  if (nodesA > 0) {
    ctx.globalAlpha = nodesA;
    ctx.strokeStyle = "rgba(200,220,255,0.18)";
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    ctx.moveTo(AX, NY);
    ctx.lineTo(BX, NY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(200,220,255,0.5)";
    ctx.font = `15px ${MONO}`;
    ctx.textAlign = "center";
    ctx.fillText("Δ = 4.22 LY · 光速延迟 8.44 YR / ROUND-TRIP", (AX + BX) / 2, NY + 34);
    ctx.globalAlpha = 1;
  }

  // message packets: each line sends one, then they accelerate into a braid
  ctx.globalCompositeOperation = "lighter";
  const sends: { t: number; dir: number }[] = [];
  E.lines.forEach((t, i) => sends.push({ t, dir: i % 2 === 0 ? 1 : -1 }));
  for (let i = 0; i < 26; i++) sends.push({ t: E.lines[3] + 10 + i * Math.max(2, 9 - i * 0.4), dir: i % 2 ? 1 : -1 });
  sends.forEach((s, i) => {
    const age = f - s.t;
    if (age < 0) return;
    const fade = nodesA * Math.exp(-Math.max(0, age - 40) / 60);
    if (fade < 0.01) return;
    const hgt = (90 + (i % 7) * 34) * (i % 2 ? 1 : -1);
    const from = s.dir > 0 ? AX : BX;
    const to = s.dir > 0 ? BX : AX;
    const col = s.dir > 0 ? CYAN : AMBER;
    const mx = (from + to) / 2;
    const my = NY + hgt;
    ctx.strokeStyle = `rgba(${col},${0.22 * fade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(from, NY);
    ctx.quadraticCurveTo(mx, my, to, NY);
    ctx.stroke();
    const p = Math.min(1, age / 30);
    if (p < 1) {
      for (let k = 0; k < 14; k++) {
        const q = Math.max(0, p - k * 0.012);
        const x = (1 - q) * (1 - q) * from + 2 * (1 - q) * q * mx + q * q * to;
        const y = (1 - q) * (1 - q) * NY + 2 * (1 - q) * q * my + q * q * NY;
        ctx.fillStyle = `rgba(${col},${(1 - k / 14) * fade})`;
        const sz = 5 - k * 0.3;
        ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    }
  });
  ctx.globalCompositeOperation = "source-over";

  drawNode(ctx, AX, NY, CYAN, f, nodesA);
  drawNode(ctx, BX, NY, AMBER, f + 40, nodesA);

  // Droste tunnel of recursive suspicion
  const dIn = interpolate(f, [E.droste - 10, E.droste + 20, E.resolve, E.resolve + 14], [0, 1, 1, 0], CL);
  if (dIn > 0) {
    const z = Math.pow(Math.max(0, f - E.droste + 10), 1.35) * 0.02;
    const base = 1.55;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.globalAlpha = dIn;
    for (let k = -2; k < 14; k++) {
      const lvl = k + Math.floor(z);
      const s = Math.pow(base, -(k - (z % 1)));
      const W = 1500 * s;
      const H = 700 * s;
      if (W < 6 || W > 12000) continue;
      const col = lvl % 2 === 0 ? CYAN : AMBER;
      ctx.save();
      ctx.rotate(lvl * 0.06 + f * 0.002);
      const a = smooth(5, 40, W) * (1 - smooth(2600, 6000, W));
      ctx.strokeStyle = `rgba(${col},${0.7 * a})`;
      ctx.lineWidth = Math.max(0.5, 2 * s);
      ctx.strokeRect(-W / 2, -H / 2, W, H);
      ctx.fillStyle = `rgba(${col},${0.85 * a})`;
      ctx.font = `${26 * s}px ${SERIF}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      const offset = ((f * 3) % 400) * s;
      ctx.fillText(TUNNEL_TEXT, -W / 2 + 10 * s - offset * (lvl % 2 ? 0 : 1), -H / 2 - 6 * s);
      ctx.textBaseline = "top";
      ctx.textAlign = "right";
      ctx.fillText(lvl % 2 ? "B → A" : "A → B", W / 2 - 10 * s, H / 2 + 6 * s);
      ctx.restore();
    }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
    g.addColorStop(0, `rgba(255,255,255,${0.9 * dIn})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-90, -90, 180, 180);
    ctx.restore();
  }

  // hex data rain on the edges
  const r = mulberry32(3);
  ctx.font = `13px ${MONO}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (let i = 0; i < 40; i++) {
    const x = r() < 0.5 ? 90 + r() * 120 : w - 210 + r() * 120;
    const sp = 1 + r() * 3;
    const y = ((r() * h + f * sp * 4) % (h - 300)) + 150;
    ctx.fillStyle = `rgba(140,220,255,${0.12 + 0.2 * hash(i + Math.floor(f / 3))})`;
    ctx.fillText((hash(i * 7 + Math.floor(f / 4)) * 0xffffff).toString(16).slice(0, 6).toUpperCase(), x, y);
  }
};

export const Suspicion: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = useCallback(drawScene, []);
  const linesOut = interpolate(frame, [E.droste - 16, E.droste], [1, 0], CL);
  const titleIn = interpolate(frame, [E.droste + 20, E.droste + 40, E.resolve - 6, E.resolve + 4], [0, 1, 1, 0], CL);
  const resIn = interpolate(frame, [E.resolve + 6, E.resolve + 26], [0, 1], { ...CL, easing: EASE_OUT });
  return (
    <AbsoluteFill>
      <Canvas2D draw={draw} />
      <HudFrame code="CHAIN" title="猜疑链 · CHAIN OF SUSPICION" color="rgba(255,190,120,0.75)" />

      {(["A", "B"] as const).map((k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: (k === "A" ? AX : BX) - 150,
            width: 300,
            top: NY + 90,
            textAlign: "center",
            fontFamily: MONO,
            fontSize: 18,
            letterSpacing: "0.3em",
            color: k === "A" ? `rgb(${CYAN})` : `rgb(${AMBER})`,
            opacity: interpolate(frame, [10, 30, E.droste, E.droste + 16], [0, 1, 1, 0], CL),
          }}
        >
          文明 {k} · CIV-{k}
          <div style={{ fontSize: 14, opacity: 0.6, marginTop: 6 }}>INTENT: UNKNOWN</div>
        </div>
      ))}

      <div style={{ position: "absolute", left: 200, right: 200, top: 250, opacity: linesOut }}>
        {LINES.map((l, i) => {
          const s = E.lines[i];
          const a = interpolate(frame, [s, s + 8], [0, 1], CL);
          const isA = l.who === "A";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isA ? "flex-start" : "flex-end",
                opacity: a,
                translate: `${(1 - a) * (isA ? -30 : 30)}px 0`,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontFamily: SERIF,
                  fontWeight: 700,
                  fontSize: 38,
                  color: "#eef3fa",
                  letterSpacing: "0.04em",
                  borderLeft: isA ? `3px solid rgb(${CYAN})` : "none",
                  borderRight: isA ? "none" : `3px solid rgb(${AMBER})`,
                  padding: "4px 20px",
                  background: `linear-gradient(${isA ? 90 : 270}deg, rgba(${isA ? CYAN : AMBER},0.12), transparent)`,
                }}
              >
                <ScrambleText text={l.text} start={s} speed={1} window={6} accent={isA ? `rgb(${CYAN})` : `rgb(${AMBER})`} />
              </div>
            </div>
          );
        })}
      </div>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: titleIn }}>
        <Glitch intensity={interpolate(frame, [E.droste + 20, E.droste + 34], [1, 0], CL)} style={{ color: "#fff" }}>
          <div
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 170,
              letterSpacing: "0.3em",
              marginRight: "-0.3em",
              textShadow: "0 0 50px rgba(0,0,0,1), 0 0 30px rgba(255,200,140,0.6)",
              scale: String(interpolate(frame, [E.droste + 20, E.resolve], [1, 1.12], { ...CL, easing: EASE_IN })),
            }}
          >
            猜疑链
          </div>
        </Glitch>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            letterSpacing: "0.8em",
            marginRight: "-0.8em",
            color: "rgba(255,220,180,0.85)",
            marginTop: 10,
            textShadow: "0 0 20px #000",
          }}
        >
          CHAIN OF SUSPICION · ∞ RECURSION
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: resIn }}>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 64,
            color: "#f1f5fb",
            letterSpacing: "0.1em",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          即使双方都是善意的文明
          <br />
          <span style={{ color: "#ffb36a" }}>猜疑链也无法被消除</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.4em", color: "rgba(220,230,240,0.6)", marginTop: 30 }}>
          <ScrambleText text="THE CHAIN OF SUSPICION CAN NEVER BE BROKEN" start={E.resolve + 14} speed={1} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
