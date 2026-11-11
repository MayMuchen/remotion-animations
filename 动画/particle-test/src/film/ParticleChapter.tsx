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
const CX = W * 0.5;
const CY = H * 0.49;
const SERIF_STYLE_ID = "three-days-serif-particle";

type ChapterParticle = {
  tx: number;
  ty: number;
  z: number;
  size: number;
  alpha: number;
  phase: number;
  tint: 0 | 1 | 2 | 3;
  seedAngle: number;
  seedRadius: number;
  bend: number;
  delay: number;
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

const sampleChapterTitle = (text: string): ChapterParticle[] => {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.clearRect(0, 0, W, H);
  ctx.font = '300 78px "NotoSerifSC"';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";

  const spacing = 18;
  const widths = Array.from(text).map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, text.length - 1);
  let cursor = CX - total / 2;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], cursor + widths[i] / 2, CY);
    cursor += widths[i] + spacing;
  }

  const { data } = ctx.getImageData(0, 0, W, H);
  const rnd = mulberry32(31082026);
  const points: ChapterParticle[] = [];
  const step = 2;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const a = data[(y * W + x) * 4 + 3];
      if (a < 82) continue;
      const z = 0.18 + rnd() * 0.78;
      const edge = a / 255;
      const tx = x + (rnd() - 0.5) * 2.6;
      const ty = y + (rnd() - 0.5) * 2.6;
      points.push({
        tx,
        ty,
        z,
        size: 2.3 + z * 2.8 + edge * 1.9,
        alpha: 0.34 + edge * 0.55,
        phase: rnd() * Math.PI * 2,
        tint: rnd() < 0.64 ? 0 : rnd() < 0.83 ? 1 : rnd() < 0.95 ? 2 : 3,
        seedAngle: rnd() * Math.PI * 2,
        seedRadius: 620 + rnd() * 920,
        bend: (rnd() * 2 - 1) * 0.42,
        delay: rnd() * 0.12,
      });
    }
  }
  return points;
};

export const ParticleChapterText: React.FC<{
  duration: number;
  inDuration: number;
  outDuration: number;
  title: string;
}> = ({ duration, inDuration, outDuration, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("Sampling chapter particles"));
  const [points, setPoints] = useState<ChapterParticle[] | null>(null);
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
    const finish = (next: ChapterParticle[]) => {
      if (cancelled) return;
      setPoints(next);
      continueRender(handle);
    };
    document.fonts
      .load('300 78px "NotoSerifSC"')
      .then(() => finish(sampleChapterTitle(title)))
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
    const formDuration = Math.max(0.58, inDuration || 0.78);
    const outStart = duration - outDuration;
    const outQ = outDuration > 0 ? clamp01((t - outStart) / outDuration) : 0;
    const outE = Math.pow(outQ, 1.28);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const positionAt = (p: ChapterParticle, time: number, endQ: number) => {
      const local = clamp01((time - p.delay * 0.1) / (formDuration * 0.94));
      const form = easeOutCubic(local);
      const dx = p.tx - CX;
      const dy = p.ty - CY;
      const targetAngle = Math.atan2(dy, dx);
      const targetRadius = Math.hypot(dx, dy);
      const radius = p.seedRadius + (targetRadius - p.seedRadius) * form;
      const angle =
        p.seedAngle +
        (targetAngle - p.seedAngle) * form +
        Math.sin(form * Math.PI) * p.bend;
      let x = CX + Math.cos(angle) * radius;
      let y = CY + Math.sin(angle) * radius * 0.9;
      x += Math.sin(time * 1.6 + p.phase) * 0.55 * (1 - form);
      y += Math.cos(time * 1.37 + p.phase) * 0.45 * (1 - form);

      const collapse = Math.pow(endQ, 1.24);
      if (collapse > 0.001) {
        const ox = x - CX;
        const oy = y - CY;
        const r = Math.hypot(ox, oy);
        const dir = p.phase < Math.PI ? 1 : -1;
        const a = Math.atan2(oy, ox) + collapse * (2.25 + p.z * 2.5) * dir;
        const rr = r * (1 - collapse * 0.975);
        x = CX + Math.cos(a) * rr;
        y = CY + Math.sin(a) * rr;
      }
      return { x, y, form };
    };

    const titleGlow = clamp01((t - 0.12) / Math.max(0.2, formDuration));
    const glow = ctx.createRadialGradient(CX, CY, 0, CX, CY, 470);
    glow.addColorStop(0, `rgba(255,214,164,${0.045 * titleGlow * (1 - outE)})`);
    glow.addColorStop(0.55, `rgba(255,168,108,${0.018 * titleGlow * (1 - outE)})`);
    glow.addColorStop(1, "rgba(255,140,80,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.fillRect(CX - 470, CY - 470, 940, 940);

    // The first frames are a bright point that the chapter particles appear to
    // pull out of; at the chapter exit the same point swallows them again.
    const inFlash = 1 - clamp01((t - 0.02) / Math.max(0.3, formDuration * 0.72));
    const outFlash = clamp01((outQ - 0.1) / 0.9);
    const core = Math.max(
      inFlash * inFlash * 0.9,
      outFlash * outFlash,
    );
    if (core > 0.008) {
      const radius = 48 + core * 220;
      const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, radius);
      g.addColorStop(0, `rgba(255,250,238,${0.48 * core})`);
      g.addColorStop(0.12, `rgba(255,226,184,${0.25 * core})`);
      g.addColorStop(0.42, `rgba(255,170,108,${0.075 * core})`);
      g.addColorStop(1, "rgba(255,130,70,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(CX - radius, CY - radius, radius * 2, radius * 2);

      ctx.lineWidth = 1.25;
      for (let k = 0; k < 4; k++) {
        const rr = 44 + k * 24 + core * (38 + k * 18);
        const rot = t * (1.1 + k * 0.28) + k * 1.4;
        ctx.globalAlpha = (0.18 - k * 0.028) * core;
        ctx.strokeStyle = k === 1 ? "rgba(255,248,232,1)" : "rgba(255,196,140,1)";
        ctx.beginPath();
        ctx.arc(CX, CY, rr, rot, rot + 1.25 + k * 0.35);
        ctx.stroke();
      }
    }

    // Short radial trails make the convergence read as motion, not a fade.
    ctx.lineWidth = 0.85;
    for (let i = 0; i < points.length; i++) {
      if (i % 4 !== 0) continue;
      const p = points[i];
      const now = positionAt(p, t, outQ);
      const prev = positionAt(p, Math.max(0, t - 0.045), clamp01((Math.max(0, t - 0.045) - outStart) / Math.max(0.001, outDuration)));
      const dx = now.x - prev.x;
      const dy = now.y - prev.y;
      const dist = Math.hypot(dx, dy);
      const alpha = p.alpha * smoothstep(0.02, 0.38, now.form) * (1 - outQ);
      if (dist < 1.1 || alpha < 0.025) continue;
      ctx.globalAlpha = Math.min(0.15, alpha * 0.2);
      ctx.strokeStyle = p.tint === 3 ? "rgba(190,236,232,1)" : "rgba(255,218,178,1)";
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(now.x, now.y);
      ctx.stroke();
    }

    for (const p of points) {
      const pos = positionAt(p, t, outQ);
      const appear = smoothstep(0, 0.2, pos.form);
      const endAlpha = 1 - smoothstep(0.04, 0.74, outQ);
      const alpha = p.alpha * appear * endAlpha * (1 - 0.42 * outE);
      if (alpha <= 0.004) continue;
      const scale =
        p.size *
        (1 + Math.sin(t * 1.9 + p.phase) * 0.045) *
        (1 + outE * 0.22);
      ctx.globalAlpha = Math.min(0.96, alpha);
      ctx.drawImage(sprites[p.tint], pos.x - scale / 2, pos.y - scale / 2, scale, scale);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }, [duration, fps, frame, inDuration, outDuration, points, sprites]);

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", pointerEvents: "none" }}>
      <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />
    </AbsoluteFill>
  );
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
