import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const segments = JSON.parse(fs.readFileSync("src/film/voiceover-v2.json", "utf8"));
const ffmpeg = path.resolve("node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const outDir = path.resolve("public/film/vo-v2");
const workRoot = path.resolve("out/vo-v2-work");
const SR = 24000;
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(workRoot, { recursive: true, force: true });
fs.mkdirSync(workRoot, { recursive: true });

const writeWav = (file, pcm) => {
  const dataSize = pcm.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < pcm.length; i++) {
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(pcm[i] * 32767))), 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
};

class Biquad {
  constructor(b0, b1, b2, a0, a1, a2) {
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = a1 / a0; this.a2 = a2 / a0; this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}
const highpass = (f, q = 0.707) => {
  const w = 2 * Math.PI * f / SR, cs = Math.cos(w), alpha = Math.sin(w) / (2 * q);
  return new Biquad((1 + cs) / 2, -(1 + cs), (1 + cs) / 2, 1 + alpha, -2 * cs, 1 - alpha);
};
const peaking = (f, db, q = 1.1) => {
  const w = 2 * Math.PI * f / SR, cs = Math.cos(w), alpha = Math.sin(w) / (2 * q), A = Math.pow(10, db / 40);
  return new Biquad(1 + alpha * A, -2 * cs, 1 - alpha * A, 1 + alpha / A, -2 * cs, 1 - alpha / A);
};

const master = (pcm) => {
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i];
  // Closer, more present read: clean the low rumble, add chest weight and a
  // little consonant air, then tame the sibilance that Edge TTS pushes at 6.8k.
  const hp = highpass(76), e1 = peaking(200, 1.3, 1.1), e2 = peaking(4300, 1.15, 1.05), e3 = peaking(6800, -1.5, 1.4);
  for (let i = 0; i < out.length; i++) out[i] = e3.process(e2.process(e1.process(hp.process(out[i]))));

  // Gentle 2.4:1 compressor above -21 dBFS, 12 ms attack / 200 ms release.
  const th = Math.pow(10, -20 / 20), atk = Math.exp(-1 / (0.008 * SR)), rel = Math.exp(-1 / (0.18 * SR));
  let env = 0;
  for (let i = 0; i < out.length; i++) {
    const a = Math.abs(out[i]);
    env = a > env ? atk * env + (1 - atk) * a : rel * env + (1 - rel) * a;
    const db = 20 * Math.log10(env + 1e-9);
    let gr = 0;
    if (db > -20) gr = (-20 + (db + 20) / 2.6) - db;
    out[i] *= Math.pow(10, (gr + 1.5) / 20);
  }

  // A very short, dark room tail glues the phrases together and makes the
  // read feel closer and more intimate without sounding like a cathedral.
  const wet = new Float32Array(out.length);
  const taps = [
    [0.019, 0.085],
    [0.037, 0.058],
    [0.071, 0.037],
    [0.113, 0.024],
    [0.167, 0.015],
  ];
  for (const [seconds, gain] of taps) {
    const d = Math.round(seconds * SR);
    for (let i = d; i < out.length; i++) wet[i] += out[i - d] * gain;
  }
  let lp = 0;
  let wetSum = 0;
  for (let i = 0; i < wet.length; i++) {
    lp += 0.26 * (wet[i] - lp);
    wet[i] = lp;
    wetSum += Math.abs(lp);
  }
  if (wetSum > 0.0001) {
    // Dry-forward: only a whisper of room so the voice stays intimate, not washed.
    for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.98 + wet[i] * 0.22;
  }

  // Active-speech RMS to about -17 dBFS, then peak-safe soft limit.
  let sum = 0, cnt = 0;
  for (let i = 0; i < out.length; i++) { if (Math.abs(out[i]) > 0.004) { sum += out[i] * out[i]; cnt++; } }
  const rms = Math.sqrt(sum / Math.max(1, cnt));
  const gain = Math.min(5, Math.max(0.4, 0.155 / Math.max(1e-6, rms)));
  let peak = 0;
  for (let i = 0; i < out.length; i++) { out[i] = Math.tanh(out[i] * gain * 1.05) / 1.05; peak = Math.max(peak, Math.abs(out[i])); }
  if (peak > 0.94) for (let i = 0; i < out.length; i++) out[i] *= 0.94 / peak;

  const fade = Math.round(0.012 * SR);
  for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[out.length - 1 - i] *= i / fade; }
  return out;
};

const synthChunk = async (segId, index, chunk) => {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const dir = path.join(workRoot, `${segId}_${index}_${attempt}`);
    fs.mkdirSync(dir, { recursive: true });
    const tts = new MsEdgeTTS({ connectionTimeoutMs: 30000, synthesisTimeoutMs: 120000 });
    try {
      await tts.setMetadata("zh-CN-XiaoxiaoNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { sentenceBoundaryEnabled: true });
      await tts.toFile(dir, chunk.text, { rate: chunk.rate, pitch: chunk.pitch });
      const mp3 = path.join(dir, "audio.mp3");
      if (!fs.existsSync(mp3) || fs.statSync(mp3).size < 2000) throw new Error("empty audio");
      return mp3;
    } catch (e) {
      lastErr = e;
      console.log(`retry ${segId}#${index} attempt ${attempt}: ${String(e.message || e).slice(0, 100)}`);
      await new Promise((r) => setTimeout(r, 600 * attempt));
    } finally {
      tts.close();
    }
  }
  throw lastErr;
};

const decode = (mp3) => {
  const wavFile = path.join(path.dirname(mp3), "decoded.wav");
  execFileSync(ffmpeg, ["-y", "-v", "error", "-i", mp3, "-acodec", "pcm_s16le", "-ac", "1", "-ar", String(SR), wavFile]);
  const wav = fs.readFileSync(wavFile);
  let off = 12;
  while (off + 8 <= wav.length) {
    const id = wav.toString("ascii", off, off + 4);
    const size = wav.readUInt32LE(off + 4);
    if (id === "data") { off += 8; break; }
    off += 8 + size + (size & 1);
  }
  const n = Math.floor((wav.length - off) / 2);
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) pcm[i] = wav.readInt16LE(off + i * 2) / 32768;
  return pcm;
};

const trimSilence = (pcm) => {
  let a = 0, b = pcm.length - 1;
  while (a < pcm.length && Math.abs(pcm[a]) < 0.004) a++;
  while (b > a && Math.abs(pcm[b]) < 0.004) b--;
  const keep = Math.round(0.035 * SR);
  a = Math.max(0, a - keep); b = Math.min(pcm.length - 1, b + keep);
  return pcm.slice(a, b + 1);
};

const durations = {};
for (const seg of segments) {
  console.log("segment", seg.id);
  const parts = [];
  for (let i = 0; i < seg.chunks.length; i++) {
    const chunk = seg.chunks[i];
    const mp3 = await synthChunk(seg.id, i, chunk);
    parts.push(trimSilence(decode(mp3)));
    // No trailing silence after the final chunk: it only inflated the scene
    // length and pushed every cut late.
    if (i < seg.chunks.length - 1) {
      const gap = Math.round((chunk.gapMs * 0.8 / 1000) * SR);
      if (gap > 0) parts.push(new Float32Array(gap));
    }
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const joined = new Float32Array(total);
  let o = 0;
  for (const p of parts) { joined.set(p, o); o += p.length; }
  const finished = master(joined);
  const target = path.join(outDir, `${seg.id}.wav`);
  writeWav(target, finished);
  durations[seg.id] = Math.round((finished.length / SR) * 1000) / 1000;
  console.log(" ", seg.id, durations[seg.id].toFixed(2));
}
fs.writeFileSync("src/film/vo-durations-v2.json", JSON.stringify(durations, null, 2) + "\n");
console.log("VO TOTAL", Object.values(durations).reduce((a, b) => a + b, 0).toFixed(2));




