// Renders a frame range of Love to an mp4 chunk (video only).
// usage: node scripts/render-chunk.mjs <startFrame> <endFrame> <out.mp4>
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
const [, , a, b, out] = process.argv;
const chromiumOptions = { gl: "swangle" };
const buildDir = path.resolve("build");
let serveUrl = buildDir;
if (!fs.existsSync(path.join(buildDir, "index.html"))) {
  serveUrl = await bundle({ entryPoint: path.resolve("src/index.tsx"), outDir: buildDir });
}
const composition = await selectComposition({ serveUrl, id: "Love", chromiumOptions });
const t0 = Date.now();
await renderMedia({
  serveUrl,
  composition,
  codec: "h264",
  crf: 20,
  muted: true,
  frameRange: [Number(a), Number(b)],
  outputLocation: out,
  chromiumOptions,
  concurrency: 2,
  imageFormat: "jpeg",
  jpegQuality: 92,
});
console.log(`chunk ${a}-${b} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
