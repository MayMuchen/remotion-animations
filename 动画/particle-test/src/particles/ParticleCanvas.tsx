import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Particle, PointCloud } from "./sampleImage";
import {
  activeWavesAt,
  beatPulseAt,
} from "./beats";
import {
  clamp01,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  mulberry32,
} from "./random";

const W = 1920;
const H = 1080;
const ASSEMBLE_START = 0.75;
const HOLD_END = 7.0;
const DISPERSE_END = 9.3;
const GLOW_X = W / 2;
const GLOW_Y = H * 0.33;
const WAVE_LIFE = 1.75;
const WAVE_SPEED = 660;

const makeSprite = (core: string, mid: string, tail: string) => {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d");
  if (!g) throw new Error("Could not create sprite");
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, core);
  grad.addColorStop(0.09, mid);
  grad.addColorStop(0.32, tail);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return c;
};

const makeMotes = () => {
  const rnd = mulberry32(778811);
  return Array.from({ length: 240 }, () => ({
    x: rnd() * W,
    y: rnd() * H,
    size: 2 + rnd() * 5,
    alpha: 0.04 + rnd() * 0.1,
    phase: rnd() * Math.PI * 2,
    speed: 2 + rnd() * 9,
    tint: rnd() < 0.7 ? 0 : 3,
  }));
};

export const ParticleCanvas: React.FC<{ cloud: PointCloud }> = ({ cloud }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const sprites = useMemo(
    () => [
      makeSprite(
        "rgba(255,250,242,1)",
        "rgba(255,230,195,0.95)",
        "rgba(255,190,140,0.14)",
      ),
      makeSprite(
        "rgba(255,226,186,1)",
        "rgba(255,186,120,0.9)",
        "rgba(255,150,90,0.13)",
      ),
      makeSprite(
        "rgba(255,204,150,1)",
        "rgba(255,160,92,0.85)",
        "rgba(255,130,70,0.12)",
      ),
      makeSprite(
        "rgba(206,240,235,0.9)",
        "rgba(150,206,200,0.6)",
        "rgba(90,150,150,0.08)",
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const ox = cloud.origin.x;
    const oy = cloud.origin.y;
    const cx = W / 2;
    const cy = H / 2;

    const cameraProgress = easeInOutCubic(clamp01((t - 1.4) / 5.2));
    const holdZoom = 1 + 0.052 * cameraProgress + 0.007 * Math.sin(t * 1.05);
    const cameraX = Math.sin(t * 0.19) * 8 + Math.sin(t * 0.51) * 2.5;
    const cameraY = Math.cos(t * 0.16) * 5 + Math.sin(t * 0.37) * 2;
    const holdT = Math.min(t, HOLD_END);
    const pulse = beatPulseAt(t);
    const activeWaves = activeWavesAt(t, WAVE_LIFE);
    const waveMix = easeInOutCubic(clamp01((t - 6.75) / 0.9));
    const waveOriginX = ox + (GLOW_X - ox) * waveMix;
    const waveOriginY = oy + (GLOW_Y - oy) * waveMix;

    const waveAt = (x: number, y: number, time: number) => {
      if (activeWaves.length === 0) return 0;
      const distance = Math.hypot(x - waveOriginX, y - waveOriginY);
      let energy = 0;
      for (const wave of activeWaves) {
        const radius = 24 + wave.age * WAVE_SPEED;
        const bandWidth = 62 + wave.age * 34;
        const band = Math.exp(-Math.pow((distance - radius) / bandWidth, 2));
        const fade = Math.pow(1 - wave.age / WAVE_LIFE, 1.25);
        energy = Math.max(energy, band * fade * wave.strength);
      }
      return energy * Math.min(1, time * 2.5);
    };

    const holdPos = (p: Particle) => {
      const start = ASSEMBLE_START + p.delay * 0.85;
      const progress = clamp01((holdT - start) / 1.25);
      const e = easeOutCubic(progress);
      const nx = p.tx - ox;
      const ny = p.ty - oy;
      const len = Math.hypot(nx, ny) || 1;
      const arc = Math.sin(e * Math.PI);
      const cloudRadius = (1 - e) * 11;
      const baseX = ox + nx * e + (-ny / len) * p.swirl * arc;
      const baseY = oy + ny * e + (nx / len) * p.swirl * arc;

      // Slow individual drift keeps the cloud alive between kicks.
      const driftX =
        Math.sin(holdT * 0.54 + p.phase) * (0.45 + p.z * 0.95) +
        Math.sin(holdT * 1.31 + p.phase * 0.63) * 0.38;
      const driftY =
        Math.cos(holdT * 0.47 + p.phase * 1.13) * (0.5 + p.z * 0.9) +
        Math.cos(holdT * 1.17 + p.phase * 0.71) * 0.34;

      // The kick is a whole-body shudder; the expanding wave locally lifts the
      // particles it passes through like a soft pressure front.
      const localWave = waveAt(baseX, baseY, holdT);
      const kickX = Math.cos(p.phase) * pulse * (0.8 + p.z * 1.6);
      const kickY = Math.sin(p.phase) * pulse * (0.8 + p.z * 1.6);
      const waveX =
        Math.cos(p.phase + 0.45) * localWave * (2.1 + p.z * 1.5);
      const waveY =
        Math.sin(p.phase + 0.45) * localWave * (2.1 + p.z * 1.5);

      const x =
        baseX +
        Math.cos(p.phase) * cloudRadius +
        driftX +
        kickX +
        waveX;
      const y =
        baseY +
        Math.sin(p.phase) * cloudRadius +
        driftY +
        kickY +
        waveY;
      return {
        x: cx + (x - cx) * holdZoom + cameraX,
        y: cy + (y - cy) * holdZoom + cameraY,
        a:
          p.alpha *
          (0.1 + 0.9 * e) *
          (1 + pulse * 0.075 + localWave * 0.17),
        energy: pulse * 0.55 + localWave,
      };
    };

    for (const p of cloud.points) {
      let x: number;
      let y: number;
      let alpha: number;
      let energy = pulse * 0.35;

      if (t <= HOLD_END) {
        const hp = holdPos(p);
        x = hp.x;
        y = hp.y;
        alpha = hp.a;
        energy += hp.energy * 0.65;
      } else {
        const hp = holdPos(p);
        const q = clamp01((t - HOLD_END) / (DISPERSE_END - HOLD_END));
        const e = easeInCubic(q);
        const liveWave = waveAt(hp.x, hp.y, t) * (1 - q * 0.4);
        const scatterJitter =
          (pulse * 1.2 + liveWave * 4.2) * (1 - q * 0.6);
        if (p.linger) {
          x =
            hp.x +
            Math.sin(t * 0.7 + p.phase) * 7 +
            Math.cos(p.phase) * scatterJitter;
          y = hp.y - q * 120 + Math.sin(p.phase) * scatterJitter;
          alpha = hp.a * (1 - q) * 0.55;
        } else {
          x =
            hp.x +
            (GLOW_X - hp.x) * e +
            Math.sin(q * Math.PI) * p.swirl * 0.75 +
            Math.cos(p.phase) * scatterJitter;
          y =
            hp.y +
            (GLOW_Y - hp.y) * e +
            Math.cos(q * Math.PI) * p.swirl * 0.55 +
            Math.sin(p.phase) * scatterJitter;
          alpha = hp.a * Math.pow(1 - q, 1.35);
        }
        energy += liveWave * 0.65;
      }

      if (alpha <= 0.002) continue;

      const fadeScale =
        t > HOLD_END ? 0.72 + 0.28 * (1 - clamp01((t - HOLD_END) / 2)) : 1;
      const s = p.size * fadeScale * (1 + energy * 0.075);
      ctx.globalAlpha = Math.min(0.96, alpha * (1 + energy * 0.05));
      ctx.drawImage(sprites[p.tint], x - s / 2, y - s / 2, s, s);
    }

    // Ambient dust that never joins the form.
    const moteFade = clamp01(t / 0.8) * (1 - clamp01((t - 9.3) / 0.7) * 0.5);
    for (const m of motes) {
      const x =
        m.x +
        Math.sin(t * 0.22 + m.phase) * m.speed +
        Math.cos(m.phase) * pulse * 1.1;
      const y =
        m.y -
        ((t * m.speed) % 90) +
        Math.cos(t * 0.17 + m.phase) * 4 +
        Math.sin(m.phase) * pulse * 0.9;
      ctx.globalAlpha = m.alpha * moteFade;
      ctx.drawImage(sprites[m.tint], x, y, m.size, m.size);
    }

    // Light the particles are born from.
    const birthA =
      clamp01(t / 0.45) * (1 - clamp01((t - 1.5) / 1.15));
    if (birthA > 0.001) {
      const radius = 120 + 190 * clamp01(t / 2.6) + pulse * 24;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
      g.addColorStop(0, `rgba(255,238,210,${(0.5 + pulse * 0.1) * birthA})`);
      g.addColorStop(0.18, `rgba(255,196,140,${(0.22 + pulse * 0.05) * birthA})`);
      g.addColorStop(1, "rgba(255,150,90,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(ox - radius, oy - radius, radius * 2, radius * 2);
    }

    // Afterglow where everything returns to.
    if (t > 7.4) {
      const q = clamp01((t - 7.4) / 2.3);
      const radius = 26 + 110 * Math.sin(q * Math.PI * 0.75) + pulse * 15;
      const a = Math.sin(q * Math.PI) * 0.55 + (1 - q) * 0.02;
      const g = ctx.createRadialGradient(GLOW_X, GLOW_Y, 0, GLOW_X, GLOW_Y, radius);
      g.addColorStop(0, `rgba(255,240,214,${Math.min(0.8, 0.6 * a + pulse * 0.025)})`);
      g.addColorStop(0.25, `rgba(255,198,144,${0.28 * a + pulse * 0.012})`);
      g.addColorStop(1, "rgba(255,150,90,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(GLOW_X - radius, GLOW_Y - radius, radius * 2, radius * 2);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }, [cloud, fps, frame, motes, sprites]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
};

