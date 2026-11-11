import { continueRender, delayRender, staticFile } from "remotion";

export const SERIF =
  '"DF Serif", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "SimSun", serif';
export const SANS =
  '"DF Sans", "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const MONO = '"DF Mono", "DejaVu Sans Mono", "Consolas", "Menlo", monospace';

const FONTS: [string, string, string][] = [
  ["DF Serif", "fonts/serif-bold.woff2", "700"],
  ["DF Sans", "fonts/sans-regular.woff2", "400"],
  ["DF Mono", "fonts/mono.woff2", "400"],
];

let started = false;
export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading fonts");
  Promise.all(
    FONTS.map(([family, file, weight]) =>
      new FontFace(family, `url(${staticFile(file)})`, { weight })
        .load()
        .then((f) => document.fonts.add(f)),
    ),
  )
    .catch((e) => console.error("Font load failed", e))
    .finally(() => continueRender(handle));
};
