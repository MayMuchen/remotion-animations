import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AmbientDust } from "./Atmosphere";

const SERIF = 'NotoSerifSC, "Songti SC", "SimSun", serif';
const LATIN = 'Cormorant Garamond, "Times New Roman", serif';

export const Subtitle: React.FC<{
  lines: string[];
  en: string;
  duration: number;
}> = ({ lines, en, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const fadeIn = interpolate(t, [0.55, 1.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(t, [duration - 1.25, duration - 0.35], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = fadeIn * fadeOut;
  const lift = interpolate(t, [0.55, 1.9], [12, 0], {
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
        {lines.map((line) => (
          <div
            key={line}
            style={{
              fontFamily: SERIF,
              fontWeight: 300,
              fontSize: lines.length > 1 ? 40 : 44,
              lineHeight: 1.55,
              letterSpacing: "0.13em",
              color: "rgba(255,247,236,0.95)",
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

const envelope = (t: number, duration: number) =>
  interpolate(t, [0, 0.9, duration - 1.1, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const TitleCard: React.FC<{
  duration: number;
  title: string;
  sub: string;
  kicker: string;
}> = ({ duration, title, sub, kicker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opacity = envelope(t, duration);
  const lineWidth = interpolate(t, [1.1, 2.9], [0, 168], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = interpolate(t, [0.6, 2.6], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#030303", opacity }}>
      <AmbientDust opacity={0.75} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(46% 40% at 50% 43%, rgba(255,190,130,0.10) 0%, rgba(255,150,90,0.03) 52%, rgba(0,0,0,0) 78%)",
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
          flexDirection: "column",
          gap: 26,
          translate: `0px ${rise}px`,
        }}
      >
        <div
          style={{
            fontFamily: LATIN,
            fontSize: 15,
            letterSpacing: "0.46em",
            paddingLeft: "0.46em",
            color: "rgba(232,161,92,0.72)",
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 300,
            fontSize: 78,
            letterSpacing: "0.3em",
            paddingLeft: "0.3em",
            color: "rgba(255,250,243,0.96)",
            textShadow: "0 4px 46px rgba(0,0,0,0.98), 0 0 120px rgba(255,180,110,0.10)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            height: 1,
            width: lineWidth,
            background:
              "linear-gradient(90deg, rgba(232,161,92,0) 0%, rgba(255,214,168,0.75) 50%, rgba(232,161,92,0) 100%)",
            boxShadow: "0 0 18px rgba(255,190,130,0.4)",
          }}
        />
        <div
          style={{
            fontFamily: LATIN,
            fontSize: 19,
            letterSpacing: "0.4em",
            paddingLeft: "0.4em",
            color: "rgba(255,236,214,0.48)",
          }}
        >
          {sub}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ChapterCard: React.FC<{
  duration: number;
  chapterNo: string;
  chapterTitle: string;
  chapterSub: string;
}> = ({ duration, chapterNo, chapterTitle, chapterSub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opacity = envelope(t, duration);
  const lineWidth = interpolate(t, [0.35, 1.5], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = interpolate(t, [0.2, 1.35], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#030303", opacity }}>
      <AmbientDust opacity={0.55} />
      <div
        style={{
          position: "absolute",
          top: 128,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: LATIN,
          fontSize: 300,
          lineHeight: 1,
          color: "rgba(255,196,140,0.05)",
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
          gap: 20,
          translate: `0px ${rise}px`,
        }}
      >
        <div
          style={{
            fontFamily: LATIN,
            fontSize: 14,
            letterSpacing: "0.5em",
            paddingLeft: "0.5em",
            color: "rgba(232,161,92,0.78)",
          }}
        >
          {`DAY ${chapterNo} / 03`}
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 300,
            fontSize: 72,
            letterSpacing: "0.24em",
            paddingLeft: "0.24em",
            color: "rgba(255,249,240,0.95)",
            textShadow: "0 4px 40px rgba(0,0,0,0.98)",
          }}
        >
          {chapterTitle}
        </div>
        <div
          style={{
            height: 1,
            width: lineWidth,
            background: "rgba(255,206,156,0.5)",
            boxShadow: "0 0 14px rgba(255,190,130,0.35)",
          }}
        />
        <div
          style={{
            fontFamily: LATIN,
            fontSize: 15,
            letterSpacing: "0.34em",
            paddingLeft: "0.34em",
            color: "rgba(255,236,214,0.42)",
          }}
        >
          {chapterSub}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const OutroCard: React.FC<{
  duration: number;
  title: string;
  sub: string;
  credit: string;
}> = ({ duration, title, sub, credit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opacity = interpolate(t, [1.0, 3.2, duration - 2.2, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const creditOpacity = interpolate(t, [4.4, 6.6, duration - 2.2, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#030303" }}>
      <AmbientDust opacity={0.6} />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          opacity,
        }}
      >
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 300,
            fontSize: 66,
            letterSpacing: "0.3em",
            paddingLeft: "0.3em",
            color: "rgba(255,250,243,0.96)",
            textShadow: "0 4px 46px rgba(0,0,0,0.98)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: LATIN,
            fontSize: 18,
            letterSpacing: "0.4em",
            paddingLeft: "0.4em",
            color: "rgba(255,236,214,0.46)",
          }}
        >
          {sub}
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 128,
          textAlign: "center",
          fontFamily: SERIF,
          fontWeight: 300,
          fontSize: 26,
          letterSpacing: "0.18em",
          color: "rgba(255,240,222,0.6)",
          opacity: creditOpacity,
        }}
      >
        {credit}
      </div>
    </AbsoluteFill>
  );
};
