import sceneData from "./scenes-v2.json";
import type { Scene, TransitionKind } from "./story-v2";

// The silent cut keeps the same visual grammar as V2, but the timeline is
// driven by picture rhythm instead of narration length. At 24 fps this lands
// at roughly 90 seconds: long enough for each image to register, short enough
// that the film moves on before a still image can become wallpaper.
const SILENT_SECONDS: Record<string, number> = {
  title: 4.0,
  "01_open": 4.4,
  "02_keller": 5.0,
  ch1: 1.2,
  "03_faces": 7.8,
  "04_memory": 4.2,
  "05_ordinary": 4.0,
  ins_skin: 2.3,
  "06_street": 4.8,
  "07_day1_end": 4.3,
  ch2: 1.2,
  "08_dawn": 3.4,
  "09_museum": 4.0,
  "10_statue": 4.5,
  "11_theater": 5.0,
  ch3: 1.2,
  "12_city": 4.6,
  "13_crowd": 4.4,
  "14_sunset": 4.0,
  "15_quote": 4.6,
  "16_final": 5.5,
  "17_outro": 5.4,
};

type SceneDef = {
  id: string;
  kind: string;
  duration?: number;
  motion?: string;
  tone?: string;
};

const defs = sceneData as SceneDef[];

// Faster seams than V2. The shot-to-shot overlap is shorter, so cuts land
// with intent; the chapter convergence still gets a little more room.
export const TRANSITION_SECONDS_V3 = 0.38;
export const CHAPTER_TRANSITION_SECONDS_V3 = 0.54;

// The fly-through is anchored to the new cut's absolute clock. Scene 03 starts
// at 14.6s, so 18.4s leaves 3.8s to read the two silhouettes and the gap before
// the camera dives through it.
export const THROUGH_START_SECONDS_V3 = 18.4;
export const THROUGH_LENGTH_SECONDS_V3 = 2.6;

const TRANSITIONS: TransitionKind[] = ["vortex", "portal", "flip"];

let cursor = 0;

export const SCENES_V3_SILENT: Scene[] = defs.map((def, index) => {
  const body = SILENT_SECONDS[def.id] ?? def.duration ?? 4;
  const start = cursor;
  cursor += body;
  const hasIn = index > 0;
  const previous = defs[index - 1];
  const next = defs[index + 1];
  const normalIn = TRANSITIONS[(index - 1 + TRANSITIONS.length) % TRANSITIONS.length];
  const normalOut = TRANSITIONS[index % TRANSITIONS.length];
  const chapterIn = previous?.kind === "chapter" || def.kind === "chapter";
  const chapterOut = def.kind === "chapter" || next?.kind === "chapter";
  const inTransition: TransitionKind = chapterIn ? "converge" : normalIn;
  const outTransition: TransitionKind = chapterOut ? "converge" : normalOut;
  const seam = (kind: TransitionKind) =>
    kind === "converge"
      ? CHAPTER_TRANSITION_SECONDS_V3
      : TRANSITION_SECONDS_V3;
  const inDuration = hasIn ? seam(inTransition) : 0;
  return {
    ...def,
    start,
    duration: body,
    voDuration: 0,
    voStart: start,
    inDuration,
    outDuration: index < defs.length - 1 ? seam(outTransition) : 0,
    inTransition,
    outTransition,
    visualFrom: hasIn ? start - inDuration : 0,
    visualDuration: body + inDuration,
  } as Scene;
});

export const TOTAL_SECONDS_V3_SILENT = cursor;
export const TOTAL_FRAMES_V3_SILENT = Math.round(TOTAL_SECONDS_V3_SILENT * 24);

const smoothstep = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

// No dialogue means no ducking. The score can sit at a consistent level, with
// a short fade at both ends instead of breathing around narration.
export const bgmVolumeAtV3 = (time: number) => {
  const fadeIn = smoothstep(time / 1.2);
  const fadeOut = smoothstep((TOTAL_SECONDS_V3_SILENT - time) / 3.2);
  return 0.94 * Math.min(fadeIn, fadeOut);
};
