import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { mulberry32 } from "../particles/random";
import type { Tone } from "./story";

export const Backdrop: React.FC<{ tone: Tone; frameOffset: number }> = ({
  tone,
  frameOffset,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame + frameOffset * fps) / fps;
  const drift = Math.sin(t * 0.13) * 30;
  const warm = tone === "warm";
  const beam = warm
    ? "linear-gradient(103deg, rgba(0,0,0,0) 28%, rgba(255,196,140,0.055) 42%, rgba(255,224,190,0.115) 50%, rgba(255,196,140,0.045) 58%, rgba(0,0,0,0) 72%)"
    : "linear-gradient(103deg, rgba(0,0,0,0) 28%, rgba(150,205,205,0.04) 42%, rgba(206,240,235,0.075) 50%, rgba(150,205,205,0.035) 58%, rgba(0,0,0,0) 72%)";

  return (
    <AbsoluteFill style={{ backgroundColor: "#030303", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: warm
            ? "radial-gradient(58% 54% at 54% 38%, rgba(255,170,110,0.105) 0%, rgba(255,140,80,0.04) 45%, rgba(0,0,0,0) 75%)"
            : "radial-gradient(58% 54% at 54% 38%, rgba(150,205,205,0.075) 0%, rgba(110,160,165,0.028) 45%, rgba(0,0,0,0) 75%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -240,
          background: beam,
          filter: "blur(28px)",
          opacity: 0.5 + 0.1 * Math.sin(t * 0.31),
          translate: `${drift}px 0px`,
        }}
      />
    </AbsoluteFill>
  );
};

export const BottomShade: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(to top, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.53) 9%, rgba(0,0,0,0.13) 25%, rgba(0,0,0,0) 39%)",
    }}
  />
);

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse 72% 62% at 50% 45%, rgba(0,0,0,0) 37%, rgba(0,0,0,0.34) 72%, rgba(0,0,0,0.76) 100%)",
    }}
  />
);

// Halation is the soft, warm bleed that 35mm stock leaves around the brightest
// parts of the frame. It is deliberately global and low-frequency: the point
// particles supply the detail, this layer supplies the atmosphere.
export const Halation: React.FC<{ tone?: Tone; strength?: number }> = ({
  tone = "warm",
  strength = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const warm = tone === "warm";
  const breath = 0.92 + 0.08 * Math.sin(t * 0.47);
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: "screen",
        opacity: 0.46 * breath * strength,
        background: warm
          ? "radial-gradient(ellipse 46% 33% at 50% 34%, rgba(255,190,126,0.17) 0%, rgba(255,144,78,0.07) 38%, rgba(0,0,0,0) 72%), radial-gradient(ellipse 98% 94% at 50% 50%, rgba(255,94,34,0.035) 52%, rgba(255,110,48,0.07) 100%)"
          : "radial-gradient(ellipse 46% 33% at 50% 34%, rgba(185,229,224,0.13) 0%, rgba(102,170,176,0.05) 40%, rgba(0,0,0,0) 72%), radial-gradient(ellipse 98% 94% at 50% 50%, rgba(54,132,142,0.03) 52%, rgba(88,170,176,0.06) 100%)",
        filter: "blur(22px)",
        transform: `scale(${1.015 + 0.005 * Math.sin(t * 0.23)})`,
      }}
    />
  );
};

// Two grain frequencies: a fine screen layer for the black field, and a slower
// soft-light layer for the mid-tones. The tile offset changes every frame,
// which keeps the texture alive without ever reading as digital noise.
let grainPromise: Promise<HTMLImageElement> | null = null;

const loadGrainTexture = () => {
  if (!grainPromise) {
    grainPromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not load grain texture"));
      image.src = staticFile("grain.png");
    });
  }
  return grainPromise;
};

const GrainLayer: React.FC<{
  image: HTMLImageElement;
  size: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  blend: React.CSSProperties["mixBlendMode"];
  contrast?: number;
}> = ({ image, size, offsetX, offsetY, opacity, blend, contrast }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 1920, 1080);
    const pattern = ctx.createPattern(image, "repeat");
    if (!pattern) return;
    const scale = size / image.width;
    pattern.setTransform(
      new DOMMatrix().translate(offsetX, offsetY).scale(scale),
    );
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, 1920, 1080);
  }, [image, offsetX, offsetY, size]);

  return (
    <canvas
      ref={ref}
      width={1920}
      height={1080}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        mixBlendMode: blend,
        filter: contrast ? `contrast(${contrast})` : undefined,
        pointerEvents: "none",
      }}
    />
  );
};

// Two grain frequencies: a fine screen layer for the black field, and a slower
// soft-light layer for the mid-tones. Drawing through a canvas instead of a CSS
// background means the texture is guaranteed to be loaded before the frame.
export const Grain: React.FC<{ strength?: number }> = ({ strength = 1 }) => {
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading grain texture"));
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGrainTexture()
      .then((texture) => {
        if (cancelled) return;
        setImage(texture);
        continueRender(handle);
      })
      .catch((error) => {
        console.error(error);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (!image) return null;

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <GrainLayer
        image={image}
        size={512}
        offsetX={(frame * 73) % 512}
        offsetY={(frame * 41) % 512}
        opacity={0.078 * strength}
        blend="screen"
      />
      <GrainLayer
        image={image}
        size={860}
        offsetX={-((frame * 29) % 860)}
        offsetY={-((frame * 17) % 860)}
        opacity={0.052 * strength}
        blend="soft-light"
        contrast={1.35}
      />
    </AbsoluteFill>
  );
};

export const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(to bottom, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 4px)",
      opacity: 0.38,
      mixBlendMode: "soft-light",
      pointerEvents: "none",
    }}
  />
);

export const FilmBars: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        inset: "0 0 auto 0",
        height: 14,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.86), rgba(0,0,0,0))",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: "auto 0 0 0",
        height: 16,
        background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0))",
      }}
    />
  </AbsoluteFill>
);

const makeDust = () => {
  const rnd = mulberry32(31337);
  return Array.from({ length: 150 }, () => ({
    x: rnd() * 1920,
    y: rnd() * 1080,
    r: 0.6 + rnd() * 2.2,
    a: 0.05 + rnd() * 0.28,
    phase: rnd() * Math.PI * 2,
    speed: 1 + rnd() * 5,
  }));
};

export const AmbientDust: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const dust = useMemo(makeDust, []);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const t = frame / fps;
    ctx.clearRect(0, 0, 1920, 1080);
    ctx.globalCompositeOperation = "lighter";

    for (const d of dust) {
      const x = d.x + Math.sin(t * 0.17 + d.phase) * 14;
      const y = d.y - ((t * d.speed) % 70) + Math.cos(t * 0.13 + d.phase) * 5;
      const flicker = 0.55 + 0.45 * Math.sin(t * 0.5 + d.phase * 2.1);
      ctx.globalAlpha = Math.min(0.6, d.a * flicker * opacity);
      const g = ctx.createRadialGradient(x, y, 0, x, y, d.r * 4);
      g.addColorStop(0, "rgba(255,238,208,0.9)");
      g.addColorStop(0.35, "rgba(255,198,142,0.35)");
      g.addColorStop(1, "rgba(255,160,90,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - d.r * 4, y - d.r * 4, d.r * 8, d.r * 8);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }, [dust, fps, frame, opacity]);

  return (
    <canvas
      ref={ref}
      width={1920}
      height={1080}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
};




