import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ffmpeg = path.resolve("node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const dir = path.resolve("public/film/vo-v2");

const readWav = (file) => {
  const b = fs.readFileSync(file);
  let off = 12;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "data") { off += 8; break; }
    off += 8 + size + (size & 1);
  }
  const n = Math.floor((b.length - off) / 2);
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) pcm[i] = b.readInt16LE(off + i * 2) / 32768;
  return pcm;
};

const SR = 24000;
const f0 = (pcm) => {
  const win = 1024, hop = 240;
  const vals = [];
  for (let s = 0; s + win < pcm.length; s += hop) {
    let e = 0;
    for (let i = 0; i < win; i++) e += pcm[s + i] * pcm[s + i];
    if (Math.sqrt(e / win) < 0.02) continue;
    let best = 0, bestLag = 0;
    for (let lag = 60; lag <= 340; lag++) {
      let c = 0, n1 = 0, n2 = 0;
      for (let i = 0; i + lag < win; i++) {
        c += pcm[s + i] * pcm[s + i + lag];
        n1 += pcm[s + i] * pcm[s + i];
        n2 += pcm[s + i + lag] * pcm[s + i + lag];
      }
      const r = c / Math.sqrt(n1 * n2 + 1e-12);
      if (r > best) { best = r; bestLag = lag; }
    }
    if (best > 0.55 && bestLag > 0) vals.push(SR / bestLag);
  }
  return vals;
};

const stats = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const mean = a.reduce((x, y) => x + y, 0) / a.length;
  const sd = Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / a.length);
  return { p10: s[Math.floor(s.length * 0.1)], med: s[Math.floor(s.length * 0.5)], p90: s[Math.floor(s.length * 0.9)], mean, sd };
};

const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".wav")).sort()) {
  const pcm = readWav(path.join(dir, f));
  const dur = pcm.length / SR;
  let sum = 0, active = 0;
  const env = [];
  const hop = 480;
  for (let s = 0; s + hop < pcm.length; s += hop) {
    let e = 0;
    for (let i = 0; i < hop; i++) e += pcm[s + i] * pcm[s + i];
    const r = Math.sqrt(e / hop);
    env.push(r);
    if (r > 0.01) active++;
  }
  sum = env.reduce((a, b) => a + b, 0) / env.length;
  const esd = Math.sqrt(env.reduce((a, b) => a + (b - sum) ** 2, 0) / env.length);
  const p = stats(f0(pcm));
  rows.push({
    id: f.replace(".wav", ""), dur: +dur.toFixed(2),
    speechPct: +(100 * active / env.length).toFixed(0),
    envCV: +(esd / sum).toFixed(2),
    f0med: p ? +p.med.toFixed(0) : null,
    f0sd: p ? +p.sd.toFixed(1) : null,
    f0range: p ? +(p.p90 - p.p10).toFixed(0) : null,
  });
}
console.table(rows);
const avgSd = rows.filter((r) => r.f0sd).reduce((a, b) => a + b.f0sd, 0) / rows.filter((r) => r.f0sd).length;
console.log("mean f0 SD", avgSd.toFixed(2), "mean f0 range", (rows.reduce((a,b)=>a+b.f0range,0)/rows.length).toFixed(1));
