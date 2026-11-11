import fs from "node:fs";
import path from "node:path";

const sr = 48000;
const dur = 10.2;
const n = Math.floor(sr * dur);
const left = new Float32Array(n);
const right = new Float32Array(n);

let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

let lp = 0;
for (let i = 0; i < n; i++) {
  const t = i / sr;
  const env = smooth(0, 2.4, t) * (1 - smooth(8.5, 10.2, t));
  const drone =
    0.16 * Math.sin(2 * Math.PI * 55 * t) +
    0.1 * Math.sin(2 * Math.PI * 82.41 * t + 0.4) +
    0.05 * Math.sin(2 * Math.PI * 110 * t + 1.2);
  const shimmerEnv = smooth(2.6, 4.2, t) * (1 - smooth(7.0, 8.8, t));
  const shimmer =
    0.02 *
    Math.sin(2 * Math.PI * 659.25 * t + 0.25 * Math.sin(2 * Math.PI * 0.13 * t)) *
    shimmerEnv;
  const white = rnd() * 2 - 1;
  lp += 0.018 * (white - lp);
  const air = lp * 0.09 * (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.09 * t));
  const s = (drone + shimmer + air) * env;
  const pan = 0.16 * Math.sin(2 * Math.PI * 0.05 * t);
  left[i] = s * (1 - pan);
  right[i] = s * (1 + pan);
}

let peak = 0;
for (let i = 0; i < n; i++) {
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
const gain = 0.5 / (peak || 1);

const bytesPerSample = 2;
const dataSize = n * 2 * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(sr, 24);
buffer.writeUInt32LE(sr * 2 * bytesPerSample, 28);
buffer.writeUInt16LE(2 * bytesPerSample, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

let o = 44;
for (let i = 0; i < n; i++) {
  const l = Math.max(-1, Math.min(1, left[i] * gain));
  const r = Math.max(-1, Math.min(1, right[i] * gain));
  buffer.writeInt16LE(Math.round(l * 32767), o);
  o += 2;
  buffer.writeInt16LE(Math.round(r * 32767), o);
  o += 2;
}

const out = path.resolve("public/ambient.wav");
fs.writeFileSync(out, buffer);
console.log("wrote", out, buffer.length);
