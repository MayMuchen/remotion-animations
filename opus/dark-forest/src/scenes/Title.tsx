import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { MONO, SERIF } from "../lib/fonts";
import { ScrambleText } from "../lib/ScrambleText";
import { CameraRig, makeGalaxy, makeStarSphere, usePixelRatio, usePointMaterial } from "../lib/three";
import { CL, EASE_IN, EASE_IO, EASE_OUT } from "../lib/util";
import { EV } from "../timeline";

const E = EV.title;

const GalaxyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const galaxy = useMemo(() => makeGalaxy(70000, 7), []);
  const stars = useMemo(() => makeStarSphere(7000, 220, 3), []);
  const gMat = usePointMaterial({ spin: 0.12, scale: 260 });
  const sMat = usePointMaterial({ twinkle: 0.35, scale: 300 });
  usePixelRatio(gMat, sMat);
  const t = frame / fps;
  gMat.uniforms.uTime.value = 2 + t * 0.35;
  sMat.uniforms.uTime.value = t;

  const p = interpolate(frame, [0, E.plunge], [0, 1], { ...CL, easing: EASE_IO });
  const q = interpolate(frame, [E.plunge, 240], [0, 1], { ...CL, easing: EASE_IN });
  const ang = -0.6 + p * 1.1;
  const dist = interpolate(p, [0, 1], [34, 14]) * (1 - q * 0.93);
  const height = interpolate(p, [0, 1], [20, 4.5]) * (1 - q * 0.9);
  return (
    <>
      <CameraRig
        position={[Math.sin(ang) * dist, height, Math.cos(ang) * dist]}
        lookAt={[0, 0, 0]}
        fov={interpolate(q, [0, 1], [48, 95])}
        roll={0.25 - p * 0.18}
      />
      <points geometry={stars} material={sMat} />
      <points geometry={galaxy} material={gMat} rotation={[0.15, 0, 0.08]} />
    </>
  );
};

export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const R = E.reveal;
  const tIn = interpolate(frame, [R, R + 40], [0, 1], { ...CL, easing: EASE_OUT });
  const tOut = interpolate(frame, [E.plunge - 10, E.plunge + 14], [1, 0], CL);
  const sweep = interpolate(frame, [R + 10, R + 80], [-60, 160], CL);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={width} height={height}>
        <GalaxyScene />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 50% 32% at 50% 50%, rgba(0,0,0,0.55), rgba(0,0,0,0) 100%)",
          opacity: tIn * tOut,
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: tOut,
          scale: String(interpolate(frame, [R, E.plunge + 14], [1.08, 0.96], CL) * (1 + (1 - tOut) * 0.4)),
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 20,
            letterSpacing: "0.9em",
            color: "rgba(200,225,255,0.75)",
            marginBottom: 26,
            opacity: interpolate(frame, [R - 30, R], [0, 1], CL),
          }}
        >
          <ScrambleText text="三体 Ⅱ · 宇宙社会学" start={R - 34} speed={2} />
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 188,
            lineHeight: 1.1,
            letterSpacing: `${interpolate(tIn, [0, 1], [0.9, 0.2])}em`,
            marginRight: `-${interpolate(tIn, [0, 1], [0.9, 0.2])}em`,
            filter: `blur(${interpolate(tIn, [0, 1], [26, 0])}px) drop-shadow(0 0 40px rgba(120,170,255,0.45))`,
            opacity: tIn,
            backgroundImage: `linear-gradient(100deg, #8a9bb5 0%, #e9f1ff ${sweep - 20}%, #ffffff ${sweep}%, #e9f1ff ${sweep + 12}%, #8a9bb5 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          黑暗森林法则
        </div>
        <div
          style={{
            width: interpolate(frame, [R + 14, R + 60], [0, 980], { ...CL, easing: EASE_OUT }),
            height: 1,
            marginTop: 26,
            background: "linear-gradient(90deg, transparent, rgba(170,210,255,0.9), transparent)",
          }}
        />
        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            letterSpacing: "0.75em",
            marginRight: "-0.75em",
            color: "#cfe1ff",
            marginTop: 26,
          }}
        >
          <ScrambleText text="THE DARK FOREST HYPOTHESIS" start={R + 20} speed={1.4} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
