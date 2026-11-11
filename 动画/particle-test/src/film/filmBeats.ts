export const BPM = 96;
export const BEAT_SECONDS = 60 / BPM;

export type FilmBeat = {
  index: number;
  time: number;
  strength: number;
  accent: boolean;
};

const MAX_SECONDS = 280;

export const FILM_BEATS: FilmBeat[] = Array.from(
  { length: Math.floor(MAX_SECONDS / BEAT_SECONDS) },
  (_, index) => {
    const accent = index % 4 === 0;
    return {
      index,
      time: index * BEAT_SECONDS,
      strength: accent ? 1 : 0.52,
      accent,
    };
  },
);

export const filmPulseAt = (time: number) => {
  let pulse = 0;
  for (const beat of FILM_BEATS) {
    const age = time - beat.time;
    if (age < 0) break;
    if (age > 1.8) continue;
    const attack = Math.min(1, age / 0.018);
    const tail = Math.exp(-age * 6.2);
    pulse = Math.max(pulse, beat.strength * attack * tail);
  }
  return pulse;
};

export type ActiveFilmWave = FilmBeat & { age: number };

export const activeFilmWavesAt = (time: number, lifetime = 1.75) =>
  FILM_BEATS.filter((beat) => {
    const age = time - beat.time;
    return age >= 0 && age <= lifetime;
  }).map((beat) => ({ ...beat, age: time - beat.time }));
