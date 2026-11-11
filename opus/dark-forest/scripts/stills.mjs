// Renders preview stills: node scripts/stills.mjs <outDir> <scale> frame1 frame2 ...
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [, , out, scale, ...frames] = process.argv;
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions });
const composition = await selectComposition({ serveUrl, id: "DarkForest", puppeteerInstance: browser, chromiumOptions });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: Number(f), output: `${out}/f${String(f).padStart(4, "0")}.jpg`, imageFormat: "jpeg", scale: Number(scale), puppeteerInstance: browser, chromiumOptions });
  console.log("frame", f);
}
await browser.close({ silent: true });
