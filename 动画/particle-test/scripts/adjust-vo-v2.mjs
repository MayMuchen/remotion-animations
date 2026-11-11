import fs from "node:fs";
const p = "src/film/voiceover-v2.json";
const data = JSON.parse(fs.readFileSync(p, "utf8"));
for (const seg of data) {
  for (const chunk of seg.chunks) {
    const n = Number.parseFloat(String(chunk.rate).replace("%", ""));
    const next = Math.max(-8, Math.min(4, n - 5));
    chunk.rate = `${next > 0 ? "+" : ""}${next}%`;
    // The new narrator already has a deeper timbre; dropping the pitch a
    // little more keeps it intimate instead of pitching it down unnaturally.
    const pch = Number.parseFloat(String(chunk.pitch).replace("Hz", ""));
    const nextPitch = Math.max(-6, Math.min(0, pch - 1));
    chunk.pitch = `${nextPitch > 0 ? "+" : ""}${nextPitch}Hz`;
  }
}
fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify(data.slice(0, 4), null, 2));
