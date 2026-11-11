import fs from "node:fs";
import path from "node:path";

const scenes = JSON.parse(fs.readFileSync("src/film/scenes.json", "utf8"));
const voDur = JSON.parse(fs.readFileSync("src/film/vo-durations.json", "utf8"));

let cursor = 0;
const timeline = scenes.map((s) => {
  const voDuration = s.vo ? voDur[s.vo] ?? 0 : 0;
  const duration = s.duration ?? voDuration + (s.lead ?? 0.6) + (s.tail ?? 1.7);
  const entry = { ...s, start: cursor, duration, voStart: cursor + (s.lead ?? 0.6) };
  cursor += duration;
  return entry;
});

const dur = Math.ceil((cursor + 0.4) * 100) / 100;
const sr = 44100;
const n = Math.floor(sr * dur);
const TAU = Math.PI * 2;
const left = new Float32Array(n);
const right = new Float32Array(n);
const duck = new Float32Array(n);

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

// ---- Slow pad, four chords cycling every 20 seconds ----
const chords = [
  [65.41, 98.0, 130.81, 164.81, 196.0], // C
  [55.0, 82.41, 110.0, 130.81, 164.81], // Am
  [87.31, 130.81, 174.61, 220.0, 261.63], // F
  [98.0, 146.83, 196.0, 246.94, 293.66], // G
];
const chordLen = 20;
const xfade = 4.2;

const chordAt = (t, freqs, gain, phaseBase) => {
  let l = 0;
  let r = 0;
  for (let k = 0; k < freqs.length; k++) {
    const f = freqs[k];
    const movement =
      0.74 + 0.26 * Math.sin(TAU * (0.041 + k * 0.008) * t + k * 1.7 + phaseBase);
    const amp = (gain / (1 + k * 0.16)) * movement;
    const drift = 1 + 0.0016 * Math.sin(TAU * 0.061 * t + k + phaseBase);
    l += amp * Math.sin(TAU * f * drift * t + k * 0.63 + phaseBase);
    r += amp * Math.sin(TAU * f * (2 - drift) * t + k * 1.12 + 0.4 + phaseBase);
    l += amp * 0.16 * Math.sin(TAU * f * 2.003 * t + k + phaseBase);
    r += amp * 0.16 * Math.sin(TAU * f * 1.997 * t + k + 0.7 + phaseBase);
  }
  return [l, r];
};

for (let i = 0; i < n; i++) {
  const t = i / sr;
  const pos = t / chordLen;
  const idx = Math.floor(pos) % chords.length;
  const local = t - Math.floor(pos) * chordLen;
  const nextIdx = (idx + 1) % chords.length;

  const env = smooth(0, 3.0, t) * (1 - smooth(dur - 5.0, dur, t));
  let [l, r] = chordAt(t, chords[idx], 0.03, idx * 1.31);

  if (local > chordLen - xfade) {
    const mix = smooth(0, 1, (local - (chordLen - xfade)) / xfade);
    const [nl, nr] = chordAt(t, chords[nextIdx], 0.03 * mix, nextIdx * 1.31);
    l = l * (1 - mix * 0.85) + nl;
    r = r * (1 - mix * 0.85) + nr;
  }

  // Low C drone, always present but breathing.
  const drone = Math.sin(TAU * 32.7 * t) * 0.022 * (0.6 + 0.4 * Math.sin(TAU * 0.021 * t));
  l += drone;
  r += drone * 0.94;

  const air = (rnd() * 2 - 1) * 0.005;
  l += air * (0.7 + 0.3 * Math.sin(TAU * 0.09 * t));
  r += (rnd() * 2 - 1) * 0.0045;

  add(i, l * env, r * env);
}

// ---- Heartbeat kick, 96 BPM ----
const beatSeconds = 60 / 96;
const addKick = (start, strength, accent) => {
  const startIndex = Math.floor(start * sr);
  const length = Math.floor((accent ? 0.95 : 0.62) * sr);
  let phase = 0;
  let noiseLp = 0;
  for (let j = 0; j < length; j++) {
    const age = j / sr;
    const f = 44 + 78 * Math.exp(-age * 24);
    phase += (TAU * f) / sr;
    const attack = 1 - Math.exp(-age * 1100);
    const bodyEnv = Math.exp(-age * (accent ? 6.4 : 8.4)) * attack;
    const body = Math.sin(phase) * 0.34;
    const sub = Math.sin(TAU * 41.2 * age) * Math.exp(-age * 5.2) * 0.15;
    const click = (rnd() * 2 - 1) * Math.exp(-age * 105) * 0.025;
    const woodNoise = (rnd() * 2 - 1) * Math.exp(-age * 24) * (accent ? 0.02 : 0.009);
    noiseLp += 0.16 * (woodNoise - noiseLp);
    const s = (body + sub + click) * bodyEnv * strength + noiseLp;
    add(startIndex + j, s * 0.97, s * 0.97);
  }
  if (accent) {
    let secondPhase = 0;
    const secondStart = startIndex + Math.floor(0.115 * sr);
    for (let j = 0; j < Math.floor(0.38 * sr); j++) {
      const age = j / sr;
      const f = 46 + 40 * Math.exp(-age * 24);
      secondPhase += (TAU * f) / sr;
      const env = Math.exp(-age * 10.5) * (1 - Math.exp(-age * 900));
      const s = Math.sin(secondPhase) * 0.13 * env * strength;
      add(secondStart + j, s, s);
    }
  }
};

const totalBeats = Math.floor(dur / beatSeconds);
for (let beat = 0; beat < totalBeats; beat++) {
  const accent = beat % 4 === 0;
  addKick(beat * beatSeconds, accent ? 0.72 : 0.4, accent);
}

// Quiet brush on the second off-beat of each bar.
for (let beat = 2; beat < totalBeats; beat += 4) {
  const start = Math.floor((beat * beatSeconds + 0.012) * sr);
  let lp = 0;
  for (let j = 0; j < Math.floor(0.22 * sr); j++) {
    const age = j / sr;
    const env = Math.exp(-age * 19) * (1 - Math.exp(-age * 240));
    const white = rnd() * 2 - 1;
    lp += 0.06 * (white - lp);
    const pan = beat % 8 === 2 ? -0.2 : 0.2;
    const s = lp * 0.12 * env;
    add(start + j, s * (1 - pan), s * (1 + pan));
  }
}

// ---- Sparse bell motif ----
const addBell = (start, frequency, amplitude, pan, decay = 1.5) => {
  const startIndex = Math.floor(start * sr);
  const length = Math.min(n - startIndex, Math.floor((2.6 / decay) * sr));
  for (let j = 0; j < length; j++) {
    const age = j / sr;
    const env = (1 - Math.exp(-age * 140)) * Math.exp(-age * decay);
    const tone =
      Math.sin(TAU * frequency * age) +
      0.26 * Math.sin(TAU * frequency * 2.01 * age + 0.3) +
      0.08 * Math.sin(TAU * frequency * 3.97 * age + 1.1);
    const s = tone * amplitude * env;
    add(startIndex + j, s * (1 - pan) * 0.5, s * (1 + pan) * 0.5);
  }
};

const motif = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 783.99, 659.25];
for (let step = 0, beat = 0; beat < totalBeats; beat += 16, step++) {
  addBell(beat * beatSeconds, motif[step % motif.length], 0.017, step % 2 ? 0.2 : -0.2, 1.15);
}

for (const s of timeline) {
  if (s.kind === "chapter") {
    addBell(s.start + 0.18, 130.81, 0.05, -0.1, 0.75);
    addBell(s.start + 0.18, 196.0, 0.032, 0.12, 0.8);
  }
  if (s.kind === "outro") {
    addBell(s.start + 0.3, 261.63, 0.04, -0.05, 0.55);
    addBell(s.start + 0.3, 392.0, 0.028, 0.1, 0.6);
  }
  if (s.kind === "title") {
    addBell(0.7, 261.63, 0.03, 0.0, 0.9);
  }
}

// Broad echo.
const delayL = Math.floor(0.187 * sr);
const delayR = Math.floor(0.231 * sr);
for (let i = Math.max(delayL, delayR); i < n; i++) {
  left[i] += right[i - delayL] * 0.08;
  right[i] += left[i - delayR] * 0.07;
}

// ---- Duck the bed under narration ----
for (const s of timeline) {
  if (!s.vo) continue;
  const from = Math.floor(s.voStart * sr);
  const to = Math.min(n, Math.floor((s.voStart + (voDur[s.vo] ?? 0)) * sr));
  for (let i = from; i < to; i++) duck[i] = 1;
}
let env = 0.92;
for (let i = 0; i < n; i++) {
  const target = duck[i] > 0 ? 0.52 : 0.92;
  env += (target - env) * 0.00028;
  const fade = smooth(0, 1.2, i / sr) * (1 - smooth(dur - 4.2, dur, i / sr));
  left[i] *= env * fade;
  right[i] *= env * fade;
}

let peak = 0;
for (let i = 0; i < n; i++) {
  left[i] = Math.tanh(left[i] * 1.15);
  right[i] = Math.tanh(right[i] * 1.15);
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}

const gain = 0.74 / (peak || 1);
const dataSize = n * 2 * 2;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(sr, 24);
buffer.writeUInt32LE(sr * 2 * 2, 28);
buffer.writeUInt16LE(4, 32);
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

const out = path.resolve("public/film/bgm-full.wav");
fs.writeFileSync(out, buffer);
console.log("wrote", out, "duration", dur.toFixed(2), "bytes", buffer.length);
