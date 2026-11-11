import fs from "node:fs";
const defs = JSON.parse(fs.readFileSync("src/film/scenes-v2.json", "utf8"));
const vo = JSON.parse(fs.readFileSync("src/film/vo-durations-v2.json", "utf8"));
let cursor = 0;
for (const [i,d] of defs.entries()) {
  const vd = d.vo ? vo[d.vo] : 0;
  const body = Math.max(d.duration ?? 0, vd + (d.lead ?? 0.15) + (d.tail ?? 0.9));
  const start = cursor;
  cursor += body;
  if (d.kind === "chapter" || defs[i+1]?.kind === "chapter" || defs[i-1]?.kind === "chapter") {
    console.log(d.id, {kind:d.kind,start:+start.toFixed(3),duration:+body.toFixed(3),visualFrom:+(i>0?start-0.78:0).toFixed(3),visualDuration:+(body+(i>0?0.78:0)).toFixed(3)});
  }
}
console.log("TOTAL", cursor);
