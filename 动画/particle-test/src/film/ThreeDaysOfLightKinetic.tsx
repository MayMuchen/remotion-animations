import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, BottomShade, FilmBars, Grain, Vignette } from './Atmosphere';
import { ParticleTitle } from './ParticleTitle';
import { ShotCanvasV2 } from './ShotCanvasV2';
import { getFilmCloud, type FilmCloud } from './pointcloud-v2';
import type { Scene } from './story-v2';
import { KINETIC_SCENES, KINETIC_SECONDS, KINETIC_THROUGH_START } from './story-v4';
import { KineticFX } from './KineticFX';

const SERIF = 'NotoSerifSC, SimSun, serif';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const captions: Record<string, string> = {
  '01_open': '如果光明，只剩三天', '02_keller': '她在黑暗里，想象整个世界',
  '03_faces': '先看清，我爱的人', '04_memory': '让每张脸，住进记忆',
  '05_ordinary': '指尖读过的世界', ins_skin: '此刻，光有了温度',
  '06_street': '看一座城市，被晨光唤醒', '07_day1_end': '平凡，也值得凝视',
  '08_dawn': '追赶，第一缕黎明', '09_museum': '穿过时间的长廊',
  '10_statue': '让文明，在光中苏醒', '11_theater': '让每一束光，成为舞台',
  '12_city': '奔向，正在发生的生活', '13_crowd': '人海中，每张脸都是奇迹',
  '14_sunset': '在日落之前，记住世界', '15_quote': '你，真的看见了吗？',
  '16_final': '不必等到失去，才学会看见',
};

// These are short editorial intertitles, timed to pictures rather than speech.
const PictureType: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const text = captions[scene.id];
  if (!text) return null;
  const opacity = interpolate(t, [0.26, 0.46, scene.visualDuration - 0.35, scene.visualDuration - 0.13], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 125, opacity }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, translate: `0 ${interpolate(t, [0.26, 0.65], [18, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}px` }}>
      <div style={{ width: 25, height: 2, background: '#d4a978', boxShadow: '0 0 15px #f6b57b' }} />
      <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 44, letterSpacing: '0.11em', color: '#fff4e8', textShadow: '0 2px 12px #000, 0 0 30px #000' }}>{text}</div>
      <div style={{ width: 25, height: 2, background: '#d4a978', boxShadow: '0 0 15px #f6b57b' }} />
    </div>
  </AbsoluteFill>;
};

const DayCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const reveal = interpolate(t, [0.04, 0.28], [0, 1], clamp);
  return <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(ellipse at center, #122329aa, #030303ee 65%)', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', fontSize: 590, fontWeight: 200, fontFamily: 'Georgia, serif', color: '#bfdbdf14', letterSpacing: '-0.08em', translate: `${interpolate(t, [0, scene.visualDuration], [120, -100], clamp)}px -30px` }}>{scene.chapterNo}</div>
    <div style={{ textAlign: 'center', opacity: reveal, scale: interpolate(t, [0, 0.25, scene.visualDuration], [1.35, 1, 1.04], clamp), filter: `blur(${(1 - reveal) * 14}px)` }}>
      <div style={{ fontSize: 17, letterSpacing: '0.65em', color: '#8dd8e2', fontFamily: 'Arial, sans-serif', marginBottom: 22 }}>DAY {scene.chapterNo} / 03</div>
      <div style={{ fontFamily: SERIF, fontSize: 112, fontWeight: 400, letterSpacing: '0.22em', paddingLeft: '0.22em', color: '#fff1da', textShadow: '0 0 60px #f6b57b44' }}>{scene.chapterTitle}</div>
      <div style={{ width: interpolate(t, [0.1, 0.55], [0, 560], clamp), height: 1, background: 'linear-gradient(90deg, transparent, #9fe7f2, #ffcc88, transparent)', margin: '28px auto' }} />
    </div>
  </AbsoluteFill>;
};

const KineticShot: React.FC<{ scene: Scene; cloud: FilmCloud; index: number }> = ({ scene, cloud, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const inQ = interpolate(t, [0, scene.inDuration || 0.001], [1, 0], clamp);
  const outQ = interpolate(t, [scene.visualDuration - scene.outDuration, scene.visualDuration], [0, 1], clamp);
  const dir = index % 2 ? 1 : -1;
  const whip = index % 4 === 2;
  const p = Math.max(0, (t - scene.inDuration) / scene.duration);
  const kick = Math.exp(-(((scene.visualFrom + t) * 2) % 1) * 9) * 0.006;
  return <>
    <AbsoluteFill style={{ scale: 1.025 + p * 0.045 + inQ * 0.14 + outQ * 0.12 + kick, translate: `${whip ? dir * (inQ - outQ) * 190 : 0}px 0`, rotate: `${dir * (inQ * 3 - outQ * 3)}deg`, filter: `blur(${Math.max(inQ, outQ) * 2.5}px) saturate(1.16)` }}>
      <ShotCanvasV2 cloud={cloud} duration={scene.duration} timeOffset={scene.start} motion={scene.motion ?? 'push'} tone={scene.tone ?? 'warm'} inDuration={scene.inDuration} outDuration={scene.outDuration} inTransition={scene.inTransition} outTransition={scene.outTransition} seed={scene.seed ?? 20261107 + index * 7919} throughStartSeconds={KINETIC_THROUGH_START} throughLengthSeconds={1.7} energy={1} />
    </AbsoluteFill>
  </>;
};

const BackdropTrack: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = KINETIC_SCENES.find(s => f / fps >= s.start && f / fps < s.start + s.duration);
  return <Backdrop tone={scene?.tone ?? 'cool'} frameOffset={0} />;
};

export const ThreeDaysOfLightKinetic: React.FC = () => {
  const { fps } = useVideoConfig();
  const [handle] = useState(() => delayRender('Loading kinetic film assets'));
  const [clouds, setClouds] = useState<Record<string, FilmCloud>>({});
  useEffect(() => {
    let cancelled = false;
    const font = new FontFace('NotoSerifSC', `url("${staticFile('NotoSerifSC-VF.ttf')}")`, { weight: '100 900' });
    Promise.all([
      font.load().then(f => { document.fonts.add(f); }),
      Promise.all(KINETIC_SCENES.filter(s => s.image).map(async (s, i) => [s.id, await getFilmCloud(s.image!, s.density ?? 14000, s.seed ?? 20261107 + i * 7919, s.tone ?? 'warm')] as const)),
    ]).then(([, entries]) => {
      if (cancelled) return;
      setClouds(Object.fromEntries(entries));
      continueRender(handle);
    }).catch(error => { if (!cancelled) cancelRender(error); });
    return () => { cancelled = true; };
  }, [handle]);

  return <AbsoluteFill style={{ background: '#030303', overflow: 'hidden' }}>
    <BackdropTrack />
    {KINETIC_SCENES.map((scene, index) => <Sequence key={scene.id} name={`${scene.id} · kinetic`} from={Math.round(scene.visualFrom * fps)} durationInFrames={Math.round(scene.visualDuration * fps)}>
      {scene.kind === 'scene' && clouds[scene.id] ? <KineticShot scene={scene} cloud={clouds[scene.id]} index={index} /> : null}
      {scene.kind === 'chapter' ? <DayCard scene={scene} /> : null}
      {scene.kind === 'title' || scene.kind === 'outro' ? <ParticleTitle duration={scene.visualDuration} title={scene.title ?? ''} sub={scene.sub ?? ''} kicker={scene.kind === 'title' ? '海伦·凯勒 / 光的三重奏' : undefined} credit={scene.credit} variant={scene.kind === 'title' ? 'title' : 'outro'} pace={0.43} /> : null}
    </Sequence>)}
    <KineticFX />
    <BottomShade />
    {KINETIC_SCENES.filter(s => s.kind === 'scene').map(scene => <Sequence key={`type-${scene.id}`} name={`文案 · ${scene.id}`} from={Math.round(scene.visualFrom * fps)} durationInFrames={Math.round(scene.visualDuration * fps)}><PictureType scene={scene} /></Sequence>)}
    <Audio src={staticFile('film/kinetic-score.wav')} volume={f => interpolate(f / fps, [0, 0.35, KINETIC_SECONDS - 1.8, KINETIC_SECONDS], [0, 0.85, 0.85, 0], clamp)} />
    <Grain strength={0.65} />
    <Vignette />
    <FilmBars />
  </AbsoluteFill>;
};
