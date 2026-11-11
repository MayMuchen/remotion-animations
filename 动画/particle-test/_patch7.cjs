const fs = require('fs');
const p = 'src/film/ParticleTitle.tsx';
let s = fs.readFileSync(p, 'utf8');
const before = s;

s = s.replace(
`      const alpha = p.alpha * (0.1 + 0.9 * e) * (1 - Math.pow(outQ, 1.3));`,
`      // A touch more presence on the title card: it is the one frame the
      // viewer has the least context for, so the letterforms have to hold up
      // on their own before the glow is fully formed.
      const presence = variant === "title" ? 1.22 : 1.06;
      const alpha = p.alpha * presence * (0.1 + 0.9 * e) * (1 - Math.pow(outQ, 1.3));`);

s = s.replace(
`      ctx.globalAlpha = Math.min(0.92, alpha);`,
`      ctx.globalAlpha = Math.min(0.96, alpha);`);

s = s.replace(
`            color: "rgba(255,236,214,0.5)",
          }}
        >
          {sub}`,
`            color: variant === "title" ? "rgba(255,240,220,0.62)" : "rgba(255,236,214,0.5)",
          }}
        >
          {sub}`);

s = s.replace(
`      ? clamp01((t - 4.3) / 1.1) * (1 - clamp01((t - (duration - 1.5)) / 1.0))`,
`      ? clamp01((t - 4.3) / 1.1) * (1 - clamp01((t - (duration - 0.95)) / 0.85))`);

if (s === before) throw new Error('no changes applied');
fs.writeFileSync(p, s);
console.log('ok');
