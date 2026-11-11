import React, { useMemo } from "react";
import * as THREE from "three";

// Fullscreen domain-warped fbm nebula (drawn behind everything inside a ThreeCanvas)
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform float uIntensity;
  uniform vec2 uOffset;
  float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
  float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v; }
  void main(){
    vec2 p = (vUv - 0.5) * vec2(uRes.x/uRes.y, 1.0) * 2.2 + uOffset;
    float t = uTime * 0.03;
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2,1.3) - t));
    vec2 r = vec2(fbm(p + 3.0*q + vec2(1.7,9.2) + t*1.3), fbm(p + 3.0*q + vec2(8.3,2.8)));
    float n = fbm(p + 2.5*r);
    float dust = smoothstep(0.35, 0.75, fbm(p*1.7 + r*1.2 + 4.0));
    vec3 col = mix(uColA, uColB, clamp(length(q)*0.9, 0.0, 1.0));
    col *= pow(n, 2.6) * 2.4;
    col *= 1.0 - 0.85*dust;
    col += uColB * pow(max(0.0, n - 0.55), 3.0) * 6.0;
    float vig = smoothstep(1.3, 0.2, length(vUv - 0.5)*1.6);
    gl_FragColor = vec4(col * uIntensity * vig, 1.0);
  }
`;

export const useNebulaMaterial = (colA: string, colB: string) =>
  useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: new THREE.Vector2(1920, 1080) },
          uColA: { value: new THREE.Color(colA) },
          uColB: { value: new THREE.Color(colB) },
          uIntensity: { value: 1 },
          uOffset: { value: new THREE.Vector2(0, 0) },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [colA, colB],
  );

export const NebulaQuad: React.FC<{ readonly material: THREE.ShaderMaterial }> = ({ material }) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  return <mesh geometry={geo} material={material} frustumCulled={false} renderOrder={-10} />;
};
