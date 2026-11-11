import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { mulberry32 } from '../particles/random';
import { KINETIC_CUTS, KINETIC_SCENES, KINETIC_THROUGH_START } from './story-v4';

const TAU = Math.PI * 2;

// Optical overlays are authored on a transparent canvas, above pictures and
// below type. Randomness is seeded; seeking and rendering give identical frames.
export const KineticFX: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: w, height: h } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const stars = useMemo(() => {
    const rnd = mulberry32(5112026);
    return Array.from({ length: 300 }, () => ({ a: rnd() * TAU, z: rnd(), r: rnd(), speed: 0.5 + rnd(), size: 0.5 + rnd() * 2 }));
  }, []);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const t = frame / fps;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const scene = KINETIC_SCENES.find(s => t >= s.start && t < s.start + s.duration) ?? KINETIC_SCENES[0];
    const cool = scene.tone === 'cool';
    const rgb = cool ? '125,225,255' : '255,186,105';
    const cx = w * 0.5, cy = h * 0.445;
    const beat = Math.exp(-((t * 2) % 1) * 8);

    // Floating foreground sparks and fine curved exposure trails.
    for (let i = 0; i < 95; i++) {
      const s = stars[i];
      const x = ((s.r * w + t * (12 + s.z * 45)) % (w + 100)) - 50;
      const y = h * 0.12 + ((s.z * h * 0.7 - t * s.speed * 9) % (h * 0.7) + h * 0.7) % (h * 0.7);
      ctx.fillStyle = `rgba(${rgb},${0.08 + 0.12 * s.r})`;
      ctx.fillRect(x, y, s.size, s.size);
    }

    const closest = KINETIC_CUTS.reduce((a, b) => Math.abs(t - b) < Math.abs(t - a) ? b : a, KINETIC_CUTS[0]);
    const d = t - closest;
    const cutIndex = KINETIC_CUTS.indexOf(closest);
    const active = Math.abs(d) < 0.43;
    const through = t - KINETIC_THROUGH_START;
    const tunnel = through > 0 && through < 1.9 ? Math.sin(through / 1.9 * Math.PI) : 0;
    const burst = active ? Math.pow(1 - Math.abs(d) / 0.43, 1.5) : 0;
    const power = Math.max(burst, tunnel * 0.85);

    if (power > 0.005) {
      const p = active ? (d + 0.43) / 0.86 : through / 1.9;
      const mode = cutIndex % 4;
      ctx.lineCap = 'round';
      // Perspective star tunnel: streaks grow toward the edges, never cover
      // the centre with a solid plate. Alternate gold and ice-blue rays.
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const a = s.a + t * 0.12 + (mode === 1 ? p * 1.1 : 0);
        const radius = 70 + ((s.z + p * s.speed) % 1) ** 2 * 1200;
        const len = (20 + s.r * 180) * power * (radius / 600);
        const x = cx + Math.cos(a) * radius, y = cy + Math.sin(a) * radius * 0.68;
        const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.68);
        g.addColorStop(0, `rgba(${i % 5 === 0 ? '125,225,255' : rgb},0)`);
        g.addColorStop(1, `rgba(${i % 5 === 0 ? '175,237,255' : rgb},${power * (0.2 + s.r * 0.65)})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = s.size * (0.7 + power);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.68); ctx.stroke();
      }

      // Elliptical event horizons, skewed in perspective with chromatic rims.
      if (mode === 0 || mode === 1 || tunnel > 0) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((mode === 1 ? -0.42 : 0.22) + p * 0.35);
        for (let k = 0; k < 5; k++) {
          const radius = 70 + k * 38 + p * p * 1250;
          ctx.strokeStyle = `rgba(${k % 2 ? '140,223,255' : '255,215,159'},${power * (0.7 - k * 0.1)})`;
          ctx.lineWidth = k === 0 ? 3.2 : 1;
          ctx.beginPath(); ctx.ellipse(0, 0, radius, radius * (0.38 + k * 0.045), 0, t + k * 0.2, t + k * 0.2 + 5.5); ctx.stroke();
        }
        ctx.restore();
      }

      // Anamorphic flare / diagonal light blade, limited to each cut.
      if (active) {
        const x = w * (0.1 + p * 0.8);
        const flare = ctx.createRadialGradient(x, cy, 0, x, cy, 390);
        flare.addColorStop(0, `rgba(255,242,214,${burst * 0.45})`);
        flare.addColorStop(0.12, `rgba(${rgb},${burst * 0.22})`);
        flare.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = flare; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.translate(x, cy); ctx.scale(1, 0.012 + power * 0.009);
        const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.7);
        streak.addColorStop(0, `rgba(255,250,230,${burst * 0.8})`);
        streak.addColorStop(0.3, `rgba(${rgb},${burst * 0.4})`);
        streak.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = streak; ctx.fillRect(-w, -h, w * 2, h * 2); ctx.restore();
        if (mode === 2) {
          ctx.save(); ctx.translate(-300 + p * (w + 600), h / 2); ctx.rotate(-0.35);
          const blade = ctx.createLinearGradient(-100, 0, 100, 0);
          blade.addColorStop(0, `rgba(${rgb},0)`); blade.addColorStop(0.5, `rgba(${rgb},${burst * 0.45})`); blade.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = blade; ctx.fillRect(-100, -h, 200, h * 2); ctx.restore();
        }
      }
    }
    // Small bass breathing in the optical corner, leaving subjects readable.
    const glow = ctx.createRadialGradient(w * 0.85, h * 0.2, 0, w * 0.85, h * 0.2, w * 0.38);
    glow.addColorStop(0, `rgba(${rgb},${0.035 + beat * 0.035})`); glow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }, [frame, fps, w, h, stars]);

  return <canvas ref={ref} width={w} height={h} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};
