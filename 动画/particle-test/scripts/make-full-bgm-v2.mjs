import fs from "node:fs";
import path from "node:path";

const scenes = JSON.parse(fs.readFileSync("src/film/scenes-v2.json", "utf8"));
const voDur = JSON.parse(fs.readFileSync("src/film/vo-durations-v2.json", "utf8"));

let cursor = 0;
const timeline = scenes.map((s) => {
  const voDuration = s.vo ? voDur[s.vo] ?? 0 : 0;
  const body = Math.max(
    s.duration ?? 0,
    voDuration + (s.lead ?? 0.15) + (s.tail ?? 0.9),
  );
  const entry = {
    ...s,
    start: cursor,
    duration: body,
    voDuration,
    voStart: cursor + (s.lead ?? 0.15),
  };
  cursor += body;
  return entry;
});

const dur = Math.ceil((cursor + 0.5) * 100) / 100;
const sr = 44100;
const n = Math.floor(sr * dur);
const TAU = Math.PI * 2;
const left = new Float32Array(n);
const right = new Float32Array(n);
const duck = new Float32Array(n);

let seed = 20261107;
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

// ---- Breathing string pad: warmer, more forward than the first cut ----
const chords = [
  [65.41, 98.0, 130.81, 164.81, 196.0, 261.63], // C
  [55.0, 82.41, 110.0, 130.81, 164.81, 220.0], // Am
  [87.31, 130.81, 174.61, 220.0, 261.63, 349.23], // F
  [98.0, 146.83, 196.0, 246.94, 293.66, 392.0], // G
];
const chordLen = 16;
const xfade = 3.4;

const chordAt = (t, freqs, gain, phaseBase) => {
  let l = 0;
  let r = 0;
  for (let k = 0; k < freqs.length; k++) {
    const f = freqs[k];
    const movement =
      0.7 + 0.3 * Math.sin(TAU * (0.043 + k * 0.007) * t + k * 1.7 + phaseBase);
    const amp = (gain / (1 + k * 0.14)) * movement;
    const drift = 1 + 0.0019 * Math.sin(TAU * 0.057 * t + k + phaseBase);
    l += amp * Math.sin(TAU * f * drift * t + k * 0.63 + phaseBase);
    r += amp * Math.sin(TAU * f * (2 - drift) * t + k * 1.12 + 0.4 + phaseBase);
    l += amp * 0.22 * Math.sin(TAU * f * 2.003 * t + k + phaseBase);
    r += amp * 0.22 * Math.sin(TAU * f * 1.997 * t + k + 0.7 + phaseBase);
  }
  return [l, r];
};

for (let i = 0; i < n; i++) {
  const t = i / sr;
  const pos = t / chordLen;
  const idx = Math.floor(pos) % chords.length;
  const local = t - Math.floor(pos) * chordLen;
  const nextIdx = (idx + 1) % chords.length;

  const env = smooth(0, 2.2, t) * (1 - smooth(dur - 5.6, dur, t));
  let [l, r] = chordAt(t, chords[idx], 0.034, idx * 1.31);

  if (local > chordLen - xfade) {
    const mix = smooth(0, 1, (local - (chordLen - xfade)) / xfade);
    const [nl, nr] = chordAt(t, chords[nextIdx], 0.034 * mix, nextIdx * 1.31);
    l = l * (1 - mix * 0.82) + nl;
    r = r * (1 - mix * 0.82) + nr;
  }

  const drone = Math.sin(TAU * 32.7 * t) * 0.024 * (0.62 + 0.38 * Math.sin(TAU * 0.023 * t));
  l += drone;
  r += drone * 0.95;

  const air = (rnd() * 2 - 1) * 0.0055;
  l += air * (0.7 + 0.3 * Math.sin(TAU * 0.09 * t));
  r += (rnd() * 2 - 1) * 0.0048;

  add(i, l * env, r * env);
}

// ---- Kick / heartbeat at 96 BPM, with a more physical low end ----
const beatSeconds = 60 / 96;
const addKick = (start, strength, accent) => {
  const startIndex = Math.floor(start * sr);
  const length = Math.floor((accent ? 1.02 : 0.68) * sr);
  let phase = 0;
  let noiseLp = 0;
  for (let j = 0; j < length; j++) {
    const age = j / sr;
    const f = 42 + 84 * Math.exp(-age * 26);
    phase += (TAU * f) / sr;
    const attack = 1 - Math.exp(-age * 1300);
    const bodyEnv = Math.exp(-age * (accent ? 5.8 : 8.0)) * attack;
    const body = Math.sin(phase) * 0.42;
    const sub = Math.sin(TAU * 38.5 * age) * Math.exp(-age * 4.8) * 0.2;
    const click = (rnd() * 2 - 1) * Math.exp(-age * 120) * 0.028;
    const woodNoise = (rnd() * 2 - 1) * Math.exp(-age * 24) * (accent ? 0.025 : 0.01);
    noiseLp += 0.17 * (woodNoise - noiseLp);
    const s = (body + sub + click) * bodyEnv * strength + noiseLp;
    add(startIndex + j, s * 0.96, s * 0.96);
  }
  if (accent) {
    let secondPhase = 0;
    const secondStart = startIndex + Math.floor(0.108 * sr);
    for (let j = 0; j < Math.floor(0.42 * sr); j++) {
      const age = j / sr;
      const f = 47 + 48 * Math.exp(-age * 22);
      secondPhase += (TAU * f) / sr;
      const env = Math.exp(-age * 9.2) * (1 - Math.exp(-age * 900));
      const s = Math.sin(secondPhase) * 0.16 * env * strength;
      add(secondStart + j, s, s);
    }
  }
};

const totalBeats = Math.floor(dur / beatSeconds);
for (let beat = 0; beat < totalBeats; beat++) {
  const accent = beat % 4 === 0;
  addKick(beat * beatSeconds, accent ? 0.92 : 0.52, accent);
}

// Eighth-note air / brushed texture gives the cut more forward motion.
for (let beat = 0; beat < totalBeats; beat++) {
  for (const half of [0.5, 1.0]) {
    if (half === 1.0 && beat % 4 === 3) continue;
    const start = Math.floor((beat * beatSeconds + half * beatSeconds * 0.5) * sr);
    let lp = 0;
    const len = Math.floor(0.075 * sr);
    for (let j = 0; j < len; j++) {
      const age = j / sr;
      const env = Math.exp(-age * 52) * (1 - Math.exp(-age * 900));
      const white = rnd() * 2 - 1;
      lp += 0.09 * (white - lp);
      const s = (white - lp) * 0.038 * env * (half === 0.5 ? 1 : 0.65);
      const pan = half === 0.5 ? -0.16 : 0.16;
      add(start + j, s * (1 - pan), s * (1 + pan));
    }
  }
}

// ---- Transition whooshes and impacts, timed to the 0.78s edits ----
const addWhoosh = (end, strength) => {
  const length = 0.95;
  const startIndex = Math.floor((end - length) * sr);
  let fast = 0;
  let slow = 0;
  for (let j = 0; j < Math.floor(length * sr); j++) {
    const age = j / sr;
    const q = age / length;
    const env = Math.pow(q, 2.2) * (1 - smooth(0.88, 1, q));
    const a = 0.005 + 0.11 * Math.pow(q, 1.7);
    const white = rnd() * 2 - 1;
    fast += a * (white - fast);
    slow += a * 0.23 * (white - slow);
    const band = fast - slow;
    const pan = -0.55 + q * 1.1;
    add(startIndex + j, band * env * strength * (1 - pan), band * env * strength * (1 + pan));
  }
};

const addImpact = (at, strength) => {
  const startIndex = Math.floor(at * sr);
  let phase = 0;
  for (let j = 0; j < Math.floor(2.2 * sr); j++) {
    const age = j / sr;
    const f = 27 + 52 * Math.exp(-age * 7.5);
    phase += (TAU * f) / sr;
    const env = Math.exp(-age * 3.0) * (1 - Math.exp(-age * 420));
    const s = Math.sin(phase) * 0.28 * env * strength;
    add(startIndex + j, s, s);
  }
  let lp = 0;
  for (let j = 0; j < Math.floor(0.32 * sr); j++) {
    const age = j / sr;
    const env = Math.exp(-age * 21) * (1 - Math.exp(-age * 600));
    const white = rnd() * 2 - 1;
    lp += 0.12 * (white - lp);
    const s = lp * 0.09 * env * strength;
    add(startIndex + j, s * 0.8, s * 1.2);
  }
};

for (const boundary of timeline.slice(1).map((s) => s.start)) {
  addWhoosh(boundary, 0.24);
}
for (const s of timeline) {
  if (s.kind === "chapter") addImpact(s.start, 0.62);
  if (s.kind === "title") addImpact(0.12, 0.7);
  if (s.kind === "outro") addImpact(s.start, 0.5);
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
  addBell(beat * beatSeconds + 0.06, motif[step % motif.length], 0.018, step % 2 ? 0.2 : -0.2, 1.12);
}
for (const s of timeline) {
  if (s.kind === "chapter") {
    addBell(s.start + 0.16, 130.81, 0.05, -0.1, 0.72);
    addBell(s.start + 0.16, 196.0, 0.032, 0.12, 0.78);
  }
  if (s.kind === "outro") {
    addBell(s.start + 0.28, 261.63, 0.05, -0.05, 0.52);
    addBell(s.start + 0.28, 392.0, 0.034, 0.1, 0.57);
  }
}

// Broad stereo echo.
const delayL = Math.floor(0.187 * sr);
const delayR = Math.floor(0.231 * sr);
for (let i = Math.max(delayL, delayR); i < n; i++) {
  left[i] += right[i - delayL] * 0.075;
  right[i] += left[i - delayR] * 0.065;
}

// ---- Duck under narration, but keep the pulse alive ----
for (const s of timeline) {
  if (!s.vo) continue;
  const from = Math.floor(Math.max(0, s.voStart - 0.08) * sr);
  const to = Math.min(n, Math.floor((s.voStart + (voDur[s.vo] ?? 0) + 0.14) * sr));
  for (let i = from; i < to; i++) duck[i] = 1;
}
let env = 0.94;
for (let i = 0; i < n; i++) {
  const target = duck[i] > 0 ? 0.68 : 0.94;
  env += (target - env) * 0.00036;
  const fade = smooth(0, 1.0, i / sr) * (1 - smooth(dur - 4.4, dur, i / sr));
  left[i] *= env * fade;
  right[i] *= env * fade;
}

let peak = 0;
for (let i = 0; i < n; i++) {
  left[i] = Math.tanh(left[i] * 1.12);
  right[i] = Math.tanh(right[i] * 1.12);
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}

const gain = 0.71 / (peak || 1);
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

const out = path.resolve("public/film/bgm-v2.wav");
fs.writeFileSync(out, buffer);
console.log("wrote", out, "duration", dur.toFixed(2), "bytes", buffer.length);
