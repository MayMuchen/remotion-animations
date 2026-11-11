import fs from "node:fs";
let p = "src/film/ShotCanvasV2.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replaceAll("0.72 * convAmt", "0.48 * convAmt");
s = s.replaceAll("0.42 * convAmt", "0.26 * convAmt");
s = s.replaceAll("0.14 * convAmt", "0.085 * convAmt");
s = s.replaceAll("0.24 - k * 0.032", "0.15 - k * 0.022");
s = s.replaceAll("0.13 * convAmt", "0.08 * convAmt");
s = s.replace(`        const fade = p.alpha * alphaMul * trans * 0.3;`, `        const streakWeight =
          outTransition === "converge" || inTransition === "converge" ? 0.15 : 0.3;
        const fade = p.alpha * alphaMul * trans * streakWeight;`);
fs.writeFileSync(p, s);

p = "src/film/ParticleChapter.tsx";
s = fs.readFileSync(p, "utf8");
s = s.replaceAll("0.76 * core", "0.48 * core");
s = s.replaceAll("0.4 * core", "0.25 * core");
s = s.replaceAll("0.12 * core", "0.075 * core");
s = s.replaceAll("0.28 - k * 0.045", "0.18 - k * 0.028");
s = s.replace(`    ctx.lineWidth = 1.05;
    for (let i = 0; i < points.length; i++) {
      if (i % 3 !== 0) continue;`, `    ctx.lineWidth = 0.85;
    for (let i = 0; i < points.length; i++) {
      if (i % 4 !== 0) continue;`);
s = s.replace(`      ctx.globalAlpha = Math.min(0.26, alpha * 0.42);`, `      ctx.globalAlpha = Math.min(0.15, alpha * 0.2);`);
s = s.replace(`      const endAlpha = 1 - smoothstep(0.12, 1, outQ);
      const alpha = p.alpha * appear * endAlpha;`, `      const endAlpha = 1 - smoothstep(0.04, 0.74, outQ);
      const alpha = p.alpha * appear * endAlpha * (1 - 0.42 * outE);`);
s = s.replace(`        (1 + outE * 0.55);`, `        (1 + outE * 0.22);`);
fs.writeFileSync(p, s);

p = "src/film/CardsV2.tsx";
s = fs.readFileSync(p, "utf8");
s = s.replace(`  const noShift = interpolate(bodyT, [0, duration], [0, -26], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });`, `  const noShift = interpolate(bodyT, [0, duration], [0, -26], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const contentReveal = interpolate(bodyT, [0.02, 0.34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });`);
s = s.replace(`          transform: \`translateY(\${rise}px) scale(\${slam})\`,
          filter: \`blur(\${blur}px)\`,
        }}`, `          transform: \`translateY(\${rise}px) scale(\${slam})\`,
          filter: \`blur(\${blur}px)\`,
          opacity: contentReveal,
        }}`);
s = s.replace('const slam = interpolate(bodyT, [0, 0.46], [1.24, 1], {', 'const slam = interpolate(bodyT, [0, 0.46], [1.12, 1], {');
s = s.replace('const blur = interpolate(bodyT, [0, 0.4], [7, 0], {', 'const blur = interpolate(bodyT, [0, 0.4], [4, 0], {');
fs.writeFileSync(p, s);
