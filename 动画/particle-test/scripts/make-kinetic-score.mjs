import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/film/story-v4.ts'), 'utf8');
const durations = JSON.parse(source.match(/const lengths = (\[[^;]+\])/)[1]);
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'src/film/scenes-v2.json'), 'utf8'));
const sr = 48000, duration = durations.reduce((a, b) => a + b, 0), n = Math.round(duration * sr);
const l = new Float32Array(n), r = new Float32Array(n), tau = Math.PI * 2;
let seed = 472901;
const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
const add = (i, value, pan = 0) => { if (i < 0 || i >= n) return; l[i] += value * Math.sqrt((1 - pan) * 0.5); r[i] += value * Math.sqrt((1 + pan) * 0.5); };
const hz = note => 440 * 2 ** ((note - 69) / 12);
const chords = [[48, 55, 60, 63, 67], [44, 51, 56, 60, 63], [51, 58, 63, 67, 70], [46, 53, 58, 62, 65]];

// Airy orchestral-synth bed with smooth chord boundaries and stereo detuning.
for (let c = 0; c < Math.ceil(duration / 8); c++) {
  const start = c * 8, notes = chords[c % chords.length];
  for (let j = 0; j < Math.min(n - start * sr, 9 * sr); j++) {
    const t = j / sr, env = Math.min(1, t / 1.1) * Math.min(1, (9 - t) / 1.4);
    const i = Math.round(start * sr) + j;
    for (let k = 0; k < notes.length; k++) {
      const f = hz(notes[k]), amp = 0.023 * env / (1 + k * 0.15);
      l[i] += amp * (Math.sin(tau * f * t) + 0.23 * Math.sin(tau * f * 2.001 * t)) * (0.8 + 0.2 * Math.sin(t * 0.3 + k));
      r[i] += amp * (Math.sin(tau * f * 1.0012 * t + 0.4) + 0.23 * Math.sin(tau * f * 1.999 * t)) * (0.8 + 0.2 * Math.cos(t * 0.3 + k));
    }
  }
}

// An eighth-note arpeggio opens into the three-day structure. Delay is printed
// into the file so browser playback and offline rendering share one mix.
for (let step = 0; step < duration * 4; step++) {
  const start = step * 0.25;
  if (start < 2 || start > duration - 2) continue;
  const chord = chords[Math.floor(start / 8) % 4];
  const note = chord[[0, 2, 3, 1, 4, 2, 3, 1][step % 8]] + 12;
  const f = hz(note), pan = Math.sin(step * 1.7) * 0.6;
  const amp = start < 9 ? 0.025 : start < 30 ? 0.047 : 0.062;
  for (let j = 0; j < sr * 0.9; j++) {
    const t = j / sr;
    const env = Math.min(1, t / 0.007) * Math.exp(-t * 8);
    const v = amp * env * (Math.sin(tau * f * t) + 0.3 * Math.sin(tau * f * 2 * t) + 0.1 * Math.sin(tau * f * 3 * t));
    const i = Math.round(start * sr) + j;
    add(i, v, pan); add(i + Math.round(0.375 * sr), v * 0.28, -pan); add(i + Math.round(0.75 * sr), v * 0.12, pan);
  }
}

for (let beat = 0; beat < duration * 2; beat++) {
  const start = beat * 0.5;
  if (start < 3 || start > duration - 2.5) continue;
  const level = start < 9 ? 0.48 : start < 30 ? 0.78 : 1;
  // Warm low cinematic kick with a short transient rather than hard clipping.
  if (beat % 4 !== 3 || start >= 30) for (let j = 0; j < sr * 0.38; j++) {
    const t = j / sr, phase = tau * (47 * t + 42 * 0.025 * (1 - Math.exp(-t / 0.025)));
    add(Math.round(start * sr) + j, 0.3 * level * Math.sin(phase) * Math.exp(-t * 12) * Math.min(1, t / 0.002));
  }
  const f = hz(chords[Math.floor(start / 8) % 4][0] - 12);
  for (let j = 0; j < sr * 0.42; j++) {
    const t = j / sr, env = Math.min(1, t / 0.02) * Math.exp(-t * 5);
    add(Math.round((start + 0.05) * sr) + j, 0.09 * level * env * (Math.sin(tau * f * t) + 0.18 * Math.sin(tau * f * 2 * t)));
  }
  if (beat % 2 === 1) {
    let smooth = 0;
    for (let j = 0; j < sr * 0.18; j++) {
      const t = j / sr, raw = noise(); smooth += (raw - smooth) * 0.18;
      add(Math.round(start * sr) + j, ((raw - smooth) * 0.035 + Math.sin(tau * 180 * t) * 0.04) * Math.exp(-t * 25) * level, 0.1);
    }
  }
  if (start > 8) for (const offset of [0, 0.25]) {
    let smooth = 0;
    for (let j = 0; j < sr * 0.055; j++) {
      const t = j / sr, raw = noise(); smooth += (raw - smooth) * 0.15;
      add(Math.round((start + offset) * sr) + j, (raw - smooth) * 0.027 * Math.exp(-t * 70) * level, offset ? -0.5 : 0.5);
    }
  }
}

let cursor = durations[0];
for (let k = 1; k < durations.length; k++) {
  const chapter = definitions[k].kind === 'chapter';
  let low = 0;
  for (let j = 0; j < sr * 0.9; j++) {
    const t = j / sr, p = t / 0.9;
    const raw = noise(); low += (raw - low) * (0.025 + Math.sin(p * Math.PI) * 0.3);
    const env = Math.sin(Math.PI * p) ** 3;
    const v = low * env * (chapter ? 0.25 : 0.16);
    add(Math.round((cursor - 0.48) * sr) + j, v, Math.max(-1, Math.min(1, (p - 0.5) * (k % 2 ? 1.7 : -1.7))));
  }
  if (chapter || k === 4 || k === 20) for (let j = 0; j < sr * 1.2; j++) {
    const t = j / sr;
    add(Math.round(cursor * sr) + j, 0.19 * Math.sin(tau * (38 * t + 40 * 0.08 * (1 - Math.exp(-t / 0.08)))) * Math.exp(-t * 5) * Math.min(1, t / 0.003));
  }
  cursor += durations[k];
}

let peak = 0, sum = 0;
for (let i = 0; i < n; i++) {
  const t = i / sr;
  const fade = Math.min(1, t / 0.35, (duration - t) / 1.8);
  l[i] = Math.tanh(l[i] * 1.45) * fade; r[i] = Math.tanh(r[i] * 1.45) * fade;
  peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i])); sum += l[i] ** 2 + r[i] ** 2;
}
const gain = 0.88 / peak;
const wav = Buffer.alloc(44 + n * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) { wav.writeInt16LE(Math.round(l[i] * gain * 32767), 44 + i * 4); wav.writeInt16LE(Math.round(r[i] * gain * 32767), 46 + i * 4); }
const out = path.join(root, 'public/film/kinetic-score.wav');
fs.writeFileSync(out, wav);
console.log(JSON.stringify({ out, seconds: duration, bpm: 120, peakDb: 20 * Math.log10(0.88), rmsDb: 20 * Math.log10(Math.sqrt(sum / (n * 2)) * gain), voices: 0, paidServices: 0 }));
