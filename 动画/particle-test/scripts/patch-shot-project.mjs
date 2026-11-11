import fs from "node:fs";
const p = "src/film/ShotCanvasV2.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replace(`    const outAlpha = outDuration > 0 ? 1 - smoothstep(0.22, 1, outQ) : 1;
    const inAlpha = inDuration > 0 ? smoothstep(0, 0.62, inQ) : 1;`, `    const outAlpha =
      outDuration > 0
        ? outTransition === "converge"
          ? 1 - smoothstep(0.18, 1, outQ)
          : 1 - smoothstep(0.22, 1, outQ)
        : 1;
    const inAlpha =
      inDuration > 0
        ? inTransition === "converge"
          ? smoothstep(0, 0.24, inQ)
          : smoothstep(0, 0.62, inQ)
        : 1;`);
s = s.replace(`      const zc = z2 + cam.push;
      const persp = FOCAL / Math.max(330, FOCAL - zc);
      return {
        x: W / 2 + x3 * persp * cam.zoom + cam.camX,
        y: H / 2 + y3 * persp * cam.zoom + cam.camY,
        scale: persp * cam.zoom,
      };
    };`, `      const zc = z2 + cam.push;
      const persp = FOCAL / Math.max(330, FOCAL - zc);
      let x = W / 2 + x3 * persp * cam.zoom + cam.camX;
      let y = H / 2 + y3 * persp * cam.zoom + cam.camY;

      // A true particle convergence: each point spirals into the edit point,
      // rather than merely being wiped or cross-faded away.
      const swirlDir = p.swirl >= 0 ? 1 : -1;
      if (outTransition === "converge") {
        const localOut = clamp01((cam.outQ - p.delay * 0.055) / 0.945);
        const q = smoothstep(0, 1, localOut);
        const dx = x - PORTAL.x;
        const dy = y - PORTAL.y;
        const radius = Math.hypot(dx, dy) * (1 - q * 0.968);
        const angle = Math.atan2(dy, dx) + q * (2.0 + p.z * 2.8) * swirlDir;
        x = PORTAL.x + Math.cos(angle) * radius;
        y = PORTAL.y + Math.sin(angle) * radius;
      }
      if (inTransition === "converge") {
        const localIn = clamp01((cam.inQ - p.delay * 0.018) / 0.982);
        const q = 1 - smoothstep(0, 1, localIn);
        const dx = x - PORTAL.x;
        const dy = y - PORTAL.y;
        const radius = Math.hypot(dx, dy) * (0.028 + 0.972 * (1 - q));
        const angle = Math.atan2(dy, dx) - q * (2.25 + p.z * 2.5) * swirlDir;
        x = PORTAL.x + Math.cos(angle) * radius;
        y = PORTAL.y + Math.sin(angle) * radius;
      }

      return {
        x,
        y,
        scale: persp * cam.zoom,
      };
    };`);
fs.writeFileSync(p, s);
