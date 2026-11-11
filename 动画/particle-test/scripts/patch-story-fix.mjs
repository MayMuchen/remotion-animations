import fs from "node:fs";
const p = "src/film/story-v2.ts";
let s = fs.readFileSync(p, "utf8").replaceAll("prev?.kind", "previous?.kind");
fs.writeFileSync(p, s);
