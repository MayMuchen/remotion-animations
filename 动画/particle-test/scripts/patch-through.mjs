import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s);
const must = (s, from, to, label) => {
  if (!s.includes(from)) throw new Error("anchor missing: " + label);
  return s.replace(from, to);
};

const storyPath = "src/film/story-v2.ts";
let story = read(storyPath);
story = must(
  story,
  'export type Motion = "push" | "pull" | "left" | "right";',
  'export type Motion = "push" | "pull" | "left" | "right" | "through";',
  "motion type",
);
write(storyPath, story);

const scenesPath = "src/film/scenes-v2.json";
let scenes = read(scenesPath);
scenes = must(
  scenes,
  '{"id":"03_faces","kind":"scene","image":"02_hands_face","vo":"03_faces","lead":0.15,"tail":0.9,"motion":"push"',
  '{"id":"03_faces","kind":"scene","image":"02_hands_face","vo":"03_faces","lead":0.15,"tail":0.9,"motion":"through"',
  "03_faces motion",
);
write(scenesPath, scenes);

const shotPath = "src/film/ShotCanvasV2.tsx";
let s = read(shotPath);

s = must(
  s,
  'const PORTAL = { x: W * 0.5, y: H * 0.46 };',
  'const PORTAL = { x: W * 0.5, y: H * 0.46 };\nconst THROUGH = { x: W * 0.512, y: H * 0.485 };',
  "through const",
);

s = must(
  s,
  '    const camP = easeOutCubic(clamp01(bodyT / Math.max(0.1, duration)));',
  `    const camP = easeOutCubic(clamp01(bodyT / Math.max(0.1, duration)));
    // Scene-local "fly through": lean into the negative space between the two
    // figures, then accelerate through the point cloud so particles sweep
    // past the lens. Timing is scene-local; 3.8s corresponds to ~27s in the cut.
    const throughStart = motion === "through" ? 3.8 : Number.POSITIVE_INFINITY;
    const throughEnd = motion === "through" ? 9.0 : Number.POSITIVE_INFINITY;
    const throughT =
      motion === "through"
        ? clamp01((bodyT - throughStart) / (throughEnd - throughStart))
        : 0;
    const throughQ = Math.pow(smoothstep(0, 1, throughT), 1.5);`,
  "through timing",
);

s = must(
  s,
  '      motion === "left" ? -0.05 : motion === "right" ? 0.05 : motion === "pull" ? -0.018 : 0.018;',
  `      motion === "left"
        ? -0.05
        : motion === "right"
          ? 0.05
          : motion === "pull"
            ? -0.018
            : motion === "through"
              ? 0.012
              : 0.018;`,
  "motion yaw",
);

s = must(
  s,
  '    const baseZoom =\n      motion === "push" ? 1 + 0.03 * camP : motion === "pull" ? 1.036 - 0.032 * camP : 1 + 0.012 * camP;',
  `    const baseZoom =
      motion === "push"
        ? 1 + 0.03 * camP
        : motion === "pull"
          ? 1.036 - 0.032 * camP
          : motion === "through"
            ? 1 + 0.01 * camP
            : 1 + 0.012 * camP;`,
  "base zoom",
);

s = must(
  s,
  `      const shakeAmp = (pulse * 0.9 + Math.max(0, Math.sin(oq * Math.PI), Math.sin(iq * Math.PI))) * 2.2;
      return {
        yaw,
        pitch,
        roll,
        spin,
        push,
        zoom,
        camX: baseCamX + Math.sin(globalT * 3.1) * shakeAmp,
        camY: baseCamY + Math.cos(globalT * 2.7) * shakeAmp,`,
  `      // Fly-through dolly. The near-fade in project() keeps the closest
      // particles from clipping into giant blobs as they pass the lens.
      push += throughQ * 1250;
      yaw += throughQ * 0.02;
      pitch -= throughQ * 0.012;
      roll += throughQ * 0.022 * Math.sin(globalT * 0.55);
      zoom += throughQ * 0.028;

      const shakeAmp =
        (pulse * 0.9 +
          Math.max(0, Math.sin(oq * Math.PI), Math.sin(iq * Math.PI)) +
          throughQ * 1.4) *
        2.2;
      return {
        yaw,
        pitch,
        roll,
        spin,
        push,
        zoom,
        camX: baseCamX + throughQ * 22 + Math.sin(globalT * 3.1) * shakeAmp,
        camY: baseCamY + throughQ * 16 + Math.cos(globalT * 2.7) * shakeAmp,`,
  "camAt through",
);

s = must(
  s,
  `    const transitioning = outQ > 0.001 || inQ < 0.999;
    const camNow = camAt(outQ, inQ);
    const camPrev = transitioning ? camAt(Math.max(0, outQ - 0.055), Math.max(0, inQ - 0.055)) : camNow;`,
  `    const transitioning = outQ > 0.001 || inQ < 0.999;
    const camNow = camAt(outQ, inQ);
    const camPrev = transitioning
      ? camAt(Math.max(0, outQ - 0.055), Math.max(0, inQ - 0.055))
      : camNow;
    const prevThroughT =
      motion === "through"
        ? clamp01((bodyT - 0.16 - throughStart) / (throughEnd - throughStart))
        : 0;
    const prevThroughQ = Math.pow(smoothstep(0, 1, prevThroughT), 1.5);
    const throughDelta = throughQ - prevThroughQ;
    const camThroughPrev: CamState = {
      ...camNow,
      push: camNow.push - throughDelta * 1250,
      camX: camNow.camX - throughDelta * 22,
      camY: camNow.camY - throughDelta * 16,
    };`,
  "camPrev",
);

s = must(
  s,
  `      return {
        x,
        y,
        scale: persp * cam.zoom,
      };`,
  `      const near = 1 - smoothstep(FOCAL * 0.7, FOCAL * 0.93, zc);

      return {
        x,
        y,
        scale: persp * cam.zoom,
        near,
      };`,
  "project near",
);

s = must(
  s,
  '    // Speed streaks on transition frames.',
  `    // Fly-through tunnel: the gap becomes a warm aperture that the camera
    // rushes into, with faint radial light streaking past.
    if (throughQ > 0.012) {
      const radius = 80 + throughQ * 260;
      const core = ctx.createRadialGradient(
        THROUGH.x,
        THROUGH.y,
        0,
        THROUGH.x,
        THROUGH.y,
        radius,
      );
      core.addColorStop(0, \`rgba(255,250,238,\${0.16 * throughQ})\`);
      core.addColorStop(0.18, \`rgba(255,222,178,\${0.1 * throughQ})\`);
      core.addColorStop(0.55, \`rgba(255,170,108,\${0.045 * throughQ})\`);
      core.addColorStop(1, "rgba(255,130,70,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = core;
      ctx.fillRect(THROUGH.x - radius, THROUGH.y - radius, radius * 2, radius * 2);

      ctx.lineWidth = 1.1;
      for (let k = 0; k < 46; k++) {
        const a =
          (k / 46) * Math.PI * 2 + globalT * 0.18 + Math.sin(k * 1.7) * 0.03;
        const r0 = 46 + (k % 6) * 13 + Math.sin(globalT * 2.1 + k) * 6;
        const r1 = r0 + 130 + throughQ * (420 + (k % 5) * 120);
        ctx.globalAlpha =
          0.045 *
          throughQ *
          (0.55 + 0.45 * Math.sin(globalT * 2.4 + k * 2.1));
        ctx.strokeStyle =
          k % 7 === 0 ? "rgba(255,248,232,1)" : "rgba(255,206,158,1)";
        ctx.beginPath();
        ctx.moveTo(THROUGH.x + Math.cos(a) * r0, THROUGH.y + Math.sin(a) * r0);
        ctx.lineTo(THROUGH.x + Math.cos(a) * r1, THROUGH.y + Math.sin(a) * r1);
        ctx.stroke();
      }
    }

    // Speed streaks on transition frames.`,
  "through tunnel",
);

s = must(
  s,
  `    for (const p of cloud.points) {
      const pos = project(p, camNow);
      let x = pos.x;
      let y = pos.y;`,
  `    // Motion blur while the camera flies through the gap.
    if (throughQ > 0.02) {
      ctx.lineWidth = 1.25;
      for (const p of cloud.points) {
        if (p.alpha < 0.3 && p.edge < 0.4) continue;
        const a = project(p, camNow);
        if (a.near < 0.02) continue;
        const b = project(p, camThroughPrev);
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 1.5) continue;
        const fade = p.alpha * alphaMul * throughQ * a.near * 0.36;
        if (fade < 0.006) continue;
        ctx.globalAlpha = Math.min(0.42, fade);
        ctx.strokeStyle =
          p.tint === 3 ? "rgba(190,236,232,1)" : "rgba(255,224,188,1)";
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(a.x, a.y);
        ctx.stroke();
      }
    }

    for (const p of cloud.points) {
      const pos = project(p, camNow);
      if (pos.near < 0.02) continue;
      let x = pos.x;
      let y = pos.y;`,
  "through streaks + loop",
);

s = must(
  s,
  '      let alpha = p.alpha * inAlpha * outAlpha;',
  '      let alpha = p.alpha * inAlpha * outAlpha * pos.near;',
  "alpha near",
);

write(shotPath, s);
console.log("patched", {story: story.length, scenes: scenes.length, shot: s.length});
