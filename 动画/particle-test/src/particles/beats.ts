export const BPM = 96;
export const BEAT_SECONDS = 60 / BPM;

const ACCENT_BEATS = new Set([0, 4, 8, 12, 14, 15]);

export type Beat = {
  index: number;
  time: number;
  strength: number;
  accent: boolean;
};

export const BEAT_TIMES: Beat[] = Array.from({ length: 16 }, (_, index) => {
  const accent = ACCENT_BEATS.has(index);
  return {
    index,
    time: index * BEAT_SECONDS,
    strength: accent ? 1 : 0.55,
    accent,
  };
});

// A sharp attack followed by a soft exponential tail keeps every kick visible
// without making the particles feel like they are jumping between poses.
export const beatPulseAt = (time: number) => {
  let pulse = 0;
  for (const beat of BEAT_TIMES) {
    const age = time - beat.time;
    if (age < 0 || age > 1.8) continue;
    const attack = Math.min(1, age / 0.018);
    const tail = Math.exp(-age * 6.4);
    pulse = Math.max(pulse, beat.strength * attack * tail);
  }
  return pulse;
};

export type ActiveWave = Beat & { age: number };

export const activeWavesAt = (time: number, lifetime = 1.75): ActiveWave[] =>
  BEAT_TIMES.filter((beat) => {
    const age = time - beat.time;
    return age >= 0 && age <= lifetime;
  }).map((beat) => ({ ...beat, age: time - beat.time }));
