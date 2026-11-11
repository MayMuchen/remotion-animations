import sceneData from "./scenes-v2.json";
import voDurations from "./vo-durations-v2.json";

export type SceneKind = "title" | "chapter" | "scene" | "outro";
export type Tone = "warm" | "cool";
export type Motion = "push" | "pull" | "left" | "right" | "through";
export type TransitionKind = "vortex" | "portal" | "flip" | "converge";

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

// Cut grammar. Long dissolves were what made the film feel slow: every seam
// used to hold for 0.78s on both sides, so nothing ever "landed". A tighter
// seam that resolves fast reads as intent rather than drift.
export const TRANSITION_SECONDS = 0.5;
export const CHAPTER_TRANSITION_SECONDS = 0.62;

// The signature shot: the camera pulls back to reveal the two silhouettes and
// the gap between them, then dives through it. Anchored to absolute film time
// so that re-timing the earlier scenes can never make it drift.
export const THROUGH_START_SECONDS = 27;
export const THROUGH_LENGTH_SECONDS = 2.6;

const DEFAULT_LEAD = 0.08;
const DEFAULT_TAIL = 0.3;

const TRANSITIONS: TransitionKind[] = ["vortex", "portal", "flip"];

let cursor = 0;

export const SCENES = defs.map((def, index) => {
  const voDuration = def.vo ? (voice[def.vo] ?? 0) : 0;
  const lead = def.lead ?? DEFAULT_LEAD;
  const tail = def.tail ?? DEFAULT_TAIL;
  const body = Math.max(def.duration ?? 0, voDuration + lead + tail);
  const start = cursor;
  cursor += body;
  const hasIn = index > 0;
  const previous = defs[index - 1];
  const next = defs[index + 1];
  const normalIn = TRANSITIONS[(index - 1 + TRANSITIONS.length) % TRANSITIONS.length];
  const normalOut = TRANSITIONS[index % TRANSITIONS.length];
  // Every edit that touches a chapter uses a particle convergence instead of
  // the regular portal/flip grammar. The previous scene collapses inward, the
  // chapter particles assemble the title, then the next scene bursts out.
  const chapterIn = previous?.kind === "chapter" || def.kind === "chapter";
  const chapterOut = def.kind === "chapter" || next?.kind === "chapter";
  const inTransition: TransitionKind = chapterIn ? "converge" : normalIn;
  const outTransition: TransitionKind = chapterOut ? "converge" : normalOut;
  const seam = (kind: TransitionKind) =>
    kind === "converge" ? CHAPTER_TRANSITION_SECONDS : TRANSITION_SECONDS;
  const inDuration = hasIn ? seam(inTransition) : 0;
  return {
    ...def,
    start,
    duration: body,
    voDuration,
    voStart: start + lead,
    inDuration,
    outDuration: index < defs.length - 1 ? seam(outTransition) : 0,
    inTransition,
    outTransition,
    visualFrom: hasIn ? start - inDuration : 0,
    visualDuration: body + inDuration,
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

