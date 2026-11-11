import React, { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { activeWavesAt } from "./beats";
import { clamp01, easeInOutCubic } from "./random";

const W = 1920;
const H = 1080;
const WAVE_LIFE = 1.75;
const WAVE_SPEED = 660;
const GLOW_X = W / 2;
const GLOW_Y = H * 0.33;

type SoundwaveCanvasProps = {
  origin: { x: number; y: number };
};

export const SoundwaveCanvas: React.FC<SoundwaveCanvasProps> = ({ origin }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t = frame / fps;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const mix = easeInOutCubic(clamp01((t - 6.75) / 0.9));
    const centerX = origin.x + (GLOW_X - origin.x) * mix;
    const centerY = origin.y + (GLOW_Y - origin.y) * mix;
    const waves = activeWavesAt(t, WAVE_LIFE);

    for (const wave of waves) {
      const fade =
        Math.min(1, wave.age / 0.035) *
        Math.pow(1 - wave.age / WAVE_LIFE, 1.2);
      const baseRadius = 24 + wave.age * WAVE_SPEED;
      const strokeAlpha = fade * wave.strength * (wave.accent ? 0.105 : 0.052);

      for (let ring = 0; ring < 3; ring++) {
        const radius = baseRadius - ring * 12;
        if (radius <= 4) continue;
        const alpha = strokeAlpha / (1 + ring * 1.65);
        ctx.beginPath();
        for (let segment = 0; segment <= 88; segment++) {
          const angle = (segment / 88) * Math.PI * 2;
          const wobble =
            1 +
            0.009 * Math.sin(angle * 7 + wave.index * 1.3 + wave.age * 3.2) +
            0.004 * Math.sin(angle * 13 - wave.age * 2.1);
          const x = centerX + Math.cos(angle) * radius * wobble;
          const y = centerY + Math.sin(angle) * radius * wobble * 0.965;
          if (segment === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,216,172,${alpha})`;
        ctx.lineWidth = 1.1 + wave.strength * (0.9 - ring * 0.22);
        ctx.shadowBlur = wave.accent ? 15 : 9;
        ctx.shadowColor = `rgba(255,174,110,${alpha * 1.4})`;
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
  }, [fps, frame, origin]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        mixBlendMode: "screen",
        opacity: 0.9,
      }}
    />
  );
};
