import React, { useCallback } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Canvas2D } from "../lib/Canvas2D";
import { MONO, SANS, SERIF } from "../lib/fonts";
import { HudFrame } from "../lib/Overlays";
import { Glitch, ScrambleText } from "../lib/ScrambleText";
import { CL, EASE_OUT, hash, noise1, shakeAt } from "../lib/util";
import { EV } from "../timeline";

const E = EV.cold;

// Oscilloscope / radio-signal background
const drawSignal = (ctx: CanvasRenderingContext2D, frame: number, w: number, h: number) => {
  ctx.fillStyle = "#020406";
  ctx.fillRect(0, 0, w, h);

  // polar radar grid + sweep, very faint
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = "rgba(90,180,220,0.06)";
  ctx.lineWidth = 1;
  for (let r = 120; r < 1100; r += 120) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 1200, cy + Math.sin(a) * 1200);
    ctx.stroke();
  }
  const sweep = frame * 0.035;
  const grd = ctx.createConicGradient(sweep, cx, cy);
  grd.addColorStop(0, "rgba(80,200,255,0.12)");
  grd.addColorStop(0.08, "rgba(80,200,255,0)");
  grd.addColorStop(0.92, "rgba(80,200,255,0)");
  grd.addColorStop(1, "rgba(80,200,255,0.03)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // signal energy: rises while decoding, spikes at slams
  let energy = 0.25 + 0.5 * interpolate(frame, [E.line1, E.line2 + 60], [0, 1], CL);
  for (const s of E.slams) {
    const d = frame - s;
    if (d >= 0) energy += 2.4 * Math.exp(-d / 6);
  }
  energy *= interpolate(frame, [E.tvOff - 6, E.tvOff], [1, 0], CL);

  const baseY = h * 0.73;
  const layers = [
    { c: "rgba(60,200,255,0.18)", wdt: 6 },
    { c: "rgba(140,230,255,0.85)", wdt: 1.6 },
  ];
  for (const L of layers) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const t = x / w;
      const env = Math.sin(Math.PI * t) ** 1.5;
      const y =
        Math.sin(x * 0.021 + frame * 0.4) * 10 +
        Math.sin(x * 0.0063 - frame * 0.13) * 22 +
        (noise1(x * 0.08 + frame * 2.1, 3) - 0.5) * 90 * energy +
        (hash(x * 0.7 + frame) - 0.5) * 26 * energy;
      ctx[x === 0 ? "moveTo" : "lineTo"](x, baseY + y * env * (0.4 + energy));
    }
    ctx.strokeStyle = L.c;
    ctx.lineWidth = L.wdt;
    ctx.shadowColor = "rgba(80,210,255,0.9)";
    ctx.shadowBlur = 12;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // frequency ticks
  ctx.fillStyle = "rgba(140,220,255,0.35)";
  for (let x = 160; x < w - 160; x += 16) {
    const big = (x / 16) % 10 === 0;
    ctx.fillRect(x, baseY + 120, 1, big ? 14 : 6);
  }
};

export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const shake = shakeAt(frame, E.slams, 26, 6);
  const textOut = interpolate(frame, [E.slams[0] - 6, E.slams[0]], [1, 0], CL);
  const glitchIn = Math.max(
    ...E.slams.map((s) => interpolate(frame, [s, s + 3, s + 12], [1, 0.8, 0], CL)),
    interpolate(frame, [E.line2 + 50, E.line2 + 56, E.line2 + 62], [0, 0.6, 0], CL),
  );

  // CRT power-off: collapse to a line, then a dot
  const offY = interpolate(frame, [E.tvOff, E.tvOff + 6], [1, 0.004], { ...CL, easing: EASE_OUT });
  const offX = interpolate(frame, [E.tvOff + 5, E.tvOff + 12], [1, 0.002], CL);
  const offBright = interpolate(frame, [E.tvOff, E.tvOff + 4, E.tvOff + 14], [1, 2.6, 0], CL);

  const draw = useCallback(drawSignal, []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
          scale: `${offX} ${offY}`,
          filter: `brightness(${offBright})`,
          translate: `${shake.x}px ${shake.y}px`,
        }}
      >
        <Canvas2D draw={draw} />
        <HudFrame code="RECV-1379" title="红岸基地 · 监听站 1379 · INCOMING TRANSMISSION" />

        {/* telemetry */}
        <div
          style={{
            position: "absolute",
            right: 130,
            top: 210,
            fontFamily: MONO,
            fontSize: 16,
            lineHeight: 1.9,
            color: "rgba(140,220,255,0.6)",
            textAlign: "right",
            letterSpacing: "0.12em",
          }}
        >
          <div>SRC α-CENTAURI · 4.22 LY</div>
          <div>FREQ 1420.4057 MHz</div>
          <div>SNR {(12 + frame * 0.11 + hash(frame) * 3).toFixed(2)} dB</div>
          <div>PKT {String(Math.floor(frame * 37.3)).padStart(6, "0")} / ∞</div>
        </div>

        {/* decoded message */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 330,
            textAlign: "center",
            fontFamily: SANS,
            fontSize: 54,
            color: "#d9e7ee",
            letterSpacing: "0.12em",
            opacity: textOut,
            lineHeight: 1.9,
          }}
        >
          <Glitch intensity={glitchIn} seed={2}>
            <div>
              <ScrambleText text="这个世界收到了你们的信息。" start={E.line1} speed={4} window={12} />
            </div>
            <div>
              <ScrambleText text="我是这个世界的一个和平主义者——" start={E.line2} speed={3} window={12} seed={9} />
            </div>
          </Glitch>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 18,
              letterSpacing: "0.4em",
              color: "rgba(140,220,255,0.55)",
              marginTop: 24,
              opacity: interpolate(frame, [E.line1, E.line1 + 20], [0, 1], CL),
            }}
          >
            DECODING TRISOLARAN SIGNAL ··· {Math.min(100, Math.floor(frame / 1.7))}%
          </div>
        </div>

        {/* 不要回答 x3 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            paddingBottom: 40,
          }}
        >
          {E.slams.map((s, i) => {
            const vis = frame >= s;
            const sc = interpolate(frame, [s, s + 5], [1.8, 1], { ...CL, easing: EASE_OUT });
            return (
              <Glitch
                key={i}
                intensity={interpolate(frame, [s, s + 10], [1, 0.05], CL)}
                seed={i * 11}
                style={{ opacity: vis ? 1 : 0, scale: String(sc), color: "#ff2b2b" }}
              >
                <div
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 700,
                    fontSize: 104 + i * 26,
                    letterSpacing: "0.18em",
                    textShadow: "0 0 30px rgba(255,30,30,0.8), 0 0 90px rgba(255,0,0,0.5)",
                    lineHeight: 1.12,
                  }}
                >
                  不要回答！
                </div>
              </Glitch>
            );
          })}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 20,
              letterSpacing: "0.6em",
              color: "rgba(255,90,90,0.8)",
              marginTop: 18,
              opacity: frame >= E.slams[2] ? 1 : 0,
            }}
          >
            DO NOT ANSWER · DO NOT ANSWER · DO NOT ANSWER
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
