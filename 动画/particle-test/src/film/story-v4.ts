import { SCENES_V3_SILENT } from './story-v3';
import type { Scene } from './story-v2';

// 120 BPM: every cut lands on the half-second grid, without narration tails.
export const KINETIC_FPS = 24;
export const KINETIC_BPM = 120;
const lengths = [3, 2.5, 3, 1, 5.5, 2.5, 2.5, 1.5, 2.5, 2.5, 1, 2.5, 2.5, 3, 3, 1, 3, 3, 3, 3, 4, 4.5];
let cursor = 0;
export const KINETIC_SCENES: Scene[] = SCENES_V3_SILENT.map((scene, index) => {
  const duration = lengths[index];
  const start = cursor;
  cursor += duration;
  const inDuration = index === 0 ? 0 : 6 / KINETIC_FPS;
  return {
    ...scene, start, duration, voDuration: 0, voStart: start,
    inDuration, outDuration: index === lengths.length - 1 ? 0 : 6 / KINETIC_FPS,
    visualFrom: start - inDuration, visualDuration: duration + inDuration,
  };
});
export const KINETIC_SECONDS = cursor;
export const KINETIC_FRAMES = Math.round(cursor * KINETIC_FPS);
export const KINETIC_THROUGH_START = KINETIC_SCENES.find(s => s.id === '03_faces')!.start + 2;
export const KINETIC_CUTS = KINETIC_SCENES.slice(1).map(s => s.start);
