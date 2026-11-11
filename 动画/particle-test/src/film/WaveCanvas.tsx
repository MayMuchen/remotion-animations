import React, { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { activeFilmWavesAt } from "./filmBeats";
import { GLOW, H, W } from "./ShotCanvas";

const WAVE_LIFE = 1.75;
const WAVE_SPEED = 640;

type WaveCanvasProps = {
  timeOffset: number;
  intensity?: number;
};

export const WaveCanvas: React.FC<WaveCanvasProps> = ({
  timeOffset,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t = timeOffset + frame / fps;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    for (const wave of activeFilmWavesAt(t, WAVE_LIFE)) {
      const fade =
        Math.min(1, wave.age / 0.04) *
        Math.pow(1 - wave.age / WAVE_LIFE, 1.2);
      const baseRadius = 20 + wave.age * WAVE_SPEED;
      const strokeAlpha =
        fade * wave.strength * (wave.accent ? 0.095 : 0.045) * intensity;

      for (let ring = 0; ring < 3; ring++) {
        const radius = baseRadius - ring * 11;
        if (radius <= 4) continue;
        const alpha = strokeAlpha / (1 + ring * 1.7);
        ctx.beginPath();
        for (let segment = 0; segment <= 96; segment++) {
          const angle = (segment / 96) * Math.PI * 2;
          const wobble =
            1 +
            0.0085 * Math.sin(angle * 7 + wave.index * 1.3 + wave.age * 3.1) +
            0.0038 * Math.sin(angle * 13 - wave.age * 2.1);
          const x = GLOW.x + Math.cos(angle) * radius * wobble;
          const y = GLOW.y + Math.sin(angle) * radius * wobble * 0.965;
          if (segment === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,218,174,${alpha})`;
        ctx.lineWidth = 1.05 + wave.strength * (0.85 - ring * 0.2);
        ctx.shadowBlur = wave.accent ? 14 : 8;
        ctx.shadowColor = `rgba(255,176,112,${alpha * 1.3})`;
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
  }, [fps, frame, intensity, timeOffset]);

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
        opacity: 0.85,
      }}
    />
  );
};
