import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { activeFilmWavesAt, filmPulseAt } from "./filmBeats";
import type { FilmCloud, FilmParticle } from "./pointcloud-v2";
import {
  THROUGH_LENGTH_SECONDS,
  THROUGH_START_SECONDS,
} from "./story-v2";
import type { Motion, Tone, TransitionKind } from "./story-v2";
import {
  clamp01,
  easeOutCubic,
  mulberry32,
} from "../particles/random";

export const W = 1920;
export const H = 1080;
const GLOW = { x: W * 0.5, y: H * 0.335 };
const PORTAL = { x: W * 0.5, y: H * 0.46 };
const THROUGH = { x: W * 0.512, y: H * 0.485 };
const WAVE_LIFE = 1.5;
const WAVE_SPEED = 760;
const FOCAL = 1700;
const THROUGH_PUSH = 1180;
const DEPTH = 360;

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const makeSprite = (core: string, mid: string, tail: string) => {
  const c = document.createElement("canvas");
  c.width = 40;
  c.height = 40;
  const g = c.getContext("2d");
  if (!g) throw new Error("Could not create sprite");
  const grad = g.createRadialGradient(20, 20, 0, 20, 20, 20);
  grad.addColorStop(0, core);
  grad.addColorStop(0.08, mid);
  grad.addColorStop(0.3, tail);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 40, 40);
  return c;
};

const makeMotes = () => {
  const rnd = mulberry32(778811);
  return Array.from({ length: 190 }, () => ({
    x: rnd() * W,
    y: rnd() * H,
    size: 1.6 + rnd() * 4.2,
    alpha: 0.03 + rnd() * 0.08,
    phase: rnd() * Math.PI * 2,
    speed: 2 + rnd() * 8,
    tint: rnd() < 0.72 ? 0 : 3,
  }));
};

type CamState = {
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
};

type ShotCanvasV2Props = {
  cloud: FilmCloud;
  duration: number;
  timeOffset: number;
  motion: Motion;
  tone: Tone;
  inDuration: number;
  outDuration: number;
  inTransition: TransitionKind;
  outTransition: TransitionKind;
  seed: number;
  throughStartSeconds?: number;
  throughLengthSeconds?: number;
  energy?: number;
};

export const ShotCanvasV2: React.FC<ShotCanvasV2Props> = ({
  cloud,
  duration,
  timeOffset,
  motion,
  tone,
  inDuration,
  outDuration,
  inTransition,
  outTransition,
  seed,
  throughStartSeconds = THROUGH_START_SECONDS,
  throughLengthSeconds = THROUGH_LENGTH_SECONDS,
  energy = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const sprites = useMemo(
    () => [
      makeSprite("rgba(255,250,242,1)", "rgba(255,232,199,0.96)", "rgba(255,192,142,0.15)"),
      makeSprite("rgba(255,228,190,1)", "rgba(255,188,124,0.92)", "rgba(255,152,92,0.14)"),
      makeSprite("rgba(255,206,154,1)", "rgba(255,162,96,0.88)", "rgba(255,132,72,0.12)"),
      makeSprite("rgba(212,242,238,0.92)", "rgba(156,210,204,0.62)", "rgba(96,156,156,0.09)"),
    ],
    [],
  );
  const motes = useMemo(makeMotes, []);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t = frame / fps;
    const bodyT = t - inDuration;
    const globalT = timeOffset + bodyT;
    const inQ = inDuration > 0 ? clamp01(t / inDuration) : 1;
    const outStart = duration - outDuration;
    const outQ = outDuration > 0 ? clamp01((bodyT - outStart) / outDuration) : 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const pulse = energy > 0 ? Math.exp(-((globalT * 2) % 1) * 8) * energy : filmPulseAt(globalT);
    const waves = activeFilmWavesAt(globalT, WAVE_LIFE);
    const waveAt = (x: number, y: number) => {
      if (waves.length === 0) return 0;
      const dx = x - GLOW.x;
      const dy = y - GLOW.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      let energy = 0;
      for (const wave of waves) {
        const radius = 20 + wave.age * WAVE_SPEED;
        const bandWidth = 64 + wave.age * 42;
        const d = (distance - radius) / bandWidth;
        const band = Math.exp(-d * d);
        const fade = Math.pow(1 - wave.age / WAVE_LIFE, 1.3);
        energy = Math.max(energy, band * fade * wave.strength);
      }
      return energy;
    };

    const camP = easeOutCubic(clamp01(bodyT / Math.max(0.1, duration)));

    // ---- Signature fly-through -------------------------------------------
    // Anchored to ABSOLUTE film time. Re-timing the opening can no longer make
    // the crossing drift late, which was the bug in the previous cut. The move
    // is: settle wide enough to read both silhouettes -> ease back further so
    // the gap between them is unmistakable -> dive through it.
    const isThrough = motion === "through";
    const throughStart = isThrough
      ? Math.max(inDuration + 0.4, throughStartSeconds - timeOffset)
      : Number.POSITIVE_INFINITY;
    const throughEnd = isThrough
      ? Math.min(duration, throughStart + throughLengthSeconds)
      : Number.POSITIVE_INFINITY;
    const prepStart = throughStart - 1.8;
    const prepQ = isThrough ? smoothstep(prepStart, throughStart, bodyT) : 0;
    const revealQ = isThrough
      ? smoothstep(0, Math.max(0.6, throughStart), bodyT)
      : 0;
    const throughT = isThrough
      ? clamp01((bodyT - throughStart) / Math.max(0.1, throughEnd - throughStart))
      : 0;
    // Start the dolly a hair before the anchored mark so the camera is already
    // moving at 27.0s, instead of sitting still and then lurching forward.
    const throughQ = smoothstep(-0.06, 1, throughT);

    // ---- Camera: a slow orbital arc on every shot -------------------------
    // Circling the subject by a degree or two gives the flat point cloud real
    // parallax, so mid-length shots stop reading as a still image.
    const orbitAmp = isThrough ? 0.4 : 1;
    const orbitYaw =
      Math.sin(camP * Math.PI * 1.15 + seed * 0.0009) * 0.017 * orbitAmp;
    const orbitPitch =
      Math.cos(camP * Math.PI * 0.9 + seed * 0.0011) * 0.008 * orbitAmp;
    const orbitX =
      Math.sin(camP * Math.PI * 1.05 + seed * 0.0013) * 13 * orbitAmp;

    const motionYaw =
      motion === "left"
        ? -0.05
        : motion === "right"
          ? 0.05
          : motion === "pull"
            ? -0.018
            : motion === "through"
              ? 0.012
              : 0.018;
    const baseYaw =
      Math.sin(globalT * 0.115 + seed * 0.0013) * 0.03 + motionYaw + orbitYaw;
    const basePitch =
      Math.cos(globalT * 0.092 + seed * 0.0007) * 0.01 + orbitPitch;
    const baseZoom =
      motion === "push"
        ? 1 + 0.03 * camP
        : motion === "pull"
          ? 1.036 - 0.032 * camP
          : motion === "through"
            ? 0.72 - 0.03 * revealQ - 0.11 * prepQ + throughQ * 0.9
            : 1 + 0.012 * camP;
    const baseCamX =
      (motion === "left" ? -14 + 28 * camP : motion === "right" ? 14 - 28 * camP : 0) +
      Math.sin(globalT * 0.19) * 5 +
      Math.sin(globalT * 0.53) * 1.6 +
      orbitX;
    const baseCamY = Math.cos(globalT * 0.16) * 3.5 + Math.sin(globalT * 0.37) * 1.4;

    const camAt = (oq: number, iq: number): CamState => {
      let yaw = baseYaw;
      let pitch = basePitch;
      let roll = 0;
      let spin = 0;
      let push = 0;
      let zoom = baseZoom;

      const outE = oq > 0 ? Math.pow(oq, 1.35) : 0;
      if (outE > 0) {
        if (outTransition === "vortex") {
          yaw += outE * 1.6;
          spin += outE * 1.45;
          roll += outE * 0.14;
          push += outE * 640;
          zoom += outE * 0.06;
        } else if (outTransition === "portal") {
          yaw += outE * 0.34;
          spin += outE * 2.3;
          roll += outE * 0.5;
          push += outE * 720;
          zoom += outE * 0.1;
        } else if (outTransition === "converge") {
          zoom += outE * 0.055;
        } else {
          yaw += outE * 0.1;
          pitch += outE * 1.35;
          push += outE * 340;
          zoom += outE * 0.04;
        }
      }

      const inE = iq < 1 ? Math.pow(1 - iq, 1.3) : 0;
      if (inE > 0) {
        if (inTransition === "vortex") {
          yaw -= inE * 1.15;
          spin -= inE * 1.05;
          roll -= inE * 0.09;
          push += inE * 560;
          zoom += inE * 0.06;
        } else if (inTransition === "portal") {
          yaw -= inE * 0.22;
          spin -= inE * 1.9;
          roll -= inE * 0.42;
          push += inE * 620;
          zoom += inE * 0.1;
        } else if (inTransition === "converge") {
          zoom += inE * 0.045;
        } else {
          yaw -= inE * 0.08;
          pitch -= inE * 1.2;
          push += inE * 340;
          zoom += inE * 0.05;
        }
      }

      // Fly-through dolly. The near-fade in project() keeps the closest
      // particles from clipping into giant blobs as they pass the lens.
      push += throughQ * THROUGH_PUSH;
      yaw += throughQ * 0.02;
      pitch -= throughQ * 0.012;
      roll += throughQ * 0.022 * Math.sin(globalT * 0.55);
      zoom += throughQ * 0.028;

      const shakeAmp =
        (pulse * 0.9 +
          Math.max(0, Math.sin(oq * Math.PI), Math.sin(iq * Math.PI)) +
          throughQ * 0.9) *
        2.2;
      return {
        yaw,
        pitch,
        roll,
        spin,
        push,
        zoom,
        camX: baseCamX + throughQ * 22 + Math.sin(globalT * 3.1) * shakeAmp,
        camY: baseCamY + throughQ * 16 + Math.cos(globalT * 2.7) * shakeAmp,
        outQ: oq,
        inQ: iq,
      };
    };

    const transitioning = outQ > 0.001 || inQ < 0.999;
    const camNow = camAt(outQ, inQ);
    const camPrev = transitioning
      ? camAt(Math.max(0, outQ - 0.055), Math.max(0, inQ - 0.055))
      : camNow;
    const prevThroughT =
      motion === "through"
        ? clamp01((bodyT - 0.16 - throughStart) / (throughEnd - throughStart))
        : 0;
    const prevThroughQ = Math.pow(smoothstep(0, 1, prevThroughT), 1.35);
    const throughDelta = throughQ - prevThroughQ;
    const camThroughPrev: CamState = {
      ...camNow,
      push: camNow.push - throughDelta * THROUGH_PUSH,
      camX: camNow.camX - throughDelta * 22,
      camY: camNow.camY - throughDelta * 16,
    };
    const trans = Math.max(
      outQ > 0 ? Math.sin(outQ * Math.PI) : 0,
      inQ < 1 ? Math.sin(inQ * Math.PI) : 0,
    );
    const outAlpha =
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
        : 1;
    const alphaMul = outAlpha * inAlpha;
    const coolShift = tone === "cool" ? -0.022 : 0;
    // ---- Structure plate --------------------------------------------------
    // Additive, oval-masked ghost of the source frame. It never lifts the blacks
    // (alpha is luminance), so the picture stays a field of light while faces
    // and hands finally hold a readable contour. Fades out as the camera dives
    // through, because there the particles alone should carry the motion.
    if (cloud.plate) {
      const plateAlpha =
        (isThrough ? 0.54 : 0.42) *
        inAlpha *
        (1 - 0.9 * smoothstep(0.04, 0.5, throughQ)) *
        (1 - 0.5 * outQ);
      if (plateAlpha > 0.004) {
        const flat = (lx: number, ly: number) => {
          const x0 = lx;
          const y0 = ly;
          const z0 = 0;
          const cy = Math.cos(camNow.yaw);
          const sy = Math.sin(camNow.yaw);
          const x1 = x0 * cy + z0 * sy;
          const z1 = -x0 * sy + z0 * cy;
          const cp = Math.cos(camNow.pitch);
          const sp = Math.sin(camNow.pitch);
          const y1 = y0 * cp - z1 * sp;
          const z2 = y0 * sp + z1 * cp;
          const cr = Math.cos(camNow.roll);
          const sr = Math.sin(camNow.roll);
          const x2 = x1 * cr - y1 * sr;
          const y2 = x1 * sr + y1 * cr;
          const cs = Math.cos(camNow.spin);
          const ss = Math.sin(camNow.spin);
          const x3 = x2 * cs - y2 * ss;
          const y3 = x2 * ss + y2 * cs;
          const zc = z2 + camNow.push;
          const persp = FOCAL / Math.max(330, FOCAL - zc);
          return {
            x: x3 * persp * camNow.zoom + camNow.camX,
            y: y3 * persp * camNow.zoom + camNow.camY,
          };
        };
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = plateAlpha;
                // One single draw for the whole plate. Splitting it into vertical
        // strips and transforming each one independently left visible seams
        // (each strip is an affine approximation, and neighbouring strips
        // disagreed by a fraction of a pixel). A single affine transform of
        // the whole plane is seamless, and at these small camera angles the
        // difference from a true homography is invisible.
        const o = flat(-W / 2, -H / 2);
        const ex = flat(-W / 2 + 1, -H / 2);
        const ey = flat(-W / 2, -H / 2 + 1);
        ctx.setTransform(
          ex.x - o.x,
          ex.y - o.y,
          ey.x - o.x,
          ey.y - o.y,
          W / 2 + o.x,
          H / 2 + o.y,
        );
        ctx.drawImage(cloud.plate, 0, 0, W, H);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Feather the plate into an oval and clear the subtitle band.
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(W / 2, H * 0.43);
        ctx.scale(1, 0.66);
        const mask = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.52);
        mask.addColorStop(0, "rgba(0,0,0,0)");
        mask.addColorStop(0.58, "rgba(0,0,0,0.02)");
        mask.addColorStop(0.84, "rgba(0,0,0,0.5)");
        mask.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = mask;
        ctx.fillRect(-W, -H, W * 2, H * 2);
        ctx.restore();
        const band = ctx.createLinearGradient(0, H * 0.7, 0, H);
        band.addColorStop(0, "rgba(0,0,0,0)");
        band.addColorStop(1, "rgba(0,0,0,0.8)");
        ctx.fillStyle = band;
        ctx.fillRect(0, H * 0.7, W, H * 0.3);
        ctx.globalCompositeOperation = "lighter";
      }
    }


    const project = (p: FilmParticle, cam: CamState) => {
      const x0 = p.tx - W / 2;
      const y0 = p.ty - H / 2;
      const z0 = (p.z - 0.5) * DEPTH;
      const cy = Math.cos(cam.yaw);
      const sy = Math.sin(cam.yaw);
      const x1 = x0 * cy + z0 * sy;
      const z1 = -x0 * sy + z0 * cy;
      const cp = Math.cos(cam.pitch);
      const sp = Math.sin(cam.pitch);
      const y1 = y0 * cp - z1 * sp;
      const z2 = y0 * sp + z1 * cp;
      const cr = Math.cos(cam.roll);
      const sr = Math.sin(cam.roll);
      const x2 = x1 * cr - y1 * sr;
      const y2 = x1 * sr + y1 * cr;
      const cs = Math.cos(cam.spin);
      const ss = Math.sin(cam.spin);
      const x3 = x2 * cs - y2 * ss;
      const y3 = x2 * ss + y2 * cs;
      const zc = z2 + cam.push;
      const persp = FOCAL / Math.max(330, FOCAL - zc);
      let x = W / 2 + x3 * persp * cam.zoom + cam.camX;
      let y = H / 2 + y3 * persp * cam.zoom + cam.camY;

      // Fast cut: particles leave their image plane and detonate outward in
      // depth. The zero default preserves every earlier composition.
      if (energy > 0 && outTransition !== "converge") {
        const q = Math.pow(cam.outQ, 2.4) * energy;
        const a = p.phase + q * p.swirl;
        x += Math.cos(a) * q * (120 + p.z * 440);
        y += Math.sin(a) * q * (80 + p.z * 260);
      }

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

      const near = 1 - smoothstep(FOCAL * 0.7, FOCAL * 0.93, zc);

      return {
        x,
        y,
        scale: persp * cam.zoom,
        near,
      };
    };

    // Portal / event-horizon glow behind the particles.
    if (trans > 0.015) {
      const radius = 120 + trans * 250 + pulse * 18;
      const core = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, radius);
      core.addColorStop(0, `rgba(255,248,232,${0.26 * trans + 0.05})`);
      core.addColorStop(0.13, `rgba(255,214,166,${0.18 * trans + 0.03})`);
      core.addColorStop(0.45, `rgba(255,152,92,${0.09 * trans})`);
      core.addColorStop(1, "rgba(255,120,60,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = core;
      ctx.fillRect(PORTAL.x - radius, PORTAL.y - radius, radius * 2, radius * 2);

      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const rr = (74 + k * 42) * (0.7 + trans * 0.75);
        const rot = globalT * (0.9 + k * 0.35);
        ctx.globalAlpha = (0.16 - k * 0.035) * trans;
        ctx.strokeStyle = k === 1 ? "rgba(255,244,224,1)" : "rgba(255,192,136,1)";
        ctx.beginPath();
        ctx.arc(PORTAL.x, PORTAL.y, rr, rot + k * 1.7, rot + k * 1.7 + 1.5 + k * 0.35);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.08 * trans;
      ctx.strokeStyle = "rgba(255,206,164,1)";
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 22; k++) {
        const a = (k / 22) * Math.PI * 2 + globalT * 0.55;
        const r0 = 54 + (k % 5) * 9;
        const r1 = r0 + 90 + trans * 180;
        ctx.beginPath();
        ctx.moveTo(PORTAL.x + Math.cos(a) * r0, PORTAL.y + Math.sin(a) * r0);
        ctx.lineTo(PORTAL.x + Math.cos(a) * r1, PORTAL.y + Math.sin(a) * r1);
        ctx.stroke();
      }
    }

    // Convergence core / event horizon used on chapter edits.
    const convOutAmt = outTransition === "converge" ? smoothstep(0.08, 1, outQ) : 0;
    const convInAmt = inTransition === "converge" ? 1 - smoothstep(0, 0.58, inQ) : 0;
    const convAmt = Math.max(convOutAmt, convInAmt);
    if (convAmt > 0.012) {
      const radius = 42 + convAmt * 245;
      const g = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, radius);
      g.addColorStop(0, `rgba(255,251,240,${0.48 * convAmt})`);
      g.addColorStop(0.1, `rgba(255,232,193,${0.26 * convAmt})`);
      g.addColorStop(0.38, `rgba(255,178,116,${0.085 * convAmt})`);
      g.addColorStop(1, "rgba(255,126,68,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(PORTAL.x - radius, PORTAL.y - radius, radius * 2, radius * 2);

      ctx.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) {
        const rr = 44 + k * 22 + convAmt * (42 + k * 20);
        const rot = globalT * (1.3 + k * 0.31) + k * 1.2;
        ctx.globalAlpha = (0.15 - k * 0.022) * convAmt;
        ctx.strokeStyle = k === 2 ? "rgba(255,249,235,1)" : "rgba(255,194,138,1)";
        ctx.beginPath();
        ctx.arc(PORTAL.x, PORTAL.y, rr, rot, rot + 1.1 + k * 0.3);
        ctx.stroke();
      }

      ctx.lineWidth = 1.1;
      ctx.globalAlpha = 0.08 * convAmt;
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

    // Fly-through tunnel: the gap becomes a warm aperture that the camera
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
      core.addColorStop(0, `rgba(255,250,238,${0.16 * throughQ})`);
      core.addColorStop(0.18, `rgba(255,222,178,${0.1 * throughQ})`);
      core.addColorStop(0.55, `rgba(255,170,108,${0.045 * throughQ})`);
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

    // Speed streaks on transition frames.
    if (trans > 0.08) {
      ctx.lineWidth = 1.35;
      for (const p of cloud.points) {
        if (p.alpha < 0.34 && p.edge < 0.42) continue;
        const a = project(p, camNow);
        const b = project(p, camPrev);
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1.2) continue;
        const streakWeight =
          outTransition === "converge" || inTransition === "converge" ? 0.15 : 0.3;
        const fade = p.alpha * alphaMul * trans * streakWeight;
        if (fade < 0.008) continue;
        ctx.globalAlpha = Math.min(0.5, fade);
        ctx.strokeStyle = p.tint === 3 ? "rgba(190,236,232,1)" : "rgba(255,222,184,1)";
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(a.x, a.y);
        ctx.stroke();
      }
    }

    // Motion blur while the camera flies through the gap.
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
      let y = pos.y;

      const held = Math.max(0, Math.min(bodyT, duration));
      const driftX =
        Math.sin(held * 0.52 + p.phase) * (0.45 + p.z * 0.95) +
        Math.sin(held * 1.27 + p.phase * 0.63) * 0.38;
      const driftY =
        Math.cos(held * 0.45 + p.phase * 1.13) * (0.5 + p.z * 0.9) +
        Math.cos(held * 1.13 + p.phase * 0.71) * 0.34;
      x += driftX;
      y += driftY;

      let localWave = 0;
      if (bodyT > 0.8) {
        localWave = waveAt(x, y) * Math.min(1, (bodyT - 0.8) * 2.2);
        x += Math.cos(p.phase + 0.45) * localWave * (2.0 + p.z * 1.5);
        y += Math.sin(p.phase + 0.45) * localWave * (2.0 + p.z * 1.5);
      }

      const kick = pulse * (0.7 + p.z * 1.5) * (1 + trans * 0.8);
      x += Math.cos(p.phase) * kick;
      y += Math.sin(p.phase) * kick;

      // Soft frame-edge falloff: without it the sampled rectangle can show up
      // as a hard border in the dark.
      const edgeMask =
        smoothstep(0, 84, p.tx) *
        smoothstep(0, 84, W - p.tx) *
        smoothstep(0, 62, p.ty) *
        smoothstep(0, 62, H - p.ty);
      let alpha = p.alpha * inAlpha * outAlpha * pos.near * edgeMask;
      alpha *= 1 + pulse * 0.1 + localWave * 0.22 + coolShift + trans * 0.08;
      if (alpha <= 0.002) continue;

      const protect = 1 - 0.34 * clamp01((y / H - 0.775) / 0.225);
      const s =
        p.size *
        (0.55 + 0.45 * pos.scale) *
        (1 + (pulse + localWave) * 0.06) *
        (1 + trans * 0.1);
      ctx.globalAlpha = Math.min(0.97, alpha * protect);
      ctx.drawImage(sprites[p.tint], x - s / 2, y - s / 2, s, s);
    }

    const moteFade = clamp01(t / 0.55) * (1 - trans * 0.45);
    for (const m of motes) {
      const x =
        m.x + Math.sin(t * 0.2 + m.phase) * m.speed + Math.cos(m.phase) * pulse * 1.1;
      const y =
        m.y - ((t * m.speed) % 90) + Math.cos(t * 0.16 + m.phase) * 4 + Math.sin(m.phase) * pulse * 0.9;
      ctx.globalAlpha = m.alpha * moteFade;
      ctx.drawImage(sprites[m.tint], x, y, m.size, m.size);
    }

    // A single soft light bar travels across frame as each shot lands. It is
    // the accent on the cut that a plain dissolve never gives you, but stays a
    // light leak rather than a white flash.
    if (inDuration > 0 && t < inDuration * 1.5) {
      const sProgress = clamp01(t / (inDuration * 1.25));
      const sweepX = -W * 0.5 + sProgress * W * 1.7;
      const sweepGain = 0.09 * Math.sin(Math.PI * sProgress);
      if (sweepGain > 0.0015) {
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(-0.24);
        ctx.translate(-W / 2, -H / 2);
        const leak = ctx.createLinearGradient(sweepX - W * 0.55, 0, sweepX + W * 0.55, 0);
        leak.addColorStop(0, "rgba(255,186,126,0)");
        leak.addColorStop(0.5, `rgba(255,231,203,${sweepGain})`);
        leak.addColorStop(1, "rgba(255,186,126,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1;
        ctx.fillStyle = leak;
        ctx.fillRect(-W * 0.4, -H * 0.4, W * 1.8, H * 1.8);
        ctx.restore();
      }
    }

    if (outQ > 0) {
      const radius = 30 + 190 * Math.sin(outQ * Math.PI * 0.85) + pulse * 16;
      const a = Math.sin(outQ * Math.PI) * 0.5;
      const g = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, radius);
      g.addColorStop(0, `rgba(255,244,224,${Math.min(0.7, 0.55 * a + pulse * 0.03)})`);
      g.addColorStop(0.25, `rgba(255,204,152,${0.26 * a})`);
      g.addColorStop(1, "rgba(255,150,90,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(PORTAL.x - radius, PORTAL.y - radius, radius * 2, radius * 2);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }, [
    cloud,
    duration,
    energy,
    fps,
    frame,
    inDuration,
    inTransition,
    motes,
    motion,
    outDuration,
    outTransition,
    seed,
    sprites,
    throughLengthSeconds,
    throughStartSeconds,
    timeOffset,
    tone,
  ]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
};



