// Shared timeline (frames @ 30fps). Used by the video AND by scripts/make-audio.mts
export const FPS = 30;

export const SCENES = {
  cold: { from: 0, dur: 300 },
  title: { from: 300, dur: 240 },
  axioms: { from: 540, dur: 510 },
  suspicion: { from: 1050, dur: 420 },
  tech: { from: 1470, dur: 300 },
  forest: { from: 1770, dur: 450 },
  strike: { from: 2220, dur: 450 },
  foil: { from: 2670, dur: 390 },
  end: { from: 3060, dur: 300 },
} as const;

export const TOTAL = 3360;

// Scene-relative event frames
export const EV = {
  cold: {
    line1: 24,
    line2: 104,
    slams: [188, 220, 250],
    tvOff: 282,
  },
  title: { reveal: 96, plunge: 200 },
  axioms: { axiom2: 250 },
  suspicion: {
    lines: [40, 92, 144, 186],
    droste: 228,
    resolve: 352,
  },
  tech: { explode: 150, flash: 282 },
  forest: { lines: [10, 96, 182, 268, 344], shot: 392 },
  strike: { broadcast: 20, photoid: 140, impact: 236, aftermath: 300 },
  foil: { contact: 120, top: 300 },
  end: { quote: 20, answer: 170 },
} as const;
