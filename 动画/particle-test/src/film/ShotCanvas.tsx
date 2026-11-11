import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { activeFilmWavesAt, filmPulseAt } from "./filmBeats";
import type { FilmCloud, FilmParticle } from "./pointcloud";
import {
  clamp01,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  mulberry32,
} from "../particles/random";
import type { Motion, Tone } from "./story";

export const W = 1920;
export const H = 1080;
export const GLOW = { x: W * 0.5, y: H * 0.335 };
const WAVE_LIFE = 1.75;
const WAVE_SPEED = 640;

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

const makeMotes = () => {
  const rnd = mulberry32(778811);
  return Array.from({ length: 190 }, () => ({
    x: rnd() * W,
    y: rnd() * H,
    size: 1.8 + rnd() * 4.6,
    alpha: 0.035 + rnd() * 0.09,
    phase: rnd() * Math.PI * 2,
    speed: 2 + rnd() * 8,
    tint: rnd() < 0.72 ? 0 : 3,
  }));
};

type ShotCanvasProps = {
  cloud: FilmCloud;
  duration: number;
  timeOffset: number;
  motion: Motion;
  tone: Tone;
};

export const ShotCanvas: React.FC<ShotCanvasProps> = ({
  cloud,
  duration,
  timeOffset,
  motion,
  tone,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const sprites = useMemo(
    () => [
      makeSprite(
        "rgba(255,250,242,1)",
        "rgba(255,232,199,0.96)",
        "rgba(255,192,142,0.15)",
      ),
      makeSprite(
        "rgba(255,228,190,1)",
        "rgba(255,188,124,0.92)",
        "rgba(255,152,92,0.14)",
      ),
      makeSprite(
        "rgba(255,206,154,1)",
        "rgba(255,162,96,0.88)",
        "rgba(255,132,72,0.12)",
      ),
      makeSprite(
        "rgba(212,242,238,0.92)",
        "rgba(156,210,204,0.62)",
        "rgba(96,156,156,0.09)",
      ),
    ],
    [],
  );
  const motes = useMemo(makeMotes, []);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t = frame / fps;
    const globalT = timeOffset + t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const dissolveDur = Math.min(1.55, duration * 0.28);
    const holdEnd = Math.max(1.9, duration - dissolveDur);
    const pulse = filmPulseAt(globalT);
    const waves = activeFilmWavesAt(globalT, WAVE_LIFE);

    const waveAt = (x: number, y: number) => {
      if (waves.length === 0) return 0;
      const dx = x - GLOW.x;
      const dy = y - GLOW.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      let energy = 0;
      for (const wave of waves) {
        const radius = 20 + wave.age * WAVE_SPEED;
        const bandWidth = 58 + wave.age * 30;
        const d = (distance - radius) / bandWidth;
        const band = Math.exp(-d * d);
        const fade = Math.pow(1 - wave.age / WAVE_LIFE, 1.25);
        energy = Math.max(energy, band * fade * wave.strength);
      }
      return energy;
    };

    const camP = easeInOutCubic(clamp01(t / Math.max(0.1, duration * 0.95)));
    const zoom =
      motion === "push"
        ? 1 + 0.058 * camP
        : motion === "pull"
          ? 1.068 - 0.06 * camP
          : 1 + 0.024 * camP;
    const panX =
      motion === "left"
        ? -18 + 36 * camP
        : motion === "right"
          ? 18 - 36 * camP
          : 0;
    const camX = panX + Math.sin(globalT * 0.19) * 6 + Math.sin(globalT * 0.53) * 2;
    const camY = Math.cos(globalT * 0.16) * 4 + Math.sin(globalT * 0.37) * 1.6;
    const cx = W / 2;
    const cy = H / 2;
    const coolShift = tone === "cool" ? -0.06 : 0;

    const drawParticle = (p: FilmParticle) => {
      const start = 0.12 + p.delay * 0.92;
      const e = easeOutCubic(clamp01((t - start) / 1.42));
      const nx = p.tx - GLOW.x;
      const ny = p.ty - GLOW.y;
      const len = Math.hypot(nx, ny) || 1;
      const arc = Math.sin(e * Math.PI) * p.swirl;
      const radius = (1 - e) * 10;

      let x = GLOW.x + nx * e + (-ny / len) * arc;
      let y = GLOW.y + ny * e + (nx / len) * arc;
      x += Math.cos(p.phase) * radius;
      y += Math.sin(p.phase) * radius;

      const held = Math.min(t, holdEnd);
      const driftX =
        Math.sin(held * 0.52 + p.phase) * (0.45 + p.z * 0.95) +
        Math.sin(held * 1.27 + p.phase * 0.63) * 0.38;
      const driftY =
        Math.cos(held * 0.45 + p.phase * 1.13) * (0.5 + p.z * 0.9) +
        Math.cos(held * 1.13 + p.phase * 0.71) * 0.34;
      x += driftX;
      y += driftY;

      let localWave = 0;
      if (t > 1.1) {
        localWave = waveAt(x, y) * Math.min(1, (t - 1.1) * 2.2);
        x += Math.cos(p.phase + 0.45) * localWave * (2.2 + p.z * 1.6);
        y += Math.sin(p.phase + 0.45) * localWave * (2.2 + p.z * 1.6);
      }

      const kick = pulse * (0.7 + p.z * 1.5);
      x += Math.cos(p.phase) * kick;
      y += Math.sin(p.phase) * kick;

      let alpha = p.alpha * (0.06 + 0.94 * e);
      alpha *= 1 + pulse * 0.09 + localWave * 0.2 + coolShift;

      if (t > holdEnd) {
        const q = easeInCubic(clamp01((t - holdEnd) / dissolveDur));
        const scatter = (pulse * 1.1 + localWave * 3.6) * (1 - q * 0.65);
        if (p.linger) {
          x += Math.sin(t * 0.7 + p.phase) * 7 + Math.cos(p.phase) * scatter;
          y -= q * 96;
          alpha *= (1 - q) * 0.5;
        } else {
          x += (GLOW.x - x) * q + Math.sin(q * Math.PI) * p.swirl * 0.7;
          y += (GLOW.y - y) * q + Math.cos(q * Math.PI) * p.swirl * 0.5;
          alpha *= Math.pow(1 - q, 1.3);
        }
      }

      if (alpha <= 0.002) return;

      x = cx + (x - cx) * zoom + camX;
      y = cy + (y - cy) * zoom + camY;

      // Protect the subtitle band without flattening the whole lower frame.
      const protect = 1 - 0.34 * clamp01((y / H - 0.775) / 0.225);
      const s = p.size * (t > holdEnd ? 0.82 : 1) * (1 + (pulse + localWave) * 0.07);
      ctx.globalAlpha = Math.min(0.97, alpha * protect);
      ctx.drawImage(sprites[p.tint], x - s / 2, y - s / 2, s, s);
    };

    for (const p of cloud.points) drawParticle(p);

    const moteFade = clamp01(t / 0.7);
    for (const m of motes) {
      const x =
        m.x +
        Math.sin(t * 0.2 + m.phase) * m.speed +
        Math.cos(m.phase) * pulse * 1.1;
      const y =
        m.y -
        ((t * m.speed) % 90) +
        Math.cos(t * 0.16 + m.phase) * 4 +
        Math.sin(m.phase) * pulse * 0.9;
      ctx.globalAlpha = m.alpha * moteFade;
      ctx.drawImage(sprites[m.tint], x, y, m.size, m.size);
    }

    // Birth bloom.
    const birthA = clamp01(t / 0.4) * (1 - clamp01((t - 0.85) / 1.35));
    if (birthA > 0.001) {
      const radius = 110 + 210 * clamp01(t / 2.4) + pulse * 26;
      const g = ctx.createRadialGradient(GLOW.x, GLOW.y, 0, GLOW.x, GLOW.y, radius);
      g.addColorStop(0, `rgba(255,240,214,${(0.5 + pulse * 0.12) * birthA})`);
      g.addColorStop(0.16, `rgba(255,198,144,${(0.22 + pulse * 0.05) * birthA})`);
      g.addColorStop(1, "rgba(255,150,90,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(GLOW.x - radius, GLOW.y - radius, radius * 2, radius * 2);
    }

    // Afterglow where the form returns to light.
    if (t > holdEnd - 0.4) {
      const q = clamp01((t - (holdEnd - 0.4)) / (dissolveDur + 0.4));
      const radius = 24 + 130 * Math.sin(q * Math.PI * 0.72) + pulse * 16;
      const a = Math.sin(q * Math.PI) * 0.62;
      const g = ctx.createRadialGradient(GLOW.x, GLOW.y, 0, GLOW.x, GLOW.y, radius);
      g.addColorStop(0, `rgba(255,242,218,${Math.min(0.85, 0.62 * a + pulse * 0.03)})`);
      g.addColorStop(0.24, `rgba(255,200,148,${0.3 * a + pulse * 0.012})`);
      g.addColorStop(1, "rgba(255,150,90,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(GLOW.x - radius, GLOW.y - radius, radius * 2, radius * 2);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }, [cloud, duration, fps, frame, motion, motes, sprites, timeOffset, tone]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
};
