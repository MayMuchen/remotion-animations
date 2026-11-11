import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import * as THREE from "three";
import { gauss, mulberry32 } from "./util";

// Places the camera every frame (frame-driven, no useFrame).
export const CameraRig: React.FC<{
  readonly position: [number, number, number];
  readonly lookAt: [number, number, number];
  readonly fov?: number;
  readonly roll?: number;
}> = ({ position, lookAt, fov = 50, roll = 0 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...position);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(...lookAt);
  camera.fov = fov;
  camera.near = 0.01;
  camera.far = 2000;
  camera.updateProjectionMatrix();
  return null;
};

const POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aSeed;
  uniform float uTime;
  uniform float uScale;
  uniform float uSpin;
  uniform float uTwinkle;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec3 p = position;
    float r = length(p.xz);
    float ang = uSpin * uTime / (0.35 + r * 0.22);
    float c = cos(ang), s = sin(ang);
    p.xz = mat2(c, -s, s, c) * p.xz;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 1.0 + uTwinkle * sin(uTime * (2.0 + aSeed * 5.0) + aSeed * 40.0);
    gl_PointSize = clamp(aSize * uScale * uPixelRatio * tw / -mv.z, 0.0, 64.0 * uPixelRatio);
    vColor = aColor;
    vFade = smoothstep(0.02, 0.6, -mv.z);
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.0, d);
    float a = core * core * core + 0.25 * smoothstep(0.5, 0.2, d);
    gl_FragColor = vec4(vColor * a * uOpacity * vFade, 1.0);
  }
`;

export const usePointMaterial = (opts?: { spin?: number; twinkle?: number; scale?: number }) =>
  useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: POINT_VERT,
        fragmentShader: POINT_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: opts?.scale ?? 300 },
          uSpin: { value: opts?.spin ?? 0 },
          uTwinkle: { value: opts?.twinkle ?? 0 },
          uOpacity: { value: 1 },
          uPixelRatio: { value: 1 },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

// Keep point sizes resolution-independent (render --scale changes the pixel ratio)
export const usePixelRatio = (...mats: THREE.ShaderMaterial[]) => {
  const pr = useThree((st) => st.gl.getPixelRatio());
  for (const m of mats) m.uniforms.uPixelRatio.value = pr;
};

const buildGeometry = (pos: number[], col: number[], size: number[], seed: number[]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  return g;
};

export const makeGalaxy = (count = 90000, seedN = 7) => {
  const r = mulberry32(seedN);
  const pos: number[] = [];
  const col: number[] = [];
  const size: number[] = [];
  const seed: number[] = [];
  const R = 10;
  const arms = 3;
  const inner = new THREE.Color("#ffd8a8");
  const mid = new THREE.Color("#c98bff");
  const outer = new THREE.Color("#5f8dff");
  const tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const rad = Math.pow(r(), 1.5) * R;
    const branch = ((i % arms) / arms) * Math.PI * 2;
    const spinA = rad * 0.62;
    const spread = 0.22 * (0.3 + rad / R);
    const rx = gauss(r) * spread * rad * 0.35;
    const ry = gauss(r) * 0.18 * (1.15 - rad / R);
    const rz = gauss(r) * spread * rad * 0.35;
    pos.push(Math.cos(branch + spinA) * rad + rx, ry, Math.sin(branch + spinA) * rad + rz);
    const t = rad / R;
    if (t < 0.35) tmp.copy(inner).lerp(mid, t / 0.35);
    else tmp.copy(mid).lerp(outer, Math.min(1, (t - 0.35) / 0.5));
    const b = (0.16 + r() * 0.22) * (r() < 0.12 ? 0.25 : 1);
    col.push(tmp.r * b, tmp.g * b, tmp.b * b);
    size.push(0.5 + Math.pow(r(), 8) * 5);
    seed.push(r());
  }
  // bulge
  for (let i = 0; i < count * 0.18; i++) {
    const x = gauss(r) * 0.9;
    const y = gauss(r) * 0.45;
    const z = gauss(r) * 0.9;
    pos.push(x, y, z);
    const b = 0.12 + r() * 0.16;
    col.push(1.0 * b, 0.8 * b, 0.55 * b);
    size.push(0.6 + Math.pow(r(), 6) * 4);
    seed.push(r());
  }
  return buildGeometry(pos, col, size, seed);
};

export const makeStarSphere = (count = 6000, radius = 200, seedN = 3) => {
  const r = mulberry32(seedN);
  const pos: number[] = [];
  const col: number[] = [];
  const size: number[] = [];
  const seed: number[] = [];
  const palette = ["#9fc3ff", "#ffffff", "#ffe2b8", "#ffb08a", "#cfd8ff"].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const rr = radius * (0.6 + r() * 0.4);
    pos.push(Math.cos(th) * s * rr, u * rr, Math.sin(th) * s * rr);
    const c = palette[Math.floor(r() * palette.length)];
    const b = 0.3 + Math.pow(r(), 3) * 1.2;
    col.push(c.r * b, c.g * b, c.b * b);
    size.push(1 + Math.pow(r(), 8) * 14);
    seed.push(r());
  }
  return buildGeometry(pos, col, size, seed);
};

// Deep field: stars filling a long tunnel volume (for fly-throughs)
export const makeStarField = (count = 30000, depth = 400, spread = 120, seedN = 11) => {
  const r = mulberry32(seedN);
  const pos: number[] = [];
  const col: number[] = [];
  const size: number[] = [];
  const seed: number[] = [];
  const palette = ["#8fb4ff", "#ffffff", "#ffe6c2", "#ff9f7a", "#c8d4ff", "#9fffe9"].map(
    (c) => new THREE.Color(c),
  );
  for (let i = 0; i < count; i++) {
    pos.push((r() - 0.5) * spread * 2, (r() - 0.5) * spread * 1.2, -r() * depth);
    const c = palette[Math.floor(r() * palette.length)];
    const b = 0.25 + Math.pow(r(), 4) * 1.4;
    col.push(c.r * b, c.g * b, c.b * b);
    size.push(1 + Math.pow(r(), 10) * 22);
    seed.push(r());
  }
  return buildGeometry(pos, col, size, seed);
};
