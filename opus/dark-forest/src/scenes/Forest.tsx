import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { MONO, SERIF } from "../lib/fonts";
import { NebulaQuad, useNebulaMaterial } from "../lib/Nebula";
import { HudFrame } from "../lib/Overlays";
import { Glitch, ScrambleText } from "../lib/ScrambleText";
import { CameraRig, makeStarField, usePixelRatio, usePointMaterial } from "../lib/three";
import { CL, EASE_OUT, noise1, shakeAt } from "../lib/util";
import { EV } from "../timeline";

const E = EV.forest;

const LINES = [
  { zh: "宇宙就是一座黑暗森林", en: "THE UNIVERSE IS A DARK FOREST." },
  { zh: "每个文明都是带枪的猎人", en: "EVERY CIVILIZATION IS AN ARMED HUNTER," },
  { zh: "像幽灵般潜行于林间，轻轻拨开挡路的树枝", en: "STALKING THROUGH THE TREES LIKE A GHOST." },
  { zh: "他必须小心，因为林中到处都有与他一样潜行的猎人", en: "EVERYWHERE IN THE FOREST ARE OTHER HUNTERS LIKE HIM." },
  { zh: "如果他发现了别的生命，能做的只有一件事——", en: "IF HE FINDS OTHER LIFE, THERE IS ONLY ONE THING HE CAN DO:" },
];

const TARGETS = [
  { x: 1380, y: 330, t: 120, id: "TGT-0x3F2A", d: "2.31 LY" },
  { x: 520, y: 410, t: 170, id: "TGT-0x91C0", d: "11.7 LY" },
  { x: 1620, y: 620, t: 220, id: "TGT-0x0B77", d: "6.02 LY" },
  { x: 330, y: 640, t: 260, id: "TGT-0xE41D", d: "19.4 LY" },
  { x: 1120, y: 560, t: 300, id: "TGT-0x5A5A", d: "0.83 LY" },
];
const MAIN = { x: 960, y: 450 };

const Space: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const field = useMemo(() => makeStarField(14000, 420, 140, 21), []);
  const mat = usePointMaterial({ twinkle: 0.5, scale: 120 });
  const neb = useNebulaMaterial("#06322c", "#2a7f86");
  usePixelRatio(mat);
  const t = frame / fps;
  mat.uniforms.uTime.value = t;
  neb.uniforms.uTime.value = t;
  neb.uniforms.uOffset.value.set(t * 0.03, -t * 0.01);
  neb.uniforms.uIntensity.value =
    interpolate(frame, [0, 40], [0, 1.6], CL) * (1 + (frame >= E.shot ? Math.exp(-(frame - E.shot) / 8) * 2.5 : 0));
  const z = -t * 3.2;
  return (
    <>
      <CameraRig
        position={[Math.sin(t * 0.3) * 2, Math.cos(t * 0.23) * 1.2, z]}
        lookAt={[Math.sin(t * 0.3) * 1.5, 0, z - 50]}
        fov={58}
        roll={Math.sin(t * 0.2) * 0.05}
      />
      <NebulaQuad material={neb} />
      <points geometry={field} material={mat} />
    </>
  );
};

const Reticle: React.FC<{ x: number; y: number; t: number; id: string; d: string; main?: boolean }> = ({ x, y, t, id, d, main }) => {
  const frame = useCurrentFrame();
  const age = frame - t;
  if (age < 0) return null;
  const lock = interpolate(age, [0, 18], [0, 1], { ...CL, easing: EASE_OUT });
  const size = interpolate(lock, [0, 1], [main ? 420 : 200, main ? 120 : 54]);
  const rot = interpolate(lock, [0, 1], [90, 0]);
  const locked = lock >= 1;
  const blink = Math.floor(frame / 4) % 2 === 0;
  const col = main ? "#ff3b3b" : locked ? "#ff6a5a" : "#9fe6ff";
  const killed = main && frame >= E.shot;
  const fadeAll = main ? 1 : interpolate(frame, [E.shot, E.shot + 6], [1, 0], CL);
  const L = size * 0.28;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: fadeAll }}>
      {!killed && (
        <div
          style={{
            position: "absolute",
            left: -3,
            top: -3,
            width: 6,
            height: 6,
            borderRadius: 6,
            background: "#fff",
            boxShadow: "0 0 12px 4px rgba(200,240,255,0.9), 0 0 40px 10px rgba(120,200,255,0.4)",
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        style={{ position: "absolute", left: -size / 2, top: -size / 2, rotate: `${rot}deg`, overflow: "visible" }}
      >
        {[0, 1, 2, 3].map((i) => {
          const sx = i % 2 ? size : 0;
          const sy = i > 1 ? size : 0;
          const dx = i % 2 ? -L : L;
          const dy = i > 1 ? -L : L;
          return <path key={i} d={`M ${sx + dx} ${sy} L ${sx} ${sy} L ${sx} ${sy + dy}`} stroke={col} strokeWidth={main ? 3 : 1.6} fill="none" />;
        })}
        {main && (
          <>
            <circle cx={size / 2} cy={size / 2} r={size * 0.36} stroke={col} strokeWidth={1} fill="none" strokeDasharray="4 8" />
            <line x1={size / 2} y1={-60} x2={size / 2} y2={size * 0.3} stroke={col} strokeWidth={1} />
            <line x1={size / 2} y1={size * 0.7} x2={size / 2} y2={size + 60} stroke={col} strokeWidth={1} />
            <line x1={-60} y1={size / 2} x2={size * 0.3} y2={size / 2} stroke={col} strokeWidth={1} />
            <line x1={size * 0.7} y1={size / 2} x2={size + 60} y2={size / 2} stroke={col} strokeWidth={1} />
          </>
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          left: size / 2 + 12,
          top: -size / 2,
          fontFamily: MONO,
          fontSize: main ? 18 : 13,
          lineHeight: 1.6,
          letterSpacing: "0.12em",
          color: col,
          whiteSpace: "nowrap",
          textShadow: "0 0 8px #000",
        }}
      >
        <div>{id}</div>
        <div style={{ opacity: 0.75 }}>DIST {d}</div>
        <div style={{ opacity: locked && blink ? 1 : 0.35 }}>{locked ? "■ LOCKED" : "□ ACQUIRING"}</div>
      </div>
    </div>
  );
};

export const Forest: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const shake = shakeAt(frame, [E.shot], 40, 8);
  const shotFlash = interpolate(frame, [E.shot, E.shot + 2, E.shot + 16], [0, 1, 0], CL);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", translate: `${shake.x}px ${shake.y}px` }}>
      <ThreeCanvas width={width} height={height}>
        <Space />
      </ThreeCanvas>
      <HudFrame code="HUNT" title="黑暗森林 · THE DARK FOREST" color="rgba(150,240,210,0.75)" />
      {TARGETS.map((tg) => (
        <Reticle key={tg.id} {...tg} />
      ))}
      <Reticle x={MAIN.x} y={MAIN.y} t={E.lines[4] + 10} id="TGT-0x0001 · 地球 EARTH" d="4.22 LY" main />

      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)",
          opacity: 0.6 + 0.3 * noise1(frame * 0.05, 4),
        }}
      />

      {LINES.map((l, i) => {
        const s = E.lines[i];
        const e = i < LINES.length - 1 ? E.lines[i + 1] : E.shot;
        const a = interpolate(frame, [s, s + 14, e - 10, e], [0, 1, 1, 0], CL);
        if (a <= 0) return null;
        return (
          <div
            key={i}
            style={{ position: "absolute", left: 0, right: 0, top: 730, textAlign: "center", opacity: a, filter: `blur(${(1 - a) * 8}px)` }}
          >
            <div
              style={{
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: i === 0 ? 72 : 52,
                color: "#eaf6f2",
                letterSpacing: "0.14em",
                textShadow: "0 0 24px rgba(0,0,0,0.9), 0 0 40px rgba(120,255,220,0.25)",
              }}
            >
              {l.zh}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: "0.4em", color: "rgba(180,240,220,0.6)", marginTop: 16 }}>
              <ScrambleText text={l.en} start={s + 6} speed={0.8} window={5} accent="#8fffe0" />
            </div>
          </div>
        );
      })}

      {frame >= E.shot && (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 190 }}>
          <Glitch intensity={interpolate(frame, [E.shot, E.shot + 16], [1, 0.08], CL)} style={{ color: "#ff2d2d" }}>
            <div
              style={{
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: 120,
                letterSpacing: "0.3em",
                marginRight: "-0.3em",
                textShadow: "0 0 40px rgba(255,0,0,0.8)",
                scale: String(interpolate(frame, [E.shot, E.shot + 5], [1.6, 1], { ...CL, easing: EASE_OUT })),
              }}
            >
              开枪消灭之
            </div>
          </Glitch>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.8em", color: "#ff7070", marginTop: 8 }}>OPEN FIRE.</div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "#ffe8e0", opacity: shotFlash, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};
