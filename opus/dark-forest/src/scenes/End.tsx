import React, { useCallback } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Canvas2D } from "../lib/Canvas2D";
import { MONO, SANS, SERIF } from "../lib/fonts";
import { ScrambleText } from "../lib/ScrambleText";
import { CL, EASE_OUT, mulberry32 } from "../lib/util";
import { EV } from "../timeline";

const E = EV.end;

const drawStars = (ctx: CanvasRenderingContext2D, f: number, w: number, h: number) => {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const r = mulberry32(31);
  for (let i = 0; i < 1400; i++) {
    const z = 0.2 + r() * 0.8;
    const x = (r() * w + f * 0.25 * z) % w;
    const y = r() * h;
    const b = r();
    const tw = 0.6 + 0.4 * Math.sin(f * 0.07 * (1 + b * 3) + i);
    ctx.fillStyle = `rgba(210,225,255,${(0.04 + b * b * 0.45) * tw})`;
    const s = b > 0.985 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
};

export const End: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = useCallback(drawStars, []);
  const q1 = interpolate(frame, [E.quote, E.quote + 24], [0, 1], { ...CL, easing: EASE_OUT });
  const q2 = interpolate(frame, [E.quote + 46, E.quote + 70], [0, 1], { ...CL, easing: EASE_OUT });
  const qOut = interpolate(frame, [E.answer - 24, E.answer - 4], [1, 0], CL);
  const ans = Array.from("不要回答。");
  const typed = Math.max(0, Math.floor((frame - E.answer - 10) / 7));
  const cursor = Math.floor(frame / 14) % 2 === 0;
  const finalOut = interpolate(frame, [270, 298], [1, 0], CL);
  return (
    <AbsoluteFill style={{ opacity: finalOut }}>
      <Canvas2D draw={draw} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: qOut }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 70, color: "#f3f6fb", letterSpacing: "0.12em", textAlign: "center", lineHeight: 1.6 }}>
          <div style={{ opacity: q1, filter: `blur(${(1 - q1) * 12}px)` }}>弱小和无知不是生存的障碍，</div>
          <div style={{ opacity: q2, filter: `blur(${(1 - q2) * 12}px)`, color: "#ffd2a0", textShadow: "0 0 30px rgba(255,170,90,0.45)" }}>
            傲慢才是。
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.3em", color: "rgba(210,220,235,0.55)", marginTop: 34 }}>
          <ScrambleText text="WEAKNESS AND IGNORANCE ARE NOT BARRIERS TO SURVIVAL, BUT ARROGANCE IS." start={E.quote + 60} speed={0.6} window={5} />
        </div>
      </AbsoluteFill>

      {frame >= E.answer && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontFamily: SANS, fontSize: 46, color: "#e8eef5", letterSpacing: "0.5em", marginRight: "-0.5em" }}>
            {ans.slice(0, typed).join("")}
            <span style={{ opacity: cursor ? 1 : 0, color: "#7fdcff" }}>▍</span>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 190,
              fontFamily: MONO,
              fontSize: 15,
              letterSpacing: "0.4em",
              color: "rgba(200,210,225,0.45)",
              opacity: interpolate(frame, [E.answer + 60, E.answer + 80], [0, 1], CL),
              textAlign: "center",
              lineHeight: 2,
            }}
          >
            <div>黑暗森林法则 · THE DARK FOREST</div>
            <div>灵感来源 · 刘慈欣《三体Ⅱ · 黑暗森林》 · AFTER LIU CIXIN</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
