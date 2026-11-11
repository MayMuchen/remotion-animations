import React from "react";
import { useCurrentFrame } from "remotion";
import { hash } from "./util";

const GLYPHS =
  "░▒▓█▚▞▖▗01ΣΔΛΞΨΩ#%&@$<>/\\|=+*黑暗森林宇宙文明猜疑链光粒坐标信号公理猎人";

// Characters decode from random glyphs into the final text, one by one.
export const ScrambleText: React.FC<{
  readonly text: string;
  readonly start: number;
  readonly speed?: number; // frames per char
  readonly window?: number; // frames of scrambling before each char resolves
  readonly accent?: string;
  readonly style?: React.CSSProperties;
  readonly seed?: number;
}> = ({ text, start, speed = 2, window = 10, accent = "#7fdcff", style, seed = 0 }) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {chars.map((ch, i) => {
        const r = start + i * speed + window;
        if (ch === " ") return <span key={i}> </span>;
        if (frame < r - window) {
          return (
            <span key={i} style={{ opacity: 0 }}>
              {ch}
            </span>
          );
        }
        if (frame < r) {
          const g = GLYPHS[Math.floor(hash(i * 13.7 + Math.floor(frame / 2) * 3.1 + seed) * GLYPHS.length)];
          return (
            <span key={i} style={{ color: accent, textShadow: `0 0 18px ${accent}` }}>
              <span style={{ display: "inline-block", width: 0, overflow: "visible" }}>{g}</span>
              <span style={{ opacity: 0 }}>{ch}</span>
            </span>
          );
        }
        return <span key={i}>{ch}</span>;
      })}
    </span>
  );
};

// RGB-split glitch around any text. intensity 0..1
export const Glitch: React.FC<{
  readonly children: React.ReactNode;
  readonly intensity: number;
  readonly seed?: number;
  readonly style?: React.CSSProperties;
}> = ({ children, intensity, seed = 0, style }) => {
  const frame = useCurrentFrame();
  const k = intensity;
  const dx = (hash(frame * 1.7 + seed) - 0.5) * 60 * k;
  const dy = (hash(frame * 2.3 + seed + 5) - 0.5) * 10 * k;
  const s1 = hash(frame * 3.1 + seed) * 100;
  const s2 = Math.min(100, s1 + 6 + hash(frame * 5.7 + seed) * 30);
  const layer = (color: string, ox: number, oy: number, clip: string): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    color,
    translate: `${ox}px ${oy}px`,
    mixBlendMode: "screen",
    clipPath: clip,
    opacity: k > 0.01 ? 1 : 0,
  });
  return (
    <div style={{ position: "relative", ...style }}>
      <div>{children}</div>
      <div style={layer("#ff2a3a", dx, dy, `inset(${s1}% 0 ${100 - s2}% 0)`)}>{children}</div>
      <div style={layer("#21f0ff", -dx * 0.7, -dy, "inset(0 0 0 0)")}>{children}</div>
    </div>
  );
};
