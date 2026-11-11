import fs from "node:fs";
const p = "src/film/ShotCanvasV2.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replace(`type CamState = {
  yaw: number;
  pitch: number;
  roll: number;
  spin: number;
  push: number;
  zoom: number;
  camX: number;
  camY: number;
};`, `type CamState = {
  yaw: number;
  pitch: number;
  roll: number;
  spin: number;
  push: number;
  zoom: number;
  camX: number;
  camY: number;
  outQ: number;
  inQ: number;
};`);
s = s.replace(`        } else {
          yaw += outE * 0.18;
          pitch += outE * 2.55;
          push += outE * 430;
          zoom += outE * 0.04;
        }
      }`, `        } else if (outTransition === "converge") {
          zoom += outE * 0.055;
        } else {
          yaw += outE * 0.18;
          pitch += outE * 2.55;
          push += outE * 430;
          zoom += outE * 0.04;
        }
      }`);
s = s.replace(`        } else {
          yaw -= inE * 0.15;
          pitch -= inE * 2.45;
          push += inE * 480;
          zoom += inE * 0.05;
        }
      }`, `        } else if (inTransition === "converge") {
          zoom += inE * 0.045;
        } else {
          yaw -= inE * 0.15;
          pitch -= inE * 2.45;
          push += inE * 480;
          zoom += inE * 0.05;
        }
      }`);
s = s.replace(`        camX: baseCamX + Math.sin(globalT * 3.1) * shakeAmp,
        camY: baseCamY + Math.cos(globalT * 2.7) * shakeAmp,
      };`, `        camX: baseCamX + Math.sin(globalT * 3.1) * shakeAmp,
        camY: baseCamY + Math.cos(globalT * 2.7) * shakeAmp,
        outQ: oq,
        inQ: iq,
      };`);
fs.writeFileSync(p, s);
