import { staticFile } from "remotion";
import { mulberry32 } from "../particles/random";
import type { Tone } from "./story-v2";

export type FilmParticle = {
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

export type FilmCloud = {
  points: FilmParticle[];
  count: number;
  // A dim, tone-mapped copy of the still, drawn behind the particles so the
  // silhouette stays readable. Alpha encodes luminance.
  plate: HTMLCanvasElement;
};

const SAMPLE_W = 1120;
const SAMPLE_H = 630;
const cache = new Map<string, Promise<FilmCloud>>();

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Could not load point-cloud source: ${src}`));
    img.src = src;
  });

// The AI stills all carry a large black canvas around a smaller picture.
// Find that picture, cover-crop it to 16:9, and only sample inside it.
const findContentRect = (
  img: HTMLImageElement,
): { sx: number; sy: number; sw: number; sh: number } => {
  const pw = 384;
  const ph = 216;
  const probe = document.createElement("canvas");
  probe.width = pw;
  probe.height = ph;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  if (!pctx) return { sx: 0, sy: 0, sw: img.width, sh: img.height };
  pctx.drawImage(img, 0, 0, pw, ph);
  const { data } = pctx.getImageData(0, 0, pw, ph);
  const colCount = new Uint16Array(pw);
  const rowCount = new Uint16Array(ph);

  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      const l =
        (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      if (l > 0.047) {
        colCount[x]++;
        rowCount[y]++;
      }
    }
  }

  let x0 = 0;
  let x1 = pw - 1;
  let y0 = 0;
  let y1 = ph - 1;
  while (x0 < pw - 1 && colCount[x0] < 2) x0++;
  while (x1 > 0 && colCount[x1] < 2) x1--;
  while (y0 < ph - 1 && rowCount[y0] < 2) y0++;
  while (y1 > 0 && rowCount[y1] < 2) y1--;

  const padX = Math.max(2, Math.round((x1 - x0) * 0.008));
  const padY = Math.max(2, Math.round((y1 - y0) * 0.008));
  x0 = Math.max(0, x0 - padX);
  x1 = Math.min(pw - 1, x1 + padX);
  y0 = Math.max(0, y0 - padY);
  y1 = Math.min(ph - 1, y1 + padY);

  let sx = (x0 / pw) * img.width;
  let sy = (y0 / ph) * img.height;
  let sw = ((x1 - x0 + 1) / pw) * img.width;
  let sh = ((y1 - y0 + 1) / ph) * img.height;

  // Cover-crop to 16:9, biased slightly upward so faces keep their crowns.
  const target = 16 / 9;
  if (sw / sh > target) {
    const nextW = sh * target;
    sx += (sw - nextW) * 0.5;
    sw = nextW;
  } else {
    const nextH = sw / target;
    sy += (sh - nextH) * 0.42;
    sh = nextH;
  }

  sw = Math.min(sw, img.width - sx);
  sh = Math.min(sh, img.height - sy);
  return { sx, sy, sw, sh };
};

const PLATE_W = 1000;
const PLATE_H = 563;

// The particle cloud samples mostly edges and highlights, which reads as a
// beautiful haze but leaves faces and hands hollow. This "structure plate" is a
// very dim, monochrome copy of the same frame that sits under the particles and
// gives the eye a silhouette to lock onto. Alpha carries luminance, so dark
// areas stay pure black and only the light is reinforced.
const buildPlate = (
  img: HTMLImageElement,
  rect: { sx: number; sy: number; sw: number; sh: number },
  tone: Tone,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = PLATE_W;
  canvas.height = PLATE_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create structure plate");
  ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, PLATE_W, PLATE_H);
  const frame = ctx.getImageData(0, 0, PLATE_W, PLATE_H);
  const d = frame.data;
  const tint = tone === "cool" ? [0.56, 0.82, 0.86] : [1, 0.745, 0.55];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const px = (i / 4) % PLATE_W;
    const py = Math.floor(i / 4 / PLATE_W);
    // kill the small wordmark in the lower-right of the generated stills
    const watermark = px > PLATE_W * 0.78 && py > PLATE_H * 0.9;
    const v = watermark ? 0 : Math.max(0, Math.min(1, (l - 0.03) * 1.32));
    const soft = Math.pow(v, 0.8);
    d[i] = 255 * tint[0];
    d[i + 1] = 255 * tint[1];
    d[i + 2] = 255 * tint[2];
    // Bake an elliptical falloff into the plate itself. Without this the
    // rectangle of the sampled still can survive the oval mask and read as a
    // visible frame edge once the camera pulls back.
    const nx = (px / PLATE_W - 0.5) / 0.5;
    const ny = (py / PLATE_H - 0.44) / 0.5;
    const rr = Math.sqrt(nx * nx + ny * ny * 1.18);
    const raw = Math.min(1, Math.max(0, (rr - 0.7) / 0.28));
    const falloff = 1 - raw * raw * (3 - 2 * raw);
    d[i + 3] = 255 * soft * falloff;
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
};

const buildCloud = async (
  image: string,
  count: number,
  seed: number,
  tone: Tone,
  width: number,
  height: number,
): Promise<FilmCloud> => {
  const img = await loadImage(staticFile(`film/sources/${image}.jpg`));
  const rect = findContentRect(img);

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_W;
  canvas.height = SAMPLE_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create sampling canvas");
  ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, SAMPLE_W, SAMPLE_H);
  const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);

  const n = SAMPLE_W * SAMPLE_H;
  const raw = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const x = i % SAMPLE_W;
    const y = Math.floor(i / SAMPLE_W);
    // The generator leaves a small wordmark at the picture's lower-right.
    const watermark = x > SAMPLE_W * 0.8 && y > SAMPLE_H * 0.935;
    const r = watermark ? 0 : data[i * 4] / 255;
    const g = watermark ? 0 : data[i * 4 + 1] / 255;
    const b = watermark ? 0 : data[i * 4 + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    raw[i] = l;
    hist[Math.min(255, Math.max(0, Math.round(l * 255)))]++;
  }

  const percentile = (p: number) => {
    const target = n * p;
    let acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= target) return i / 255;
    }
    return 1;
  };
  const lo = percentile(0.03);
  const hi = Math.max(lo + 0.02, percentile(0.97));
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = (raw[i] - lo) / (hi - lo);
    lum[i] = Math.max(0, Math.min(1, v));
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
      edge[i] = Math.min(1, Math.hypot(gx, gy) * 0.7);
    }
  }

  const cdf = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const L = lum[i];
    const E = edge[i];
    let w = 0.006 + 0.3 * Math.pow(L, 2.6) + 1.6 * E;
    w += 0.55 * Math.pow(L, 1.4) * E;
    if (L < 0.04 && E < 0.016) w = 0;
    if (Math.floor(i / SAMPLE_W) > SAMPLE_H * 0.82) w *= 0.6;
    acc += w;
    cdf[i] = acc;
  }

  const rnd = mulberry32(seed);
  const points: FilmParticle[] = [];

  for (let k = 0; k < count; k++) {
    const r = rnd() * acc;
    let left = 0;
    let right = n - 1;
    while (left < right) {
      const mid = (left + right) >> 1;
      if (cdf[mid] < r) left = mid + 1;
      else right = mid;
    }
    const px = left % SAMPLE_W;
    const py = Math.floor(left / SAMPLE_W);
    const L = lum[left];
    const E = edge[left];

    const tx = ((px + (rnd() - 0.5) * 1.4) / SAMPLE_W) * width;
    const ty = ((py + (rnd() - 0.5) * 1.4) / SAMPLE_H) * height;
    const z = Math.min(1, Math.max(0, 0.08 + L * 0.72 + E * 0.26 + rnd() * 0.07));

    let tint: 0 | 1 | 2 | 3;
    const roll = rnd();
    if (tone === "cool") {
      if (L < 0.16 && roll < 0.55) tint = 3;
      else if (roll < 0.72) tint = 0;
      else if (roll < 0.94) tint = 1;
      else tint = 2;
    } else {
      if (L < 0.13 && roll < 0.34) tint = 3;
      else if (roll < 0.56) tint = 0;
      else if (roll < 0.9) tint = 1;
      else tint = 2;
    }

    points.push({
      tx,
      ty,
      z,
      size: 3.8 + z * 5.2 + E * 6.4,
      alpha: (tint === 3 ? 0.1 : 0.3) + z * 0.34 + E * 0.36,
      phase: rnd() * Math.PI * 2,
      delay:
        (Math.hypot(px - SAMPLE_W / 2, py - SAMPLE_H / 2) /
          Math.hypot(SAMPLE_W / 2, SAMPLE_H / 2)) *
          0.62 +
        rnd() * 0.42,
      tint,
      edge: E,
      swirl: (rnd() * 2 - 1) * (22 + rnd() * 58),
      linger: rnd() < 0.055,
    });
  }

  return { points, count, plate: buildPlate(img, rect, tone) };
};

export const getFilmCloud = (
  image: string,
  count: number,
  seed: number,
  tone: Tone,
) => {
  const id = `${image}|${count}|${seed}|${tone}`;
  const cached = cache.get(id);
  if (cached) return cached;
  const promise = buildCloud(image, count, seed, tone, 1920, 1080);
  cache.set(id, promise);
  return promise;
};


