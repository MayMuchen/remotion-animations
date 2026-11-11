import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { MONO, SERIF } from "../lib/fonts";
import { HudFrame } from "../lib/Overlays";
import { Glitch, ScrambleText } from "../lib/ScrambleText";
import { CameraRig, makeStarSphere, usePixelRatio, usePointMaterial } from "../lib/three";
import { CL, EASE_IN, EASE_IO, EASE_OUT, gauss, mulberry32 } from "../lib/util";
import { EV } from "../timeline";

const E = EV.foil;
const PLANE_Y = -2.2;
const CONTACT = new THREE.Vector3(-5.5, PLANE_Y, 2.5);

// GPU shader: every particle is "unfolded" onto the 2D plane as the collapse front passes it
const VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute vec3 aCenter;
  attribute float aSize;
  uniform float uFront;
  uniform float uPlaneY;
  uniform vec3 uContact;
  uniform float uPixelRatio;
  varying vec3 vColor;
  void main() {
    vec3 p = position;
    float d = length(p.xz - uContact.xz);
    float k = smoothstep(uFront, uFront - 2.5, d);
    float h = p.y - uPlaneY;
    vec2 dir = p.xz - aCenter.xz;
    float len = length(dir);
    dir = len > 1e-4 ? dir / len : vec2(0.0);
    vec2 flatXZ = p.xz + dir * h * 1.35 + dir * (aCenter.y - uPlaneY) * 0.6;
    vec3 flatP = vec3(flatXZ.x, uPlaneY, flatXZ.y);
    float fall = k * k * (3.0 - 2.0 * k);
    vec3 q = mix(p, flatP, fall);
    vec4 mv = modelViewMatrix * vec4(q, 1.0);
    gl_Position = projectionMatrix * mv;
    float edge = exp(-abs(d - uFront + 0.6) * 2.2) * step(0.01, uFront);
    gl_PointSize = clamp(aSize * (1.0 + fall * 0.6 + edge * 2.0) * 220.0 * uPixelRatio / -mv.z, 0.0, 40.0 * uPixelRatio);
    vColor = mix(aColor, aColor * (1.6 + 0.8 * fall), fall) + edge * vec3(0.9, 0.95, 1.0);
  }
`;
const FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * a * a, 1.0);
  }
`;

const buildWorld = () => {
  const r = mulberry32(2026);
  const pos: number[] = [];
  const col: number[] = [];
  const cen: number[] = [];
  const size: number[] = [];
  const push = (x: number, y: number, z: number, c: THREE.Color, b: number, center: THREE.Vector3, s: number) => {
    pos.push(x, y, z);
    col.push(c.r * b, c.g * b, c.b * b);
    cen.push(center.x, center.y, center.z);
    size.push(s);
  };
  // gas giant
  const PC = new THREE.Vector3(1.2, 1.6, -0.5);
  const bands = ["#e9c89a", "#c98a55", "#f3e2c4", "#a5643b", "#e0b07a", "#7a4a2e"].map((c) => new THREE.Color(c));
  for (let i = 0; i < 26000; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const R = 2.3;
    const lat = u + Math.sin(th * 3 + u * 8) * 0.04;
    const idx = ((Math.floor((lat + 1.2) * 7) % bands.length) + bands.length) % bands.length;
    push(PC.x + Math.cos(th) * s * R, PC.y + u * R, PC.z + Math.sin(th) * s * R, bands[idx], 0.18 + r() * 0.12, PC, 0.5);
  }
  // rings
  const ringC = new THREE.Color("#d9c7a8");
  for (let i = 0; i < 12000; i++) {
    const a = r() * Math.PI * 2;
    const rr = 3.2 + Math.pow(r(), 0.7) * 1.8;
    const gap = rr > 4.0 && rr < 4.2 ? 0.2 : 1;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const tilt = 0.42;
    push(PC.x + x, PC.y + z * Math.sin(tilt), PC.z + z * Math.cos(tilt), ringC, (0.1 + r() * 0.1) * gap, PC, 0.4);
  }
  // moon
  const MC = new THREE.Vector3(-3.6, 3.4, -3.5);
  const moonC = new THREE.Color("#9fb9d6");
  for (let i = 0; i < 3500; i++) {
    const v = new THREE.Vector3(gauss(r), gauss(r), gauss(r)).normalize().multiplyScalar(0.55);
    push(MC.x + v.x, MC.y + v.y, MC.z + v.z, moonC, 0.22 + r() * 0.12, MC, 0.5);
  }
  // spacetime lattice
  const gridC = new THREE.Color("#4fd8ff");
  for (let x = -16; x <= 16; x += 0.8) {
    for (let z = -16; z <= 16; z += 0.8) {
      for (let y = PLANE_Y; y <= 6.5; y += 2.2) {
        const c = new THREE.Vector3(x, PLANE_Y, z);
        push(x, y, z, gridC, y === PLANE_Y ? 0.35 : 0.12, c, y === PLANE_Y ? 0.5 : 0.35);
      }
    }
  }
  // fleet
  const white = new THREE.Color("#ffffff");
  for (let s = 0; s < 6; s++) {
    const SC = new THREE.Vector3(-8 + s * 2.6, 2.5 + (s % 3) * 0.9, 5 - s * 1.4);
    for (let i = 0; i < 400; i++) {
      push(SC.x + gauss(r) * 0.35, SC.y + gauss(r) * 0.06, SC.z + gauss(r) * 0.08, white, 0.25, SC, 0.35);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("aCenter", new THREE.Float32BufferAttribute(cen, 3));
  g.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
  return g;
};

const World: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const geo = useMemo(buildWorld, []);
  const pr = useThree((s) => s.gl.getPixelRatio());
  const stars = useMemo(() => makeStarSphere(5000, 150, 8), []);
  const sMat = usePointMaterial({ twinkle: 0.3, scale: 260 });
  usePixelRatio(sMat);
  sMat.uniforms.uTime.value = frame / fps;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uFront: { value: 0 },
          uPlaneY: { value: PLANE_Y },
          uContact: { value: CONTACT },
          uPixelRatio: { value: 1 },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
      }),
    [],
  );
  const since = Math.max(0, frame - E.contact);
  mat.uniforms.uFront.value = frame < E.contact ? 0 : 0.4 + Math.pow(since, 1.45) * 0.05;
  mat.uniforms.uPixelRatio.value = pr;

  const fp = interpolate(frame, [0, E.contact], [0, 1], { ...CL, easing: EASE_IO });
  const foilPos: [number, number, number] = [
    interpolate(fp, [0, 1], [3, CONTACT.x]),
    interpolate(fp, [0, 1], [6, PLANE_Y + 0.02]),
    interpolate(fp, [0, 1], [11, CONTACT.z]),
  ];
  const foilVis = interpolate(frame, [E.contact, E.contact + 10], [1, 0], CL);

  const t = frame / fps;
  const top = interpolate(frame, [E.top - 60, 390], [0, 1], { ...CL, easing: EASE_IO });
  const orbit = 0.7 - t * 0.06;
  const camR = interpolate(top, [0, 1], [17, 4]);
  const camY = interpolate(top, [0, 1], [5.5, 34]);
  return (
    <>
      <CameraRig
        position={[Math.sin(orbit) * camR, camY, Math.cos(orbit) * camR]}
        lookAt={[interpolate(top, [0, 1], [-1, 0]), interpolate(top, [0, 1], [0.5, PLANE_Y]), 0]}
        fov={interpolate(top, [0, 1], [45, 60])}
      />
      <points geometry={stars} material={sMat} />
      <points geometry={geo} material={mat} frustumCulled={false} />
      <mesh position={foilPos} rotation={[-Math.PI / 2 + (1 - fp) * 1.2, t * 0.6 * (1 - fp), (1 - fp) * 0.8]} scale={Math.max(0.001, foilVis)}>
        <planeGeometry args={[0.9, 1.4]} />
        <meshBasicMaterial color="#e8f0ff" transparent opacity={0.9} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
};

export const Foil: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t1 = interpolate(frame, [10, 30, E.top - 30, E.top - 10], [0, 1, 1, 0], CL);
  const t2 = interpolate(frame, [E.contact + 8, E.contact + 20], [0, 1], CL) * interpolate(frame, [E.top - 30, E.top - 10], [1, 0], CL);
  const t3 = interpolate(frame, [E.top, E.top + 24], [0, 1], { ...CL, easing: EASE_OUT });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={width} height={height}>
        <World />
      </ThreeCanvas>
      <HudFrame code="DIM-STRIKE" title="降维打击 · DIMENSIONAL STRIKE" color="rgba(200,190,255,0.8)" />
      <div style={{ position: "absolute", left: 160, top: 250, opacity: t1 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 96, color: "#f2f0ff", letterSpacing: "0.12em", textShadow: "0 0 30px rgba(180,160,255,0.5)" }}>
          二向箔
        </div>
        <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.4em", color: "#c9c0ff", marginTop: 12 }}>
          <ScrambleText text="DUAL-VECTOR FOIL" start={14} speed={1.5} accent="#c9a8ff" />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 15, lineHeight: 1.9, color: "rgba(210,205,255,0.65)", marginTop: 24, letterSpacing: "0.1em" }}>
          <div>SIZE  8.5 × 5.2 cm</div>
          <div>DIM  3 → 2</div>
          <div>STATUS  {frame < E.contact ? `APPROACH · T−${((E.contact - frame) / 30).toFixed(2)}s` : "■ CONTACT · 坍缩中"}</div>
        </div>
      </div>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 200, opacity: t2 }}>
        <Glitch intensity={interpolate(frame, [E.contact + 8, E.contact + 22], [1, 0], CL)} style={{ color: "#fff" }}>
          <div
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 110,
              letterSpacing: "0.4em",
              marginRight: "-0.4em",
              textShadow: "0 0 40px rgba(190,170,255,0.7), 0 0 12px #000",
              scale: `1 ${interpolate(frame, [E.contact + 40, E.top - 10], [1, 0.25], { ...CL, easing: EASE_IN })}`,
            }}
          >
            降维打击
          </div>
        </Glitch>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: t3 }}>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 58,
            color: "#fff",
            letterSpacing: "0.14em",
            textShadow: "0 0 30px #000, 0 0 60px #000",
            background: "rgba(0,0,0,0.45)",
            padding: "18px 40px",
          }}
        >
          整个太阳系，正在跌落进二维
        </div>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.4em", color: "#d8d0ff", marginTop: 20, textShadow: "0 0 10px #000" }}>
          <ScrambleText text="THE SOLAR SYSTEM IS COLLAPSING INTO TWO DIMENSIONS" start={E.top + 10} speed={0.8} accent="#c9a8ff" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
