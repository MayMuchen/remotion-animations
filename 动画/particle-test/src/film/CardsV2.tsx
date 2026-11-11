import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AmbientDust } from "./Atmosphere";
import { ParticleChapterText } from "./ParticleChapter";

const SERIF = 'NotoSerifSC, "Songti SC", "SimSun", serif';
const LATIN = 'Cormorant Garamond, "Times New Roman", serif';

export const SubtitleV2: React.FC<{
  lines: string[];
  en: string;
  bodyStart: number;
  duration: number;
}> = ({ lines, en, bodyStart, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // Tighter type animation: the line is up almost immediately after the cut and
  // is gone before the next seam, so it reads as part of the cut rhythm.
  const fadeIn = interpolate(t, [bodyStart + 0.05, bodyStart + 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(t, [duration - 0.6, duration - 0.16], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = fadeIn * fadeOut;
  const lift = interpolate(t, [bodyStart + 0.05, bodyStart + 0.72], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 104,
        opacity,
        translate: `0px ${lift}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          padding: "0 140px",
          textAlign: "center",
        }}
      >
        {lines.map((line, index) => (
          <div
            key={line}
            style={{
              opacity: interpolate(
                t,
                [bodyStart + 0.05 + index * 0.26, bodyStart + 0.44 + index * 0.26],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              ),
              fontFamily: SERIF,
              fontWeight: 300,
              fontSize: lines.length > 1 ? 41 : 45,
              lineHeight: 1.55,
              letterSpacing: "0.13em",
              color: "rgba(255,249,240,0.98)",
              textShadow:
                "0 2px 24px rgba(0,0,0,0.98), 0 0 44px rgba(0,0,0,0.85), 0 0 90px rgba(0,0,0,0.6)",
            }}
          >
            {line}
          </div>
        ))}
        <div
          style={{
            fontFamily: LATIN,
            fontStyle: "italic",
            fontSize: 20,
            lineHeight: 1.4,
            letterSpacing: "0.055em",
            color: "rgba(255,232,206,0.5)",
            textShadow: "0 2px 18px rgba(0,0,0,0.95)",
            marginTop: 2,
          }}
        >
          {en}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ChapterCardV2: React.FC<{
  duration: number;
  leadIn: number;
  outDuration: number;
  chapterNo: string;
  chapterTitle: string;
  chapterSub: string;
}> = ({ duration, leadIn, outDuration, chapterNo, chapterTitle, chapterSub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bodyT = t - leadIn;
  const opacity =
    interpolate(t, [0.04, 0.42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(t, [duration - 0.62, duration - 0.12], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const slam = interpolate(bodyT, [0, 0.46], [1.12, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blur = interpolate(bodyT, [0, 0.4], [4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineWidth = interpolate(bodyT, [0.05, 0.55], [0, 136], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = interpolate(bodyT, [0.05, 0.5], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const noShift = interpolate(bodyT, [0, duration], [0, -26], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const contentReveal = interpolate(bodyT, [0.02, 0.34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", opacity }}>
      <AmbientDust opacity={0.42} />
      <ParticleChapterText
        duration={duration}
        inDuration={leadIn}
        outDuration={outDuration}
        title={chapterTitle}
      />
      <div
        style={{
          position: "absolute",
          top: 96 + noShift,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: LATIN,
          fontSize: 310,
          lineHeight: 1,
          color: "rgba(255,196,140,0.055)",
          letterSpacing: "0.04em",
        }}
      >
        {chapterNo}
      </div>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          transform: `translateY(${rise}px) scale(${slam})`,
          filter: `blur(${blur}px)`,
          opacity: contentReveal,
        }}
      >
        <div
          style={{
            fontFamily: LATIN,
            fontSize: 14,
            letterSpacing: "0.5em",
            paddingLeft: "0.5em",
            color: "rgba(232,161,92,0.8)",
          }}
        >
          {`DAY ${chapterNo} / 03`}
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 300,
            fontSize: 74,
            letterSpacing: "0.24em",
            paddingLeft: "0.24em",
            color: "rgba(255,249,240,0.96)",
            textShadow: "0 4px 40px rgba(0,0,0,0.98), 0 0 90px rgba(255,170,100,0.1)",
          }}
        >
          {chapterTitle}
        </div>
        <div
          style={{
            height: 1,
            width: lineWidth,
            background: "rgba(255,206,156,0.55)",
            boxShadow: "0 0 16px rgba(255,190,130,0.4)",
          }}
        />
        <div
          style={{
            fontFamily: LATIN,
            fontSize: 15,
            letterSpacing: "0.34em",
            paddingLeft: "0.34em",
            color: "rgba(255,236,214,0.44)",
          }}
        >
          {chapterSub}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

