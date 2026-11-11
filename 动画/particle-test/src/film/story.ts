import sceneData from "./scenes.json";
import voDurations from "./vo-durations.json";

export type SceneKind = "title" | "chapter" | "scene" | "outro";
export type Tone = "warm" | "cool";
export type Motion = "push" | "pull" | "left" | "right";

type SceneDef = {
  id: string;
  kind: SceneKind;
  duration?: number;
  image?: string;
  vo?: string;
  lead?: number;
  tail?: number;
  motion?: Motion;
  tone?: Tone;
  density?: number;
  seed?: number;
  lines?: string[];
  en?: string;
  title?: string;
  sub?: string;
  kicker?: string;
  credit?: string;
  chapterNo?: string;
  chapterTitle?: string;
  chapterSub?: string;
};

const voice = voDurations as Record<string, number>;
const defs = sceneData as SceneDef[];

let cursor = 0;

export const SCENES = defs.map((def) => {
  const voDuration = def.vo ? (voice[def.vo] ?? 0) : 0;
  const seconds =
    def.duration ??
    voDuration + (def.lead ?? 0.6) + (def.tail ?? 1.7);
  const start = cursor;
  cursor += seconds;
  return {
    ...def,
    start,
    duration: seconds,
    voDuration,
    voStart: start + (def.lead ?? 0.6),
  };
});

export type Scene = (typeof SCENES)[number];

export const TOTAL_SECONDS = cursor;
export const FILM_FPS = 24;
export const TOTAL_FRAMES = Math.round(TOTAL_SECONDS * FILM_FPS);

export const CHAPTER_TIMES = SCENES.filter(
  (scene) => scene.kind === "chapter",
).map((scene) => scene.start);

export const sceneById = (id: string) => {
  const found = SCENES.find((scene) => scene.id === id);
  if (!found) throw new Error(`Unknown scene: ${id}`);
  return found;
};
