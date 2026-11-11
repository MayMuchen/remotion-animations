import fs from "node:fs";
const p = "src/film/ShotCanvasV2.tsx";
let s = fs.readFileSync(p, "utf8");
const marker = `    // Speed streaks on transition frames.
    if (trans > 0.08) {`;
const insert = `    // Convergence core / event horizon used on chapter edits.
    const convOutAmt = outTransition === "converge" ? smoothstep(0.08, 1, outQ) : 0;
    const convInAmt = inTransition === "converge" ? 1 - smoothstep(0, 0.58, inQ) : 0;
    const convAmt = Math.max(convOutAmt, convInAmt);
    if (convAmt > 0.012) {
      const radius = 42 + convAmt * 245;
      const g = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, radius);
      g.addColorStop(0, \`rgba(255,251,240,\${0.72 * convAmt})\`);
      g.addColorStop(0.1, \`rgba(255,232,193,\${0.42 * convAmt})\`);
      g.addColorStop(0.38, \`rgba(255,178,116,\${0.14 * convAmt})\`);
      g.addColorStop(1, "rgba(255,126,68,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(PORTAL.x - radius, PORTAL.y - radius, radius * 2, radius * 2);

      ctx.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) {
        const rr = 44 + k * 22 + convAmt * (42 + k * 20);
        const rot = globalT * (1.3 + k * 0.31) + k * 1.2;
        ctx.globalAlpha = (0.24 - k * 0.032) * convAmt;
        ctx.strokeStyle = k === 2 ? "rgba(255,249,235,1)" : "rgba(255,194,138,1)";
        ctx.beginPath();
        ctx.arc(PORTAL.x, PORTAL.y, rr, rot, rot + 1.1 + k * 0.3);
        ctx.stroke();
      }

      ctx.lineWidth = 1.1;
      ctx.globalAlpha = 0.13 * convAmt;
      ctx.strokeStyle = "rgba(255,224,186,1)";
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2 + globalT * 0.8;
        const r0 = 34 + (k % 4) * 8;
        const r1 = r0 + 70 + convAmt * 220;
        ctx.beginPath();
        ctx.moveTo(PORTAL.x + Math.cos(a) * r0, PORTAL.y + Math.sin(a) * r0);
        ctx.lineTo(PORTAL.x + Math.cos(a) * r1, PORTAL.y + Math.sin(a) * r1);
        ctx.stroke();
      }
    }

    // Speed streaks on transition frames.
    if (trans > 0.08) {`;
if (!s.includes(marker)) throw new Error("marker not found");
s = s.replace(marker, insert);
fs.writeFileSync(p, s);
