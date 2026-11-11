import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { clamp01, easeOutCubic, mulberry32 } from "../particles/random";

const W = 1920;
const H = 1080;
const SERIF_STYLE_ID = "three-days-serif";
const SERIF = 'NotoSerifSC, "Songti SC", "SimSun", serif';
const LATIN = 'Cormorant Garamond, "Times New Roman", serif';

type TitlePoint = {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  phase: number;
  tint: 0 | 1 | 2 | 3;
};

const makeSprite = (core: string, mid: string, tail: string) => {
  const c = document.createElement("canvas");
  c.width = 40;
  c.height = 40;
  const g = c.getContext("2d");
  if (!g) throw new Error("Could not create sprite");
  const grad = g.createRadialGradient(20, 20, 0, 20, 20, 20);
  grad.addColorStop(0, core);
  grad.addColorStop(0.08, mid);
  grad.addColorStop(0.3, tail);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 40, 40);
  return c;
};

const sampleTitle = (text: string): TitlePoint[] => {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.clearRect(0, 0, W, H);
  ctx.font = '300 150px "NotoSerifSC"';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  const spacing = 20;
  const widths = Array.from(text).map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cursor = W / 2 - total / 2;
  const cy = H * 0.445;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], cursor + widths[i] / 2, cy);
    cursor += widths[i] + spacing;
  }
  const { data } = ctx.getImageData(0, 0, W, H);
  const rnd = mulberry32(20261107);
  const points: TitlePoint[] = [];
  const step = 3;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const a = data[(y * W + x) * 4 + 3];
      if (a < 96) continue;
      const z = 0.25 + rnd() * 0.7;
      const edge = a / 255;
      points.push({
        x: x + (rnd() - 0.5) * 2.2,
        y: y + (rnd() - 0.5) * 2.2,
        z,
        size: 2.4 + z * 2.5 + edge * 1.8,
        alpha: 0.32 + edge * 0.5,
        phase: rnd() * Math.PI * 2,
        tint: rnd() < 0.62 ? 0 : rnd() < 0.82 ? 1 : rnd() < 0.94 ? 2 : 3,
      });
    }
  }
  return points;
};

export const ParticleTitle: React.FC<{
  duration: number;
  title: string;
  sub: string;
  kicker?: string;
  credit?: string;
  variant: "title" | "outro";
  pace?: number;
}> = ({ duration, title, sub, kicker, credit, variant, pace = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("Sampling title particles"));
  const [points, setPoints] = useState<TitlePoint[] | null>(null);
  const sprites = useMemo(
    () => [
      makeSprite("rgba(255,252,246,1)", "rgba(255,236,206,0.96)", "rgba(255,198,148,0.14)"),
      makeSprite("rgba(255,232,198,1)", "rgba(255,192,130,0.92)", "rgba(255,156,98,0.13)"),
      makeSprite("rgba(255,212,166,1)", "rgba(255,168,104,0.88)", "rgba(255,136,78,0.11)"),
      makeSprite("rgba(214,244,240,0.9)", "rgba(158,212,206,0.6)", "rgba(98,158,158,0.08)"),
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    if (!document.getElementById(SERIF_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = SERIF_STYLE_ID;
      style.textContent = `@font-face{font-family:"NotoSerifSC";src:url("${staticFile(
        "NotoSerifSC-VF.ttf",
      )}") format("truetype");font-weight:100 900;font-display:block;}`;
      document.head.appendChild(style);
    }
    const finish = (next: TitlePoint[]) => {
      if (cancelled) return;
      setPoints(next);
      continueRender(handle);
    };
    document.fonts
      .load('300 150px "NotoSerifSC"')
      .then(() => finish(sampleTitle(title)))
      .catch(() => finish([]));
    return () => {
      cancelled = true;
    };
  }, [handle, title]);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || !points) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const t = frame / fps;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const formDur = (variant === "title" ? 1.65 : 2.0) * pace;
    const outStart = duration - (variant === "title" ? 0.9 : 1.15) * pace;
    const outQ = clamp01((t - outStart) / (duration - outStart));
    const outE = outQ > 0 ? Math.pow(outQ, 1.5) : 0;

    const glowR = 560 + Math.sin(t * 0.7) * 20;
    const glow = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, glowR);
    const formGlow = clamp01(t / formDur) * (1 - outE);
    glow.addColorStop(0, `rgba(255,206,156,${0.065 * formGlow})`);
    glow.addColorStop(0.55, `rgba(255,170,110,${0.018 * formGlow})`);
    glow.addColorStop(1, "rgba(255,140,80,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    for (const p of points) {
      const tx = p.x - W / 2;
      const ty = p.y - H / 2;
      const targetAngle = Math.atan2(ty, tx);
      const targetRadius = Math.hypot(tx, ty);
      const stagger = (p.x / W) * 0.28;
      const e = easeOutCubic(clamp01((t - stagger * formDur) / (formDur * 0.86)));
      const radius = targetRadius * e + (1 - e) * (150 + p.z * 540);
      const angle = targetAngle + (1 - e) * (3.4 + p.z * 1.6) + Math.sin(t * 0.22 + p.phase) * 0.012;

      let x = W / 2 + Math.cos(angle) * radius;
      let y = H * 0.445 + Math.sin(angle) * radius * 0.86;
      const persp = 1 + (p.z - 0.5) * 0.16 * (1 + outE * 3.2);
      x = W / 2 + (x - W / 2) * persp;
      y = H * 0.445 + (y - H * 0.445) * persp;

      if (outE > 0) {
        const spin = outE * 2.6;
        const dx = x - W / 2;
        const dy = y - H * 0.445;
        x = W / 2 + dx * Math.cos(spin) - dy * Math.sin(spin);
        y = H * 0.445 + dx * Math.sin(spin) + dy * Math.cos(spin);
        x += (W / 2 - x) * outE * 0.55;
        y += (H * 0.445 - y) * outE * 0.55;
      }

      // A touch more presence on the title card: it is the one frame the
      // viewer has the least context for, so the letterforms have to hold up
      // on their own before the glow is fully formed.
      const presence = variant === "title" ? 1.5 : 1.14;
      const alpha = p.alpha * presence * (0.1 + 0.9 * e) * (1 - Math.pow(outQ, 1.3));
      if (alpha <= 0.004) continue;
      const s =
        p.size *
        (variant === "title" ? 1.45 : 1.06) *
        (1 + outE * 1.5) *
        (0.9 + 0.1 * Math.sin(t * 1.7 + p.phase));
      ctx.globalAlpha = Math.min(0.96, alpha);
      ctx.drawImage(sprites[p.tint], x - s / 2, y - s / 2, s, s);
    }

    if (outE > 0) {
      const r = 90 + outE * 230;
      const g = ctx.createRadialGradient(W / 2, H * 0.445, 0, W / 2, H * 0.445, r);
      g.addColorStop(0, `rgba(255,246,228,${0.46 * Math.sin(outQ * Math.PI)})`);
      g.addColorStop(0.3, `rgba(255,200,148,${0.2 * Math.sin(outQ * Math.PI)})`);
      g.addColorStop(1, "rgba(255,140,80,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(W / 2 - r, H * 0.445 - r, r * 2, r * 2);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }, [duration, fps, frame, pace, points, sprites, variant]);

  const t = frame / fps;
  const metaIn = (variant === "title" ? 1.4 : 1.9) * pace;
  const metaOut = duration - 1.3;
  const metaOpacity =
    clamp01((t - metaIn) / 0.8) * (1 - clamp01((t - metaOut) / 0.9));
  const creditOpacity =
    variant === "outro"
      ? clamp01((t - 4.3 * pace) / (1.1 * pace)) *
        (1 - clamp01((t - (duration - 0.95 * pace)) / (0.85 * pace)))
      : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          opacity: metaOpacity,
        }}
      >
        {kicker ? (
          <div
            style={{
              position: "absolute",
              top: H * 0.29,
              fontFamily: LATIN,
              fontSize: 15,
              letterSpacing: "0.46em",
              paddingLeft: "0.46em",
              color: "rgba(232,161,92,0.72)",
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            top: H * 0.585,
            height: 1,
            width: 176,
            background:
              "linear-gradient(90deg, rgba(232,161,92,0) 0%, rgba(255,214,168,0.7) 50%, rgba(232,161,92,0) 100%)",
            boxShadow: "0 0 18px rgba(255,190,130,0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: H * 0.612,
            fontFamily: LATIN,
            fontSize: 19,
            letterSpacing: "0.4em",
            paddingLeft: "0.4em",
            color: variant === "title" ? "rgba(255,240,220,0.62)" : "rgba(255,236,214,0.5)",
          }}
        >
          {sub}
        </div>
        {variant === "outro" ? (
          <div
            style={{
              position: "absolute",
              bottom: 132,
              fontFamily: SERIF,
              fontWeight: 300,
              fontSize: 25,
              letterSpacing: "0.18em",
              color: "rgba(255,240,222,0.62)",
              opacity: creditOpacity,
            }}
          >
            {credit}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};


