import { continueRender, delayRender, staticFile } from "remotion";

export const SERIF =
  '"DF Love Serif", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "SimSun", serif';
export const SANS =
  '"DF Love Sans", "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const MONO = '"DF Love Mono", "DejaVu Sans Mono", "Consolas", "Menlo", monospace';

const FONTS: [string, string, string][] = [
  ["DF Love Serif", "fonts/serif-bold.ttf", "700"],
  ["DF Love Sans", "fonts/sans-regular.ttf", "400"],
  ["DF Love Mono", "fonts/mono.ttf", "400"],
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