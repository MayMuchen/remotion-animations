import fs from "node:fs";
const p = "src/film/story-v2.ts";
let s = fs.readFileSync(p, "utf8");
s = s.replace('export type TransitionKind = "vortex" | "portal" | "flip";', 'export type TransitionKind = "vortex" | "portal" | "flip" | "converge";');
s = s.replace(`  const hasIn = index > 0;
  return {
    ...def,
    start,
    duration: body,
    voDuration,
    voStart: start + (def.lead ?? 0.15),
    inDuration: hasIn ? TRANSITION_SECONDS : 0,
    outDuration: index < defs.length - 1 ? TRANSITION_SECONDS : 0,
    inTransition: TRANSITIONS[(index - 1 + TRANSITIONS.length) % TRANSITIONS.length],
    outTransition: TRANSITIONS[index % TRANSITIONS.length],
    visualFrom: hasIn ? start - TRANSITION_SECONDS : 0,
    visualDuration: body + (hasIn ? TRANSITION_SECONDS : 0),
  };`, `  const hasIn = index > 0;
  const previous = defs[index - 1];
  const next = defs[index + 1];
  const normalIn = TRANSITIONS[(index - 1 + TRANSITIONS.length) % TRANSITIONS.length];
  const normalOut = TRANSITIONS[index % TRANSITIONS.length];
  // Every edit that touches a chapter uses a particle convergence instead of
  // the regular portal/flip grammar. The previous scene collapses inward, the
  // chapter particles assemble the title, then the next scene bursts out.
  const chapterIn = prev?.kind === "chapter" || def.kind === "chapter";
  const chapterOut = def.kind === "chapter" || next?.kind === "chapter";
  return {
    ...def,
    start,
    duration: body,
    voDuration,
    voStart: start + (def.lead ?? 0.15),
    inDuration: hasIn ? TRANSITION_SECONDS : 0,
    outDuration: index < defs.length - 1 ? TRANSITION_SECONDS : 0,
    inTransition: chapterIn ? "converge" : normalIn,
    outTransition: chapterOut ? "converge" : normalOut,
    visualFrom: hasIn ? start - TRANSITION_SECONDS : 0,
    visualDuration: body + (hasIn ? TRANSITION_SECONDS : 0),
  };`);
s = s.replace('const previous = defs[index - 1];', 'const previous = defs[index - 1];');
fs.writeFileSync(p, s);
