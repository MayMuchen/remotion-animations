import React, { useCallback } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Canvas2D } from "./Canvas2D";
import { MONO } from "./fonts";
import { CL, hash, pad } from "./util";
import { SCENES, TOTAL } from "../timeline";

export const BAR = 132; // cinematic letterbox (≈2.39:1)

let grainTile: HTMLCanvasElement | null = null;
const getGrain = () => {
  if (grainTile) return grainTile;
  const s = 384;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const img = g.createImageData(s, s);
  let seed = 1337;
  for (let i = 0; i < s * s; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const v = seed >>> 24;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
};

export const FilmGrain: React.FC<{ readonly opacity?: number }> = ({ opacity = 0.07 }) => {
  const draw = useCallback((ctx: CanvasRenderingContext2D, frame: number, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    const tile = getGrain();
    const ox = Math.floor(hash(frame * 1.31) * 384);
    const oy = Math.floor(hash(frame * 2.77) * 384);
    const pat = ctx.createPattern(tile, "repeat")!;
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pat;
    ctx.fillRect(ox, oy, w, h);
  }, []);
  return <Canvas2D draw={draw} style={{ mixBlendMode: "overlay", opacity }} />;
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.9) 100%)",
      pointerEvents: "none",
    }}
  />
);

// Letterbox bars that double as a HUD strip
export const Letterbox: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const s = frame / fps;
  const tc = `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}:${pad(frame % fps)}`;
  const progress = frame / TOTAL;
  const scenes = Object.entries(SCENES);
  const idx = scenes.findIndex(([, v]) => frame >= v.from && frame < v.from + v.dur);
  const label: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 15,
    letterSpacing: "0.3em",
    color: "rgba(200,220,230,0.45)",
    position: "absolute",
    top: 0,
    lineHeight: `${BAR}px`,
  };
  const appear = interpolate(frame, [0, 20], [0, 1], CL);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR, background: "#000" }}>
        <div style={{ ...label, left: 90, opacity: appear }}>THE DARK FOREST // 黑暗森林法则</div>
        <div style={{ ...label, right: 90, opacity: appear }}>
          SEQ {pad(Math.max(0, idx) + 1)}/{pad(scenes.length)} &nbsp; TC {tc}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BAR, background: "#000" }}>
        <div
          style={{
            position: "absolute",
            left: 90,
            right: 90,
            top: BAR / 2,
            height: 1,
            background: "rgba(255,255,255,0.08)",
            opacity: appear,
          }}
        >
          {scenes.map(([k, v]) => (
            <div
              key={k}
              style={{
                position: "absolute",
                left: `${(v.from / TOTAL) * 100}%`,
                top: -4,
                width: 1,
                height: 9,
                background: "rgba(255,255,255,0.25)",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: -1,
              height: 3,
              width: (width - 180) * progress,
              background: "linear-gradient(90deg, rgba(120,220,255,0.1), rgba(120,220,255,0.8))",
              boxShadow: "0 0 10px rgba(120,220,255,0.8)",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// White flash with chromatic fringe, used on hard cuts
export const CutFlash: React.FC<{ readonly at: readonly number[] }> = ({ at }) => {
  const frame = useCurrentFrame();
  let o = 0;
  for (const a of at) {
    o = Math.max(o, interpolate(frame, [a - 2, a, a + 10], [0, 0.9, 0], CL));
  }
  if (o <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at center, #ffffff 0%, #bfe9ff 40%, rgba(80,40,255,0.4) 100%)",
        opacity: o,
        mixBlendMode: "screen",
      }}
    />
  );
};

// Per-scene HUD corner brackets + caption
export const HudFrame: React.FC<{
  readonly code: string;
  readonly title: string;
  readonly color?: string;
}> = ({ code, title, color = "rgba(140,220,255,0.75)" }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const a = interpolate(frame, [0, 14], [0, 1], CL);
  const L = 36;
  const m = 70;
  const top = BAR + 34;
  const bottom = height - BAR - 34;
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <svg
      style={{ position: "absolute", left: x - (sx < 0 ? L : 0), top: y - (sy < 0 ? L : 0), opacity: a }}
      width={L}
      height={L}
    >
      <path
        d={`M ${sx > 0 ? 0 : L} ${sy > 0 ? L : 0} L ${sx > 0 ? 0 : L} ${sy > 0 ? 0 : L} L ${sx > 0 ? L : 0} ${sy > 0 ? 0 : L}`}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    </svg>
  );
  const blink = Math.floor(frame / 15) % 2 === 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {corner(m, top, 1, 1)}
      {corner(width - m, top, -1, 1)}
      {corner(m, bottom, 1, -1)}
      {corner(width - m, bottom, -1, -1)}
      <div
        style={{
          position: "absolute",
          left: m + 54,
          top: top + 2,
          fontFamily: MONO,
          fontSize: 17,
          letterSpacing: "0.28em",
          color,
          opacity: a,
          display: "flex",
          gap: 18,
          alignItems: "center",
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 9,
            background: blink ? "#ff3b3b" : "transparent",
            boxShadow: blink ? "0 0 10px #ff3b3b" : "none",
            border: "1px solid #ff3b3b",
          }}
        />
        <span>{code}</span>
        <span style={{ opacity: 0.5 }}>|</span>
        <span>{title}</span>
      </div>
    </AbsoluteFill>
  );
};
