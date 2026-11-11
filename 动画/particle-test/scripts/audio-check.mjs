import {readFileSync} from "node:fs";

const file = process.argv[2];
const buf = readFileSync(file);
// parse RIFF
let off = 12;
let fmt = null, dataOff = -1, dataLen = 0;
while (off + 8 <= buf.length) {
  const id = buf.toString("ascii", off, off + 4);
  const size = buf.readUInt32LE(off + 4);
  if (id === "fmt ") {
    fmt = {channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22)};
  } else if (id === "data") {
    dataOff = off + 8; dataLen = size; break;
  }
  off += 8 + size + (size % 2);
}
const {channels, rate} = fmt;
const frames = Math.floor(dataLen / (2 * channels));
let peak = 0, sum = 0, clip = 0;
const win = rate; // 1s
let winSum = 0, winN = 0;
const rows = [];
for (let i = 0; i < frames; i++) {
  for (let c = 0; c < channels; c++) {
    const v = buf.readInt16LE(dataOff + (i * channels + c) * 2) / 32768;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    if (a >= 0.9999) clip++;
    sum += v * v; winSum += v * v; winN++;
  }
  if ((i + 1) % win === 0) {
    const rms = Math.sqrt(winSum / winN);
    rows.push({t: (i + 1) / rate - 1, rms, db: 20 * Math.log10(rms + 1e-9)});
    winSum = 0; winN = 0;
  }
}
const totalRms = Math.sqrt(sum / (frames * channels));
console.log(JSON.stringify({file, seconds: (frames / rate).toFixed(2), peakDb: (20 * Math.log10(peak)).toFixed(2), rmsDb: (20 * Math.log10(totalRms)).toFixed(2), clipSamples: clip}));
for (const r of rows) {
  console.log(`t=${r.t.toFixed(0).padStart(3)}s  ${r.db.toFixed(1).padStart(6)} dB`);
}
