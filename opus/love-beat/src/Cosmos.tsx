// WebGL layer borrowed from the Dark Forest toolkit: fbm nebula + 3D galaxy + a heart made of 30k stars.
import React, {useMemo} from "react";
import {ThreeCanvas} from "@remotion/three";
import * as THREE from "three";
import {CameraRig, makeGalaxy, makeStarField, usePixelRatio, usePointMaterial} from "./three";
import {NebulaQuad, useNebulaMaterial} from "./Nebula";
import {gauss, mulberry32} from "./util";

const makeHeart = (count: number) => {
  const r = mulberry32(42), pos: number[] = [], col: number[] = [], size: number[] = [], seed: number[] = [];
  const a = new THREE.Color("#ff4d7a"), b = new THREE.Color("#ffd27a"), tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = r() * Math.PI * 2, f = Math.pow(r(), .35);
    const x = 16 * Math.sin(u) ** 3, y = 13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u);
    pos.push(x * f * .5 + gauss(r) * .15, y * f * .5 + gauss(r) * .15, gauss(r) * 1.2 * (1 - f * .6));
    tmp.copy(a).lerp(b, r() * (1 - f)); const k = .14 + r() * .26;
    col.push(tmp.r * k, tmp.g * k, tmp.b * k); size.push(.6 + Math.pow(r(), 6) * 5); seed.push(r());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  return g;
};

const Scene: React.FC<{t: number; punch: number; mode: number; k: number}> = ({t, punch, mode, k}) => {
  const neb = useNebulaMaterial(mode === 0 ? "#1a2a6c" : "#5a1040", mode === 0 ? "#8a6cff" : "#ff8a5c");
  neb.uniforms.uTime.value = t * 6; neb.uniforms.uRes.value.set(1280, 720); neb.uniforms.uIntensity.value = .55 + punch * 1.1;
  const gMat = usePointMaterial({spin: .05, twinkle: .3, scale: 260});
  const hMat = usePointMaterial({twinkle: .6, scale: 150});
  const sMat = usePointMaterial({twinkle: .4, scale: 200});
  usePixelRatio(gMat, hMat, sMat);
  for (const m of [gMat, hMat, sMat]) m.uniforms.uTime.value = t;
  hMat.uniforms.uOpacity.value = mode === 0 || mode === 2 ? 0 : .62;
  const galaxy = useMemo(() => makeGalaxy(40000, 7), []);
  const heart = useMemo(() => makeHeart(14000), []);
  const stars = useMemo(() => makeStarField(15000, 400, 120, 11), []);
  // camera: 0 = cold-open dive, 1 = chorus orbit around the star-heart, 2 = ending pull-back
  let pos: [number, number, number], look: [number, number, number] = [0, 0, 0];
  if (mode === 0) { const z = 120 - 110 * Math.pow(k, .6); pos = [Math.sin(k * 3) * 4, 3 + z * .15, z]; }
  else if (mode === 1) { const a = t * .5; pos = [Math.sin(a) * 27, 4 + Math.sin(t * .7) * 3, Math.cos(a) * 27]; }
  else { const z = 14 + 120 * k * k; pos = [0, 2 + z * .2, z]; }
  const hs = .5 + punch * .12;
  return <>
    <CameraRig position={pos} lookAt={look} fov={60 - punch * 8} roll={Math.sin(t * .4) * .08} />
    <NebulaQuad material={neb} />
    <points geometry={stars} material={sMat} />
    <group rotation={[.4, t * .15, 0]} position={mode === 1 ? [0, -4, -46] : [0, 0, 0]} scale={mode === 1 ? 2.2 : 3}><points geometry={galaxy} material={gMat} /></group>
    <group scale={[hs, hs, hs]} rotation={[0, mode === 1 ? 0 : t * .3, 0]}><points geometry={heart} material={hMat} frustumCulled={false} /></group>
  </>;
};

export const Cosmos: React.FC<{t: number; punch: number; mode: number; k: number}> = (p) =>
  <ThreeCanvas width={1280} height={720} style={{position: "absolute", inset: 0}}><Scene {...p} /></ThreeCanvas>;
