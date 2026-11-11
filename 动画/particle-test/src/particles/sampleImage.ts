import { staticFile } from "remotion";
import { mulberry32 } from "./random";

export type Particle = {
  tx: number;
  ty: number;
  z: number;
  size: number;
  alpha: number;
  phase: number;
  delay: number;
  tint: 0 | 1 | 2 | 3;
  edge: number;
  swirl: number;
  linger: boolean;
};

export type PointCloud = {
  points: Particle[];
  origin: { x: number; y: number };
  count: number;
};

const SAMPLE_W = 640;
const SAMPLE_H = 360;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load point-cloud source image"));
    img.src = src;
  });

export const buildPointCloud = async (
  count: number,
  width: number,
  height: number,
): Promise<PointCloud> => {
  const img = await loadImage(staticFile("source-hands.jpg"));
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_W;
  canvas.height = SAMPLE_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not create sampling canvas");
  }
  ctx.drawImage(img, 0, 0, SAMPLE_W, SAMPLE_H);
  const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);

  const n = SAMPLE_W * SAMPLE_H;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const edge = new Float32Array(n);
  for (let y = 1; y < SAMPLE_H - 1; y++) {
    for (let x = 1; x < SAMPLE_W - 1; x++) {
      const i = y * SAMPLE_W + x;
      const gx =
        -lum[i - SAMPLE_W - 1] -
        2 * lum[i - 1] -
        lum[i + SAMPLE_W - 1] +
        lum[i - SAMPLE_W + 1] +
        2 * lum[i + 1] +
        lum[i + SAMPLE_W + 1];
      const gy =
        -lum[i - SAMPLE_W - 1] -
        2 * lum[i - SAMPLE_W] -
        lum[i - SAMPLE_W + 1] +
        lum[i + SAMPLE_W - 1] +
        2 * lum[i + SAMPLE_W] +
        lum[i + SAMPLE_W + 1];
      edge[i] = Math.min(1, Math.hypot(gx, gy) * 0.75);
    }
  }

  // The brightest 8x8 block becomes the point where light is born.
  let bestX = SAMPLE_W / 2;
  let bestY = SAMPLE_H / 2;
  let best = -1;
  for (let by = 0; by < SAMPLE_H - 8; by += 8) {
    for (let bx = 0; bx < SAMPLE_W - 8; bx += 8) {
      let sum = 0;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          sum += lum[(by + y) * SAMPLE_W + bx + x];
        }
      }
      if (sum > best) {
        best = sum;
        bestX = bx + 4;
        bestY = by + 4;
      }
    }
  }

  const cdf = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const L = lum[i];
    const E = edge[i];
    let w = 0.02 + Math.pow(L, 1.3) * 1.0 + Math.pow(E, 0.9) * 1.45;
    if (L < 0.02 && E < 0.015) {
      w = 0;
    }
    if (Math.floor(i / SAMPLE_W) > SAMPLE_H * 0.74) {
      w *= 0.45;
    }
    acc += w;
    cdf[i] = acc;
  }

  const rnd = mulberry32(20261106);
  const points: Particle[] = [];

  for (let k = 0; k < count; k++) {
    const r = rnd() * acc;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < r) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    const px = lo % SAMPLE_W;
    const py = Math.floor(lo / SAMPLE_W);
    const L = lum[lo];
    const E = edge[lo];

    const tx = ((px + (rnd() - 0.5) * 1.5) / SAMPLE_W) * width;
    const ty = ((py + (rnd() - 0.5) * 1.5) / SAMPLE_H) * height;

    const z = Math.min(0.999, 0.2 + rnd() * 0.8);
    const dist = Math.hypot(px - bestX, py - bestY) / Math.hypot(SAMPLE_W, SAMPLE_H);

    let tint: 0 | 1 | 2 | 3;
    const roll = rnd();
    if (L < 0.14 && roll < 0.45) {
      tint = 3;
    } else if (roll < 0.56) {
      tint = 0;
    } else if (roll < 0.9) {
      tint = 1;
    } else {
      tint = 2;
    }

    points.push({
      tx,
      ty,
      z,
      size: 3.8 + z * 5.0 + E * 5.5,
      alpha: (tint === 3 ? 0.1 : 0.26) + z * 0.36 + E * 0.3,
      phase: rnd() * Math.PI * 2,
      delay: dist * 0.7 + rnd() * 0.4,
      tint,
      edge: E,
      swirl: (rnd() * 2 - 1) * (24 + rnd() * 56),
      linger: rnd() < 0.035,
    });
  }

  return {
    points,
    origin: { x: (bestX / SAMPLE_W) * width, y: (bestY / SAMPLE_H) * height },
    count,
  };
};






