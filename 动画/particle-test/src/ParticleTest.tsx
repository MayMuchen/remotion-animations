import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ParticleCanvas } from "./particles/ParticleCanvas";
import { SoundwaveCanvas } from "./particles/SoundwaveCanvas";
import { beatPulseAt } from "./particles/beats";
import { buildPointCloud, PointCloud } from "./particles/sampleImage";

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const drift = Math.sin(t * 0.18) * 26;
  const pulse = beatPulseAt(t);
  const beamOpacity = 0.55 + 0.12 * Math.sin(t * 0.45) + pulse * 0.075;

  return (
    <AbsoluteFill style={{ backgroundColor: "#030303", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 55% at 54% 40%, rgba(255,170,110,0.10) 0%, rgba(255,140,80,0.04) 45%, rgba(0,0,0,0) 75%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -240,
          background:
            "linear-gradient(103deg, rgba(0,0,0,0) 30%, rgba(255,196,140,0.05) 43%, rgba(255,224,190,0.11) 50%, rgba(255,196,140,0.05) 57%, rgba(0,0,0,0) 70%)",
          filter: "blur(26px)",
          opacity: beamOpacity,
          translate: `${drift}px 0px`,
        }}
      />
    </AbsoluteFill>
  );
};

const BottomShade: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.74) 10%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0) 38%)",
    }}
  />
);

const Grain: React.FC = () => (
  <AbsoluteFill style={{ opacity: 0.055, mixBlendMode: "screen", overflow: "hidden" }}>
    {Array.from({ length: 12 }).map((_, i) => (
      <Img
        key={i}
        src={staticFile("grain.png")}
        style={{
          position: "absolute",
          left: (i % 4) * 512 - 128,
          top: Math.floor(i / 4) * 512 - 96,
          width: 512,
          height: 512,
        }}
      />
    ))}
  </AbsoluteFill>
);

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse 72% 62% at 50% 45%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.34) 74%, rgba(0,0,0,0.74) 100%)",
    }}
  />
);

const Texts: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const subOpacity = interpolate(t, [2.7, 3.6, 6.3, 7.2], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subLift = interpolate(t, [2.7, 7.2], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(t, [8.85, 9.55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleLift = interpolate(t, [8.85, 9.8], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 138,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          opacity: subOpacity,
          translate: `0px ${subLift}px`,
        }}
      >
        <div
          style={{
            fontFamily: 'NotoSerifSC, "Songti SC", "SimSun", serif',
            fontWeight: 300,
            fontSize: 38,
            letterSpacing: "0.14em",
            color: "rgba(255,247,236,0.94)",
            textShadow: "0 2px 26px rgba(0,0,0,0.95), 0 0 60px rgba(0,0,0,0.6)",
            textAlign: "center",
          }}
        >
          那双手，曾在我黑暗的掌心里，写过一万次「水」。
        </div>
        <div
          style={{
            fontFamily: 'Cormorant Garamond, "Times New Roman", serif',
            fontStyle: "italic",
            fontSize: 21,
            letterSpacing: "0.06em",
            color: "rgba(255,236,214,0.52)",
            textShadow: "0 2px 18px rgba(0,0,0,0.9)",
            textAlign: "center",
          }}
        >
          Hands that wrote "water" into my palm ten thousand times.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          opacity: titleOpacity,
          translate: `0px ${titleLift}px`,
        }}
      >
        <div
          style={{
            fontFamily: 'NotoSerifSC, "Songti SC", "SimSun", serif',
            fontWeight: 300,
            fontSize: 62,
            letterSpacing: "0.32em",
            paddingLeft: "0.32em",
            color: "rgba(255,249,240,0.96)",
            textShadow: "0 4px 40px rgba(0,0,0,0.95)",
          }}
        >
          假如给我三天光明
        </div>
        <div
          style={{
            fontFamily: 'Cormorant Garamond, "Times New Roman", serif',
            fontSize: 18,
            letterSpacing: "0.34em",
            paddingLeft: "0.34em",
            color: "rgba(255,236,214,0.5)",
          }}
        >
          IF I HAD THREE DAYS TO SEE
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ParticleTest: React.FC = () => {
  const [cloudHandle] = useState(() => delayRender("Sampling point cloud"));
  const [fontHandle] = useState(() => delayRender("Loading font"));
  const [cloud, setCloud] = useState<PointCloud | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildPointCloud(18000, 1920, 1080)
      .then((result) => {
        if (cancelled) return;
        setCloud(result);
        continueRender(cloudHandle);
      })
      .catch((err) => {
        console.error(err);
        continueRender(cloudHandle);
      });
    return () => {
      cancelled = true;
    };
  }, [cloudHandle]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@font-face{font-family:"NotoSerifSC";src:url("${staticFile(
      "NotoSerifSC-VF.ttf",
    )}") format("truetype");font-weight:100 900;font-display:block;}`;
    document.head.appendChild(style);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(fontHandle);
    };
    document.fonts
      .load('300 44px "NotoSerifSC"')
      .then(finish)
      .catch(finish);
    return () => {
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [fontHandle]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#030303" }}>
      <Backdrop />
      {cloud ? <SoundwaveCanvas origin={cloud.origin} /> : null}
      {cloud ? <ParticleCanvas cloud={cloud} /> : null}
      <BottomShade />
      <Grain />
      <Vignette />
      <Texts />
      <Audio src={staticFile("bgm.wav")} volume={0.92} />
    </AbsoluteFill>
  );
};





