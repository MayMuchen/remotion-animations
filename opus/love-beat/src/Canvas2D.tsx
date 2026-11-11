import React, { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export type DrawFn = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  w: number,
  h: number,
) => void;

// A full-frame 2D canvas that is redrawn deterministically for every frame.
export const Canvas2D: React.FC<{
  readonly draw: DrawFn;
  readonly style?: React.CSSProperties;
}> = ({ draw, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.save();
    draw(ctx, frame, width, height);
    ctx.restore();
  }, [frame, draw, width, height]);
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, width, height, ...style }}
    />
  );
};
