import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("public/film/vo-v2");
const gain = 1.42;
for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".wav"))) {
  const file = path.join(dir, name);
  const b = fs.readFileSync(file);
  let off = 12;
  let dataOff = -1;
  let dataSize = 0;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "data") {
      dataOff = off + 8;
      dataSize = size;
      break;
    }
    off += 8 + size + (size & 1);
  }
  if (dataOff < 0) throw new Error(`No data chunk in ${file}`);
  let peak = 0;
  for (let i = 0; i < dataSize; i += 2) {
    const v = b.readInt16LE(dataOff + i) / 32768;
    const out = Math.max(-0.96, Math.min(0.96, v * gain));
    peak = Math.max(peak, Math.abs(out));
    b.writeInt16LE(Math.round(out * 32767), dataOff + i);
  }
  fs.writeFileSync(file, b);
  console.log(name, "peak", (20 * Math.log10(peak)).toFixed(2), "dBFS");
}
