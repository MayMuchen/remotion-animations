import fs from "node:fs";
import path from "node:path";

const sr = 48000;
const dur = 10.2;
const n = Math.floor(sr * dur);
const TAU = Math.PI * 2;
const left = new Float32Array(n);
const right = new Float32Array(n);

let seed = 20261106;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const add = (i, l, r) => {
  if (i < 0 || i >= n) return;
  left[i] += l;
  right[i] += r;
};

// Warm, slowly moving pad in C major: open enough to feel hopeful, dark enough
// to leave the gold particles as the main light source.
const padFrequencies = [65.41, 98.0, 130.81, 164.81, 196.0];
for (let i = 0; i < n; i++) {
  const t = i / sr;
  const env = smooth(0, 2.15, t) * (1 - smooth(9.25, 10.2, t));
  let l = 0;
  let r = 0;

  for (let k = 0; k < padFrequencies.length; k++) {
    const f = padFrequencies[k];
    const movement = 0.72 + 0.28 * Math.sin(TAU * (0.055 + k * 0.009) * t + k * 1.7);
    const amp = (0.034 / (1 + k * 0.14)) * movement;
    const drift = 1 + 0.0018 * Math.sin(TAU * 0.07 * t + k);
    l += amp * Math.sin(TAU * f * drift * t + k * 0.63);
    r += amp * Math.sin(TAU * f * (2 - drift) * t + k * 1.12 + 0.4);
    l += amp * 0.18 * Math.sin(TAU * f * 2.003 * t + k);
    r += amp * 0.18 * Math.sin(TAU * f * 1.997 * t + k + 0.7);
  }

  // Air and tape-like hiss, gently filtered.
  const air = (rnd() * 2 - 1) * 0.007;
  l += air * (0.7 + 0.3 * Math.sin(TAU * 0.11 * t));
  r += (rnd() * 2 - 1) * 0.006;

  add(i, l * env, r * env);
}

const addKick = (start, strength, accent) => {
  const startIndex = Math.floor(start * sr);
  const length = Math.floor((accent ? 1.05 : 0.7) * sr);
  let phase = 0;
  let noiseLp = 0;

  for (let j = 0; j < length; j++) {
    const age = j / sr;
    const f = 43 + 82 * Math.exp(-age * 24);
    phase += (TAU * f) / sr;
    const attack = 1 - Math.exp(-age * 1100);
    const bodyEnv = Math.exp(-age * (accent ? 6.0 : 7.8)) * attack;
    const body = Math.sin(phase) * 0.42;
    const sub = Math.sin(TAU * 41.2 * age) * Math.exp(-age * 5.0) * 0.18;
    const click = (rnd() * 2 - 1) * Math.exp(-age * 105) * 0.035;
    const woodNoise = (rnd() * 2 - 1) * Math.exp(-age * 24) * (accent ? 0.028 : 0.012);
    noiseLp += 0.16 * (woodNoise - noiseLp);
    const s = (body + sub + click) * bodyEnv * strength + noiseLp;

    add(startIndex + j, s * 0.97, s * 0.97);
  }

  // A small second heartbeat on accents gives the pulse a human feel.
  if (accent) {
    let secondPhase = 0;
    const secondStart = startIndex + Math.floor(0.115 * sr);
    const secondLength = Math.floor(0.42 * sr);
    for (let j = 0; j < secondLength; j++) {
      const age = j / sr;
      const f = 46 + 40 * Math.exp(-age * 24);
      secondPhase += (TAU * f) / sr;
      const env = Math.exp(-age * 10.5) * (1 - Math.exp(-age * 900));
      const s = Math.sin(secondPhase) * 0.18 * env * strength;
      add(secondStart + j, s, s);
    }
  }
};

// 96 BPM, matching src/particles/beats.ts.
const beatSeconds = 60 / 96;
const accents = new Set([0, 4, 8, 12, 14, 15]);
for (let beat = 0; beat < 16; beat++) {
  const strength = accents.has(beat) ? 1 : 0.62;
  addKick(beat * beatSeconds, strength, accents.has(beat));
}

// Quiet brush hits on alternating beats add motion without turning the score
// into a literal metronome.
for (const beat of [1, 3, 5, 7, 9, 11, 13]) {
  const start = Math.floor((beat * beatSeconds + 0.015) * sr);
  let lp = 0;
  for (let j = 0; j < Math.floor(0.24 * sr); j++) {
    const age = j / sr;
    const env = Math.exp(-age * 18) * (1 - Math.exp(-age * 220));
    const white = rnd() * 2 - 1;
    lp += 0.055 * (white - lp);
    const pan = beat % 2 === 0 ? -0.18 : 0.18;
    const s = lp * 0.16 * env;
    add(start + j, s * (1 - pan), s * (1 + pan));
  }
}

const addBell = (start, frequency, amplitude, pan) => {
  const startIndex = Math.floor(start * sr);
  const length = Math.min(n - startIndex, Math.floor(2.25 * sr));
  for (let j = 0; j < length; j++) {
    const age = j / sr;
    const env = (1 - Math.exp(-age * 130)) * Math.exp(-age * 1.35);
    const tone =
      Math.sin(TAU * frequency * age) +
      0.28 * Math.sin(TAU * frequency * 2.01 * age + 0.3) +
      0.09 * Math.sin(TAU * frequency * 3.97 * age + 1.1);
    const s = tone * amplitude * env;
    add(startIndex + j, s * (1 - pan) * 0.5, s * (1 + pan) * 0.5);
  }
};

addBell(2.5, 523.25, 0.055, -0.22);
addBell(5.0, 659.25, 0.045, 0.18);
addBell(7.5, 783.99, 0.048, -0.12);
addBell(8.75, 659.25, 0.065, 0.2);
addBell(8.75, 1046.5, 0.028, -0.28);

// Broad, low-level echo to place the hits in a dark room.
const delayL = Math.floor(0.187 * sr);
const delayR = Math.floor(0.231 * sr);
for (let i = Math.max(delayL, delayR); i < n; i++) {
  left[i] += right[i - delayL] * 0.085;
  right[i] += left[i - delayR] * 0.075;
}

let peak = 0;
for (let i = 0; i < n; i++) {
  const t = i / sr;
  const fade = smooth(0, 0.10, t) * (1 - smooth(9.62, 10.2, t));
  left[i] = Math.tanh(left[i] * 1.12) * fade;
  right[i] = Math.tanh(right[i] * 1.12) * fade;
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}

const gain = 0.78 / (peak || 1);
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

const out = path.resolve("public/bgm.wav");
fs.writeFileSync(out, buffer);
console.log("wrote", out, buffer.length);

