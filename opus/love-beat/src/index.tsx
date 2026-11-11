import React from "react";
import {AbsoluteFill, Audio, Composition, registerRoot, staticFile, useCurrentFrame} from "remotion";
import B from "./beats.json";
import {Cosmos} from "./Cosmos";
import {Canvas2D} from "./Canvas2D";
import {ActTitle, EndCard, Hud, TitleCard} from "./Hud";
import {loadFonts} from "./fonts";
// film grain (from the Dark Forest overlays)
let grainTile: HTMLCanvasElement | null = null;
const grain = (ctx: CanvasRenderingContext2D, frame: number, w: number, h: number) => {
  if (!grainTile) { grainTile = document.createElement("canvas"); grainTile.width = grainTile.height = 256; const g = grainTile.getContext("2d")!;
    const img = g.createImageData(256, 256); let sd = 1337; for (let q = 0; q < 65536; q++) { sd = (sd * 1664525 + 1013904223) >>> 0; const v = sd >>> 24;
      img.data[q * 4] = img.data[q * 4 + 1] = img.data[q * 4 + 2] = v; img.data[q * 4 + 3] = 255; } g.putImageData(img, 0, 0); }
  ctx.clearRect(0, 0, w, h); const ox = (frame * 97) % 256, oy = (frame * 61) % 256;
  ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(grainTile, "repeat")!; ctx.fillRect(0, 0, w + 256, h + 256);
};

const FPS = 30, W = 1280, H = 720, DUR = 176.5;
const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5; return x - Math.floor(x); };
const ease = (p: number) => 1 - Math.pow(1 - p, 3);

// a simple silhouette figure; arm: 0 down .. 1 raised toward partner
const Fig: React.FC<{x: number; y: number; s?: number; c: string; arm?: number; dir?: number; walk?: number; hair?: boolean}> =
  ({x, y, s = 1, c, arm = 0, dir = 1, walk = 0, hair}) => {
  const l = Math.sin(walk) * 18;
  return (
    <g transform={`translate(${x},${y}) scale(${s * dir},${s})`} fill={c} stroke={c} strokeLinecap="round">
      <circle cx={0} cy={-150} r={20} stroke="none" />
      {hair && <path d="M-20,-152 Q-26,-110 -12,-104 L-6,-140 Z" stroke="none" />}
      <path d={hair ? "M-14,-126 L14,-126 L26,-50 L-26,-50 Z" : "M-15,-126 L15,-126 L13,-60 L-13,-60 Z"} stroke="none" />
      <line x1={-8} y1={-55} x2={-8 - l} y2={0} strokeWidth={11} />
      <line x1={8} y1={-55} x2={8 + l} y2={0} strokeWidth={11} />
      <line x1={-13} y1={-120} x2={-22 - l * .5} y2={-70} strokeWidth={9} />
      <line x1={13} y1={-120} x2={13 + 40 * arm + 10} y2={-70 - 40 * arm} strokeWidth={9} />
    </g>);
};

const Rain: React.FC<{t: number; n?: number; c?: string}> = ({t, n = 90, c = "#9ab"}) => <g stroke={c} strokeWidth={2} opacity={.5}>
  {Array.from({length: n}, (_, k) => { const x = rnd(k) * W * 1.2 - 100, y = ((rnd(k + 9) * H + t * 900) % (H + 80)) - 40;
    return <line key={k} x1={x} y1={y} x2={x - 8} y2={y + 30} />; })}</g>;
const Stars: React.FC<{t: number}> = ({t}) => <g fill="#fff">{Array.from({length: 70}, (_, k) =>
  <circle key={k} cx={rnd(k) * W} cy={rnd(k + 3) * H * .6} r={1 + rnd(k + 5) * 1.6} opacity={.4 + .6 * Math.abs(Math.sin(t * 2 + k))} />)}</g>;
const City: React.FC<{c: string; win: string; t: number}> = ({c, win, t}) => <g>{Array.from({length: 16}, (_, k) => {
  const w = 70 + rnd(k) * 60, h = 180 + rnd(k + 1) * 300, x = k * 85 - 40;
  return <g key={k}><rect x={x} y={H - h} width={w} height={h} fill={c} />
    {Array.from({length: 12}, (_, j) => rnd(k * 31 + j) > .55 &&
      <rect key={j} x={x + 10 + (j % 3) * 20} y={H - h + 20 + Math.floor(j / 3) * 40} width={10} height={16} fill={win} opacity={.5 + .5 * Math.sin(t + j)} />)}</g>; })}</g>;
const Bokeh: React.FC<{t: number; hue: number}> = ({t, hue}) => <g>{Array.from({length: 26}, (_, k) =>
  <circle key={k} cx={(rnd(k) * W + t * 20 * (rnd(k + 2) - .5)) % W} cy={rnd(k + 4) * H} r={20 + rnd(k + 6) * 50}
    fill={`hsl(${hue + rnd(k) * 40},90%,65%)`} opacity={.18 + .12 * Math.sin(t * 3 + k)} />)}</g>;
const Heart: React.FC<{x: number; y: number; s: number; c: string; o?: number}> = ({x, y, s, c, o = 1}) =>
  <path transform={`translate(${x},${y}) scale(${s})`} opacity={o} fill={c} d="M0,30 C-60,-10 -30,-60 0,-25 C30,-60 60,-10 0,30Z" />;
const Fireworks: React.FC<{t: number; p: number; i: number}> = ({p, i}) => <g>{[0, 1, 2].map(j => {
  const cx = 250 + rnd(i * 3 + j) * 780, cy = 120 + rnd(i * 5 + j) * 200, r = ease(p) * (90 + j * 30), hue = rnd(i + j) * 360;
  return <g key={j} opacity={1 - p}>{Array.from({length: 18}, (_, k) => { const a = k / 18 * Math.PI * 2;
    return <circle key={k} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={4} fill={`hsl(${hue},100%,70%)`} />; })}</g>; })}</g>;
const Sky: React.FC<{a: string; b: string}> = ({a, b}) => <><defs><linearGradient id={a + b} x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs><rect width={W} height={H} fill={`url(#${a + b})`} /></>;

type S = (p: number, t: number, i: number) => React.ReactNode;
const HER = "#e85d75", HIM = "#2b2d42";
// ---- story shots, grouped by act ----
const alone: S[] = [
  (p, t) => <><Sky a="#1b2333" b="#3a4a5e" /><City c="#141a24" win="#556" t={t} /><Fig x={640} y={640} c="#0a0d12" walk={t * 6} /><Rain t={t} /></>,
  (p, t) => <><rect width={W} height={H} fill="#2a3444" /><rect x={340} y={80} width={600} height={520} fill="#46566c" stroke="#1a1f29" strokeWidth={24} />
    <line x1={640} y1={80} x2={640} y2={600} stroke="#1a1f29" strokeWidth={14} /><Rain t={t} n={50} /><Fig x={640} y={720} s={2.2} c="#0d1118" /></>,
  (p, t) => <><Sky a="#222b3a" b="#11151d" /><circle cx={640} cy={260} r={140} fill="#fff6c9" opacity={.15} />
    <line x1={640} y1={260} x2={640} y2={700} stroke="#0b0e13" strokeWidth={14} /><Fig x={720} y={680} c="#0a0d12" s={1.3} /><Rain t={t} c="#dde" /></>,
  (p, t) => <><rect width={W} height={H} fill="#1d2532" /><ellipse cx={640} cy={560} rx={420} ry={60} fill="#33404f" />
    <ellipse cx={640} cy={560} rx={420 * p} ry={60 * p} fill="none" stroke="#8aa" strokeWidth={3} opacity={1 - p} /><Fig x={640} y={540} c="#0a0d12" s={1.6} /><Rain t={t} /></>,
];
const meet: S[] = [
  (p, t) => <><Sky a="#3a3550" b="#c47a6a" /><City c="#2c2638" win="#fc6" t={t} /><Fig x={420 + p * 60} y={640} c={HIM} walk={t * 6} />
    <Fig x={860 - p * 60} y={640} c={HER} dir={-1} hair walk={t * 6} /><Rain t={t} n={40} /></>,
  (p, t) => <><rect width={W} height={H} fill="#4a3d5c" /><path d="M420,330 Q640,150 860,330 Z" fill={HER} /><line x1={640} y1={240} x2={640} y2={560} stroke="#222" strokeWidth={6} />
    <Fig x={560} y={680} c={HIM} s={1.6} arm={.6} /><Fig x={720} y={680} c={HER} s={1.5} dir={-1} hair /><Rain t={t} n={60} /></>,
  (p, t) => <><rect width={W} height={H} fill="#f2c4a8" /><circle cx={480} cy={360} r={150} fill={HIM} /><circle cx={800} cy={360} r={150} fill={HER} />
    <Heart x={640} y={180 - p * 40} s={.8 + p * .4} c="#fff" o={p} /></>,
  (p, t) => <><Sky a="#ffcf9e" b="#f08a76" /><Bokeh t={t} hue={20} /><Fig x={600} y={700} s={2} c={HIM} arm={ease(p)} />
    <Fig x={700} y={700} s={2} c={HER} dir={-1} hair arm={ease(p)} /></>,
];
const together: S[] = [
  (p, t) => <><Sky a="#1d1a3a" b="#6b3a6a" /><Stars t={t} /><Bokeh t={t} hue={300} /><g transform={`rotate(${p * 40 - 20},640,560)`}>
    <Fig x={600} y={640} c={HIM} arm={1} /><Fig x={680} y={640} c={HER} dir={-1} hair arm={1} /></g></>,
  (p, t, i) => <><Sky a="#ff9a8b" b="#ff6a88" />{Array.from({length: 8}, (_, k) => <Heart key={k} x={rnd(k + i) * W} y={H - ((t * 120 + k * 120) % (H + 100))} s={.5 + rnd(k) * .5} c="#fff" o={.6} />)}
    <Fig x={600} y={680} s={1.8} c={HIM} arm={1} /><Fig x={690} y={680} s={1.8} c={HER} dir={-1} hair arm={1} /></>,
  (p, t) => <><Sky a="#0f1a3a" b="#26476b" /><City c="#0b1428" win="#ffd36b" t={t * 3} /><Fig x={560 + p * 140} y={650} c={HER} hair walk={t * 9} />
    <Fig x={500 + p * 140} y={650} c="#f4e9d8" walk={t * 9} arm={.8} /></>,
  (p, t) => <><rect width={W} height={H} fill="#ffe3c2" /><g transform={`translate(640,380) rotate(${t * 90})`}>{Array.from({length: 12}, (_, k) =>
    <rect key={k} x={-8} y={60} width={16} height={260} fill="#ffb26b" opacity={.4} transform={`rotate(${k * 30})`} />)}</g>
    <Heart x={640} y={360} s={2.2 + .6 * Math.exp(-p * 6)} c={HER} /></>,
  (p, t) => <><Sky a="#2a1b4a" b="#ef7b6b" /><Bokeh t={t} hue={30} /><circle cx={640} cy={360} r={180} fill="#ffd9a0" opacity={.5} />
    <Fig x={610} y={640} s={1.3} c={HIM} arm={1} /><Fig x={670} y={640} s={1.3} c={HER} hair dir={-1} arm={1} /></>,
];
const apart: S[] = [
  (p, t) => <><rect width={W} height={H} fill="#1a1d2b" /><rect x={W / 2 - 4} y={0} width={8} height={H} fill="#000" />
    <Fig x={320} y={640} c="#7d86a8" s={1.4} /><Fig x={960} y={640} c={HER} s={1.4} hair dir={-1} /><Rain t={t} n={50} /></>,
  (p, t) => <><Sky a="#10131c" b="#2b3247" /><Stars t={t} /><rect x={560} y={260} width={160} height={280} rx={20} fill="#0d0f15" />
    <rect x={575} y={280} width={130} height={220} rx={8} fill="#7fb2ff" opacity={.3 + .7 * (Math.floor(t * 2) % 2)} /></>,
  (p, t) => <><rect width={W} height={H} fill="#262b38" /><path d={`M0,${H} L${W},${H} L${W},500 Q640,${430 - p * 40} 0,500 Z`} fill="#11141c" />
    <Fig x={200 + p * 80} y={600} c={HIM} s={.9} walk={t * 4} /><Fig x={1080 - p * 20} y={600} c={HER} s={.9} hair dir={-1} /></>,
  (p, t) => <><rect width={W} height={H} fill="#151822" /><Heart x={640} y={360} s={3} c="#5a2a35" />
    <path d={`M640,250 L${620 + p * 10},330 L660,380 L630,470`} stroke="#151822" strokeWidth={12} fill="none" /><Rain t={t} /></>,
];
const run: S[] = [
  (p, t) => <><Sky a="#2a2f4a" b="#d07a5a" /><g transform={`translate(${-((t * 600) % 85)},0)`}><City c="#1e2236" win="#fb6" t={t} /></g>
    <Fig x={640} y={660} s={1.4} c={HIM} walk={t * 14} arm={.5} /></>,
  (p, t) => <><Sky a="#3a2f5a" b="#ff9a7a" /><g transform={`translate(${(t * 600) % 85 - 85},0)`}><City c="#2a2440" win="#fb6" t={t} /></g>
    <Fig x={640} y={660} s={1.4} c={HER} dir={-1} hair walk={t * 14} arm={.5} /></>,
  (p, t) => <><rect width={W} height={H} fill="#f6b38a" /><Fig x={200 + ease(p) * 330} y={660} s={1.5} c={HIM} walk={t * 14} arm={1} />
    <Fig x={1080 - ease(p) * 330} y={660} s={1.5} c={HER} dir={-1} hair walk={t * 14} arm={1} /></>,
  (p, t) => <><rect width={W} height={H} fill="#ffd4b0" /><circle cx={640} cy={360} r={60 + p * 700} fill="#fff4e0" />
    <Fig x={600} y={700} s={2.2} c={HIM} arm={1} /><Fig x={680} y={700} s={2.2} c={HER} dir={-1} hair arm={1} /></>,
];
const climax: S[] = [
  (p, t, i) => <><Sky a="#0c0f2a" b="#3a1f5a" /><Stars t={t} /><Fireworks t={t} p={p} i={i} /><City c="#090b1c" win="#ffd36b" t={t} />
    <Fig x={620} y={700} c={HIM} arm={1} /><Fig x={665} y={700} c={HER} hair dir={-1} arm={1} /></>,
  (p, t) => <><Sky a="#ff8a7a" b="#ffd59a" /><Bokeh t={t} hue={10} /><g transform={`rotate(${t * 120 % 360},640,520)`}>
    <Fig x={590} y={620} s={1.4} c={HIM} arm={1} /><Fig x={690} y={620} s={1.4} c={HER} dir={-1} hair arm={1} /></g></>,
  (p, t, i) => <><rect width={W} height={H} fill="#2a1338" /><Fireworks t={t} p={p} i={i + 7} />{Array.from({length: 5}, (_, k) =>
    <Heart key={k} x={640} y={360} s={1 + k * .8 + p} c="none" o={1} />)}<Heart x={640} y={360} s={2 + p} c={HER} o={1 - p * .3} /></>,
  (p, t) => <><Sky a="#ffb36b" b="#ff6a6a" /><circle cx={640} cy={520} r={260} fill="#fff1c2" />
    <Fig x={615} y={700} s={2} c={HIM} arm={1} /><Fig x={665} y={700} s={2} c={HER} dir={-1} hair arm={1} /></>,
];
const end: S = (p, t) => { const k = Math.min(1, (t - 168) / 8);
  return <><Sky a="#ffcf8a" b="#ff8a6a" /><circle cx={640} cy={560 - k * 60} r={200} fill="#fff4d0" />
    <path d="M0,720 Q640,560 1280,720 Z" fill="#3a2030" /><Fig x={615} y={640} c="#3a2030" arm={1} /><Fig x={662} y={640} c="#3a2030" dir={-1} hair arm={1} /></>; };

const ACTS: [number, S[], string][] = [[0, alone, "#9ab"], [42.5, meet, "#fc9"], [59, together, "#fff"], [89, apart, "#556"],
  [122, run, "#fda"], [142, climax, "#fff"], [170, [end], "#fff"]];

// ---- procedural shot generator: every shot beyond the hand-made ones is a fresh combination ----
const PAL: string[][][] = [
  [["#1b2333", "#3a4a5e"], ["#20242c", "#4b5563"], ["#0f172a", "#334155"], ["#262a33", "#59606e"]],
  [["#3a3550", "#c47a6a"], ["#5b4a6e", "#f0a07a"], ["#6a4c7a", "#ffc29a"], ["#2f3a5a", "#e0907a"]],
  [["#1d1a3a", "#ef7b6b"], ["#ff9a8b", "#ffd0a0"], ["#2a1b4a", "#ff6a88"], ["#ffb36b", "#ff6a88"]],
  [["#10131c", "#2b3247"], ["#151822", "#3a3f55"], ["#1a1d2b", "#454b66"], ["#0b0d14", "#252a3a"]],
  [["#2a2f4a", "#d07a5a"], ["#3a2f5a", "#ff9a7a"], ["#4a3a6a", "#ffb07a"], ["#203050", "#f08060"]],
  [["#0c0f2a", "#3a1f5a"], ["#ff8a7a", "#ffd59a"], ["#2a1338", "#ff7aa0"], ["#ffcf8a", "#ff8a6a"]],
];
const Sea: React.FC<{t: number; c: string}> = ({t, c}) => <g>{[0, 1, 2].map(k =>
  <path key={k} fill={c} opacity={.5 + k * .25} d={`M0,${520 + k * 50} ${Array.from({length: 17}, (_, j) => `Q${j * 80 + 40},${505 + k * 50 + Math.sin(t * 2 + j + k) * 14} ${j * 80 + 80},${520 + k * 50}`).join(" ")} L${W},${H} L0,${H}Z`} />)}</g>;
const Hills: React.FC<{c: string; s: number}> = ({c, s}) => <g>{[0, 1].map(k =>
  <path key={k} fill={c} opacity={.6 + k * .4} d={`M0,${H} L0,${520 + k * 60} Q${300 + rnd(s + k) * 400},${380 + k * 80} ${W},${540 + k * 40} L${W},${H}Z`} />)}</g>;
const Trees: React.FC<{c: string; s: number}> = ({c, s}) => <g fill={c}>{Array.from({length: 14}, (_, k) => {
  const x = rnd(s + k) * W, h = 160 + rnd(s + k + 50) * 220; return <path key={k} d={`M${x},${H - 60 - h} L${x - 50},${H - 40} L${x + 50},${H - 40}Z`} />; })}<rect y={H - 60} width={W} height={60} /></g>;
const Bridge: React.FC<{c: string}> = ({c}) => <g stroke={c} fill="none" strokeWidth={10}><path d={`M-50,600 Q640,380 1330,600`} />
  {Array.from({length: 12}, (_, k) => <line key={k} x1={k * 110} y1={640} x2={k * 110} y2={600 - Math.sin(k / 11 * Math.PI) * 180} strokeWidth={4} />)}<line x1={0} y1={640} x2={W} y2={640} /></g>;
const Moon: React.FC<{s: number}> = ({s}) => <circle cx={200 + rnd(s) * 880} cy={120 + rnd(s + 1) * 120} r={50 + rnd(s + 2) * 50} fill="#fff6d8" opacity={.85} />;
const Road: React.FC<{c: string; t: number}> = ({c, t}) => <g><path d={`M560,420 L720,420 L1100,${H} L180,${H}Z`} fill={c} />
  {Array.from({length: 6}, (_, k) => { const q = ((k / 6 + t * .4) % 1), y = 420 + q * q * 300;
    return <rect key={k} x={636 - q * 10} y={y} width={8 + q * 20} height={10 + q * 40} fill="#ffd36b" opacity={.8} />; })}</g>;
const Room: React.FC<{c: string; s: number}> = ({c, s}) => <g><rect width={W} height={H} fill={c} opacity={.9} />
  <rect x={180 + rnd(s) * 500} y={110} width={360} height={300} fill="#000" opacity={.35} /><rect y={560} width={W} height={160} fill="#000" opacity={.3} />
  <circle cx={1000} cy={240} r={70} fill="#ffd9a0" opacity={.35} /></g>;
const Parts: React.FC<{t: number; k: number; c: string}> = ({t, k, c}) => <g fill={c}>{Array.from({length: 50}, (_, j) => {
  const x = (rnd(j + k) * W + Math.sin(t + j) * 40), y = ((rnd(j * 2 + k) * H + t * (k % 2 ? 60 : 160)) % H);
  return k % 3 === 0 ? <circle key={j} cx={x} cy={y} r={3} opacity={.8} /> : k % 3 === 1 ? <ellipse key={j} cx={x} cy={y} rx={6} ry={3} opacity={.7} transform={`rotate(${t * 90 + j * 20},${x},${y})`} />
    : <circle key={j} cx={x} cy={H - y} r={2 + rnd(j) * 3} opacity={.5 + .5 * Math.sin(t * 4 + j)} />; })}</g>;
const Lanterns: React.FC<{t: number; s: number}> = ({t, s}) => <g>{Array.from({length: 16}, (_, j) => {
  const x = rnd(s + j) * W, y = H - ((t * 50 + rnd(j + s) * H) % (H + 60)); return <g key={j}><rect x={x} y={y} width={16} height={22} rx={5} fill="#ffb347" /><circle cx={x + 8} cy={y + 11} r={22} fill="#ffb347" opacity={.2} /></g>; })}</g>;

const gen = (i: number, a: number, p: number, t: number) => {
  const r = (n: number) => rnd(i * 13.7 + n * 7.1 + a * 101);
  const [c1, c2] = PAL[Math.min(a, 5)][Math.floor(r(1) * 4)];
  const dark = a === 0 || a === 3;
  const land = "#" + (dark ? "0b0e14" : a === 5 ? "1a0f24" : "241a2e");
  const bg = Math.floor(r(2) * 8), sd = Math.floor(r(3) * 1000);
  const back = [<City key="c" c={land} win={dark ? "#556" : "#ffd36b"} t={t} />, <Sea key="s" t={t} c={land} />, <Hills key="h" c={land} s={sd} />,
    <Trees key="t" c={land} s={sd} />, <Bridge key="b" c={land} />, <Road key="r" c={land} t={t} />, <Room key="o" c={c1} s={sd} />, <Hills key="h2" c={land} s={sd + 5} />][bg];
  const fx = Math.floor(r(4) * 6);
  const weather = dark ? (fx % 2 ? <Rain t={t} n={40 + fx * 15} /> : <Parts t={t} k={0} c="#cde" />)
    : [<Bokeh key="k" t={t} hue={r(5) * 360} />, <Lanterns key="l" t={t} s={sd} />, <Parts key="p" t={t} k={1} c="#ffc0cb" />, <Parts key="f" t={t} k={2} c="#fff2a0" />, <Stars key="s" t={t} />, null][fx];
  const x0 = 260 + r(6) * 760, sc = .7 + r(7) * 1.6, gy = 700 - (bg === 4 ? 60 : 0), d = r(8) > .5 ? 1 : -1, gap = 40 + 30 * sc;
  const g = (() => { switch (a) {
    case 0: return <Fig x={x0} y={gy} s={sc} c="#05070a" dir={d} walk={r(9) > .5 ? t * 6 : 0} />;
    case 1: return <><Fig x={x0 - gap * (2 - ease(p))} y={gy} s={sc} c={HIM} arm={p} walk={t * 5} /><Fig x={x0 + gap * (2 - ease(p))} y={gy} s={sc * .95} c={HER} dir={-1} hair walk={t * 5} /></>;
    case 2: case 5: case 6: return <g transform={r(10) > .6 ? `rotate(${(p - .5) * 30},${x0},${gy - 60 * sc})` : ""}>
      <Fig x={x0 - gap / 2} y={gy} s={sc} c={a === 6 ? "#3a2030" : HIM} arm={1} /><Fig x={x0 + gap / 2} y={gy} s={sc * .95} c={a === 6 ? "#3a2030" : HER} dir={-1} hair arm={1} /></g>;
    case 3: return r(9) > .5 ? <><Fig x={120 + r(11) * 200} y={gy} s={sc * .8} c="#7d86a8" /><Fig x={W - 120 - r(12) * 200} y={gy} s={sc * .8} c={HER} hair dir={-1} /></>
      : <Fig x={x0} y={gy} s={sc} c={r(11) > .5 ? HER : "#7d86a8"} hair={r(11) > .5} dir={d} />;
    default: return r(9) > .5 ? <Fig x={x0} y={gy} s={sc} c={HIM} dir={d} walk={t * 14} arm={.5} /> : <Fig x={x0} y={gy} s={sc} c={HER} hair dir={d} walk={t * 14} arm={.5} />;
  } })();
  return <><Sky a={c1} b={c2} />{(bg < 6 && r(13) > .5) && <Moon s={sd} />}{bg === 6 ? back : back}{a === 5 && r(14) > .4 && <Fireworks t={t} p={p} i={i} />}{g}{weather}</>;
};

// ---- lyric imagery: each vocal phrase onset brings the object its line sings about ----
const L1: [number, string][] = [[3.18,"coin"],[9.51,"spot"],[16.49,"crown"],[23.31,"dice"],[29.63,"car"],[36.08,"diamond"],[42.89,"mask"],[46.81,"glass"],[49.97,"shatter"]];
const CH: [number, string][] = [[0,"globe"],[3.4,"shatter"],[7.36,"heart"],[10.84,"heart"],[13.84,"ring"],[17.3,"coin"],[20.61,"shatter"],[23.99,"bigheart"]];
const L2: [number, string][] = [[89.23,"fountain"],[96.26,"glass"],[103.02,"rose"],[109.86,"rose"],[116.29,"globe"],[122.61,"chair"],[129.64,"chair"],[133.44,"heart"]];
// timings taken from the LRC file (verse1, chorus @59.14, verse2, chorus @142.17)
const CUES: [number, string][] = [...L1, ...CH.map(([d, k]) => [59.14 + d, k] as [number, string]), ...L2, ...CH.map(([d, k]) => [142.17 + d, k] as [number, string])];
const PH = CUES.map(c => c[0]);
const Prop: React.FC<{k: string; x: number; y: number; s: number; o?: number}> = ({k, x, y, s, o = 1}) => <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>{({
  coin: <><circle r={40} fill="#f5c542" /><circle r={28} fill="none" stroke="#c99a1e" strokeWidth={6} /></>,
  spot: <><path d="M-30,-300 L30,-300 L160,60 L-160,60Z" fill="#fff8d0" opacity={.35} />{[-120, 0, 120].map(j => <circle key={j} cx={j} cy={-80} r={10} fill="#fff" />)}</>,
  crown: <path d="M-60,30 L-60,-20 L-30,10 L0,-40 L30,10 L60,-20 L60,30Z" fill="#f5c542" />,
  dice: <><rect x={-35} y={-35} width={70} height={70} rx={12} fill="#fff" />{[[-15, -15], [15, 15], [0, 0]].map(([a, b], j) => <circle key={j} cx={a} cy={b} r={7} fill="#222" />)}</>,
  diamond: <path d="M-45,-15 L-25,-40 L25,-40 L45,-15 L0,45Z" fill="#9fe8ff" stroke="#fff" strokeWidth={3} />,
  car: <><path d="M-80,10 L-60,-25 L40,-25 L70,10 L90,10 L90,35 L-90,35 L-90,10Z" fill="#c33" /><circle cx={-50} cy={38} r={16} fill="#111" /><circle cx={50} cy={38} r={16} fill="#111" /></>,
  mask: <><path d="M-60,-20 Q0,-50 60,-20 Q50,40 0,40 Q-50,40 -60,-20Z" fill="#eee" /><ellipse cx={-22} cy={-5} rx={12} ry={8} fill="#222" /><ellipse cx={22} cy={-5} rx={12} ry={8} fill="#222" /></>,
  ring: <><circle r={36} fill="none" stroke="#f5c542" strokeWidth={10} /><path d="M-14,-40 L0,-62 L14,-40Z" fill="#cff4ff" /></>,
  heart: <path d="M0,30 C-60,-10 -30,-60 0,-25 C30,-60 60,-10 0,30Z" fill={HER} />,
  fountain: <><rect x={-70} y={10} width={140} height={30} fill="#9ab" />{[-30, 0, 30].map(j => <path key={j} d={`M${j},10 Q${j * 2},-90 ${j * 3},10`} stroke="#bdf" strokeWidth={5} fill="none" />)}</>,
  glass: <><path d="M-35,-50 L35,-50 L0,0 L35,50 L-35,50 L0,0Z" fill="none" stroke="#e8d7a8" strokeWidth={6} /><path d="M-15,40 L15,40 L0,25Z" fill="#f5c542" /></>,
  rose: <><line x1={0} y1={0} x2={0} y2={80} stroke="#2a6" strokeWidth={6} /><circle r={24} fill="#d22" /><circle r={12} fill="#a11" /></>,
  globe: <><ellipse cy={40} rx={90} ry={16} fill="#ccd" /><circle r={44} fill="#3a7bd5" /><path d="M-20,-30 Q10,-10 -10,10 Q20,20 10,40" stroke="#4c4" strokeWidth={12} fill="none" /></>,
  chair: <path d="M-30,-70 L-30,40 M-30,0 L30,0 L30,40 M-30,-70 L-20,-70" stroke="#889" strokeWidth={8} fill="none" />,
} as Record<string, React.ReactNode>)[k]}</g>;
const lyricLayer = (t: number) => {
  let q = -1; while (q < PH.length - 1 && PH[q + 1] <= t) q++;
  if (q < 0) return null;
  const d = t - PH[q], lp = Math.min(1, d / 2.5), k = CUES[q][1], dd = Math.min(1, d * 1.5);
  const chorus = t >= 59 && t < 89 || t >= 142;
  const x = 640 + (q % 2 ? 1 : -1) * 230, y = 250;
  // shockwave + spark burst on every sung line
  const burst = <g><circle cx={x} cy={y} r={ease(dd) * 260} fill="none" stroke="#fff" strokeWidth={9 * (1 - dd)} opacity={.75 * (1 - dd)} />
    {Array.from({length: 22}, (_, j) => { const a = j / 22 * 6.283 + q, r = ease(Math.min(1, d * 1.2)) * (120 + rnd(j + q) * 150);
      return <circle key={j} cx={x + Math.cos(a) * r} cy={y + Math.sin(a) * r} r={6 * (1 - Math.min(1, d))} fill={chorus ? "#ffd27a" : "#cfe6ff"} />; })}</g>;
  if (k === "shatter") return <g>{burst}{Array.from({length: 30}, (_, j) => { const a = rnd(j * 3 + q) * 6.283, r = ease(lp) * (200 + rnd(j) * 500);
    return <path key={j} transform={`translate(${640 + Math.cos(a) * r},${300 + Math.sin(a) * r + lp * lp * 300}) rotate(${d * 400 * (rnd(j) - .5)}) scale(${1 + rnd(j + 1)})`}
      d="M0,-22 L18,14 L-14,10Z" fill={["#f5c542", "#9fe8ff", "#eee", "#c33"][j % 4]} opacity={1 - lp} />; })}</g>;
  const pop = 1 + .5 * Math.exp(-d * 9);
  if (k === "bigheart") return <g>{burst}<circle cx={640} cy={330} r={300 * ease(lp)} fill={HER} opacity={.25} /><Prop k="heart" x={640} y={330} s={(1.6 + 2.8 * ease(lp)) * pop} /></g>;
  return <g>{burst}<circle cx={x} cy={y} r={130} fill={chorus ? "#ffcf7a" : "#bcd8ff"} opacity={.25 + .15 * Math.sin(t * 6)} />
    <g transform={`translate(0,${Math.sin(t * 3) * 10})`}><Prop k={k} x={x} y={y} s={1.7 * pop} /></g></g>;
};
const phraseHit = (t: number) => { let d = 9; for (const v of PH) if (v <= t) d = t - v; return Math.exp(-d * 10); };

// narration tag shown in the HUD for whatever object the current line sings about
const WORD: Record<string, [string, string]> = {coin: ["硬币", "COIN"], spot: ["追光", "SPOTLIGHT"], crown: ["王冠", "CROWN"],
  dice: ["骰子", "DICE"], car: ["跑车", "CAR"], diamond: ["钻石", "DIAMOND"], mask: ["面具", "MASK"], glass: ["玻璃", "GLASS"],
  shatter: ["碎裂", "SHATTER"], ring: ["戒指", "RING"], heart: ["心跳", "HEART"], bigheart: ["心动", "HEARTBEAT"],
  fountain: ["喷泉", "FOUNTAIN"], rose: ["玫瑰", "ROSE"], globe: ["世界", "WORLD"], chair: ["空椅", "EMPTY CHAIR"]};
const cueAt = (t: number) => { let q = -1; while (q < PH.length - 1 && PH[q + 1] <= t) q++; return q; };

const Love: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  let i = 0; while (i < B.length - 1 && B[i + 1] <= t) i++;
  const b0 = t < B[0] ? 0 : B[i], b1 = t < B[0] ? B[0] : (B[i + 1] ?? b0 + 1.14);
  const p = Math.min(1, Math.max(0, (t - b0) / (b1 - b0)));
  const half = (p * 2) % 1;            // half-beat sub-pulse
  const bi = i; { const j = i * 2 + (p >= .5 ? 1 : 0); i = j; }  // cut on every half beat -> twice as many shots
  let a = 0; while (a < ACTS.length - 1 && ACTS[a + 1][0] <= t) a++;
  const [, shots, flashC] = ACTS[a];
  let i0 = 0; while (i0 < B.length && B[i0] < ACTS[a][0]) i0++;
  const k = i - i0 * 2; // shot index within act
  const shot: S = k >= 0 && k < shots.length ? shots[k] : (pp, tt, ii) => gen(ii, a, pp, tt);
  const hot = a === 2 || a === 4 || a === 5;
  const punch = (hot ? .12 : .06) * Math.exp(-p * 7) + (hot ? .03 : 0) * Math.exp(-half * 7);
  const mv = i % 4; const ph = half; // camera move per beat: push / pull / pan / tilt-roll
  // per-beat unique framing: mirror on each repeat cycle, own zoom level, focus point, tint and scene seed
  const r1 = rnd(i * 7.3 + 1), r2 = rnd(i * 3.1 + 2), r3 = rnd(i * 5.7 + 3);
  const mir = Math.floor(i / shots.length) % 2 ? -1 : 1;
  const zb = 1.05 + r1 * .55, fx = W / 2 + (r2 - .5) * W * .5 * (zb - 1), fy = H / 2 + (r3 - .3) * H * .5 * (zb - 1);
  const hue = (rnd(i * 9.9) - .5) * 50;
  const z = zb + punch + (mv === 0 ? .12 * ease(ph) : mv === 1 ? .12 * (1 - ease(ph)) : .04);
  const tx = mv === 2 ? (ease(ph) - .5) * 80 * (i % 8 < 4 ? 1 : -1) : 0;
  const rot = mv === 3 ? (ease(ph) - .5) * 5 : 0;
  const flash = (hot ? .3 : .2) * Math.exp(-p * 12) + (hot ? .1 : .06) * Math.exp(-half * 12);
  const fade = Math.min(1, t / 1.5, (DUR - t) / 3);
  // WebGL cosmos: cold open dive, chorus star-heart (screen-blended), ending pull-back into the galaxy
  const C1 = t >= 59.14 && t < 89 || t >= 142.17 && t < 170;
  const cmode = t < 3.18 ? 0 : C1 ? 1 : t >= 170 ? 2 : -1;
  const ck = cmode === 0 ? t / 3.18 : cmode === 2 ? (t - 170) / 6.5 : 0;
  const svgO = cmode === 0 ? 0 : cmode === 2 ? Math.max(0, 1 - (t - 170) / 1.2) : fade;
  const ph2 = phraseHit(t), frame = Math.round(t * FPS);
  const ca = 3 + punch * 60 + ph2 * 14;                          // chromatic aberration on hits
  const jit = ph2 > .3 ? (rnd(frame) - .5) * 30 * ph2 : 0;        // glitch jitter on sung lines
  // Dark Forest style glitch: RGB-split slices of the actual frame on act starts + sung lines
  let gl = 0;
  for (const h of ACTS.map((x) => x[0]).concat([59.14, 142.17])) { const d = t - h; if (d >= 0 && d < .8) gl = Math.max(gl, Math.exp(-d * 13)); }
  const q = cueAt(t), w = q >= 0 ? WORD[CUES[q][1]] : null;
  const scene = <g transform={`translate(${W / 2 + tx},${H / 2 - 16}) rotate(${rot}) scale(${z * mir},${z}) translate(${-fx},${-fy})`}>{shot(ph, t + i * 3.7, i)}</g>;
  const slices = gl > .05 ? [0, 1].map((j) => {
    const y1 = rnd(frame * 3.1 + j * 11) * 88, y2 = y1 + 1.6 + rnd(frame * 5.3 + j) * 4.5;
    return <svg key={j} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", opacity: .42 * gl,
      clipPath: `inset(${y1}% 0 ${100 - y2}% 0)`, transform: `translateX(${(j ? 1 : -1) * (6 + gl * 22)}px)`,
      filter: `hue-rotate(${j ? 300 : 170}deg) saturate(2.2) brightness(1.1)`}}>{scene}</svg>; }) : null;
  loadFonts();
  return <AbsoluteFill style={{background: "#000"}}>
    <Audio src={staticFile("song.mp3")} />
    {(cmode === 0 || cmode === 2) && <AbsoluteFill style={{opacity: cmode === 2 ? .34 * Math.min(1, (t - 170) / .8) * Math.min(1, (DUR - t) / 2) : 1}}>
      <Cosmos t={t} punch={punch * 5} mode={Math.max(0, cmode)} k={ck} /></AbsoluteFill>}
    <svg viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", opacity: svgO, mixBlendMode: "normal",
      transform: `translateX(${jit}px)`,
      filter: `brightness(1) hue-rotate(${hue}deg) drop-shadow(${ca}px 0 0 rgba(255,0,60,.45)) drop-shadow(${-ca}px 0 0 rgba(0,220,255,.45))`}}>
      {scene}
      {lyricLayer(t)}
      <rect width={W} height={H} fill="#fff" opacity={.2 * phraseHit(t) + Math.exp(-Math.abs(t - 59.14) * 3) * .8 + Math.exp(-Math.abs(t - 142.17) * 3) * .8} />
      <rect width={W} height={H} fill={flashC} opacity={flash} />
      <rect width={W} height={H} fill="url(#vg)" />
      <defs><radialGradient id="vg"><stop offset=".6" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={.55} /></radialGradient></defs>
    </svg>
    {cmode === 1 && <AbsoluteFill style={{mixBlendMode: "screen", opacity: .62 * Math.min(1, (t - 59.14) / .5)}}>
      <Cosmos t={t} punch={punch * 5} mode={1} k={0} /></AbsoluteFill>}
    {slices}
    {(a === 1 || a === 2 || a >= 4) && <AbsoluteFill style={{mixBlendMode: "screen", opacity: .3,
      background: `radial-gradient(circle at ${50 + Math.sin(t * .7) * 40}% ${40 + Math.cos(t * .5) * 30}%, rgba(255,150,80,.55), rgba(255,60,120,0) 45%)`}} />}
    <Canvas2D draw={grain} style={{mixBlendMode: "overlay", opacity: .09}} />
    <TitleCard t={t} />
    <ActTitle t={t} idx={a} />
    <Hud t={t} idx={a} punch={punch} caption={w ? w[0] : ""} sub={w ? w[1] : ""} capT={q >= 0 ? CUES[q][0] : -99} />
    <EndCard t={t} />
  </AbsoluteFill>;
};

registerRoot(() => <Composition id="Love" component={Love} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={W} height={H} />);
