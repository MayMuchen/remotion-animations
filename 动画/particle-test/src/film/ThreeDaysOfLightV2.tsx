import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Backdrop, BottomShade, Grain, Vignette } from "./Atmosphere";
import { ChapterCardV2, SubtitleV2 } from "./CardsV2";
import { ParticleTitle } from "./ParticleTitle";
import { getFilmCloud, type FilmCloud } from "./pointcloud-v2";
import { ShotCanvasV2 } from "./ShotCanvasV2";
import { SCENES, type Scene } from "./story-v2";
import { WaveCanvas } from "./WaveCanvas";

const SERIF_STYLE_ID = "three-days-serif";
const BGM_BASE = 0.74;
const BGM_DUCKED = 0.3;

const bgmVolumeAt = (time: number) => {
  let duck = 0;
  for (const scene of SCENES) {
    if (!scene.vo) continue;
    const from = scene.voStart - 0.22;
    const to = scene.voStart + scene.voDuration + 0.28;
    if (time < from || time > to) continue;
    const attack = Math.min(1, (time - from) / 0.22);
    const release = Math.min(1, (to - time) / 0.5);
    duck = Math.max(duck, Math.min(attack, release));
  }
  const eased = duck * duck * (3 - 2 * duck);
  return BGM_BASE - (BGM_BASE - BGM_DUCKED) * eased;
};

const useSerifFont = () => {
  const [handle] = useState(() => delayRender("Loading serif font"));
  useEffect(() => {
    if (document.getElementById(SERIF_STYLE_ID)) {
      continueRender(handle);
      return;
    }
    const style = document.createElement("style");
    style.id = SERIF_STYLE_ID;
    style.textContent = `@font-face{font-family:"NotoSerifSC";src:url("${staticFile(
      "NotoSerifSC-VF.ttf",
    )}") format("truetype");font-weight:100 900;font-display:block;}`;
    document.head.appendChild(style);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    document.fonts
      .load('300 44px "NotoSerifSC"')
      .then(finish)
      .catch(finish);
    return () => {
      if (!done) continueRender(handle);
    };
  }, [handle]);
};

const activeSceneAt = (time: number) =>
  SCENES.find((scene) => time >= scene.start && time < scene.start + scene.duration) ??
  SCENES[SCENES.length - 1];

const GlobalBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = activeSceneAt(frame / fps);
  const tone = scene.tone ?? (scene.id === "ch2" ? "cool" : "warm");
  return (
    <AbsoluteFill style={{ backgroundColor: "#030303" }}>
      <Backdrop tone={tone} frameOffset={scene.start} />
    </AbsoluteFill>
  );
};

const SceneBottomShade: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = activeSceneAt(frame / fps);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: scene.kind === "scene" ? 1 : 0,
      }}
    >
      <BottomShade />
    </div>
  );
};

const ShotSceneV2: React.FC<{ scene: Scene; cloud: FilmCloud }> = ({
  scene,
  cloud,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <WaveCanvas timeOffset={scene.visualFrom} intensity={0.95} />
      <ShotCanvasV2
        cloud={cloud}
        duration={scene.duration}
        timeOffset={scene.start}
        motion={scene.motion ?? "push"}
        tone={scene.tone ?? "warm"}
        inDuration={scene.inDuration}
        outDuration={scene.outDuration}
        inTransition={scene.inTransition}
        outTransition={scene.outTransition}
        seed={scene.seed ?? 20261106}
      />
    </AbsoluteFill>
  );
};

export const ThreeDaysOfLightV2: React.FC = () => {
  const { fps } = useVideoConfig();
  useSerifFont();
  const [cloudHandle] = useState(() => delayRender("Sampling film point clouds"));
  const [clouds, setClouds] = useState<Record<string, FilmCloud> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const shots = SCENES.filter((scene) => scene.kind === "scene" && scene.image);
    Promise.all(
      shots.map(async (scene, index) => {
        const cloud = await getFilmCloud(
          scene.image as string,
          scene.density ?? 13000,
          scene.seed ?? 20261106 + index * 7919,
          scene.tone ?? "warm",
        );
        return [scene.id, cloud] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setClouds(Object.fromEntries(entries));
        continueRender(cloudHandle);
      })
      .catch((error) => {
        console.error(error);
        continueRender(cloudHandle);
      });
    return () => {
      cancelled = true;
    };
  }, [cloudHandle]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#030303" }}>
      <GlobalBackdrop />

      {SCENES.map((scene) => {
        const from = Math.round(scene.visualFrom * fps);
        const durationInFrames = Math.max(1, Math.round(scene.visualDuration * fps));

        if (scene.kind === "title") {
          return (
            <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
              <ParticleTitle
                duration={scene.visualDuration}
                title={scene.title ?? ""}
                sub={scene.sub ?? ""}
                kicker={scene.kicker ?? ""}
                variant="title"
              />
            </Sequence>
          );
        }

        if (scene.kind === "chapter") {
          return (
            <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
              <ChapterCardV2
                duration={scene.visualDuration}
                leadIn={scene.inDuration}
                outDuration={scene.outDuration}
                chapterNo={scene.chapterNo ?? ""}
                chapterTitle={scene.chapterTitle ?? ""}
                chapterSub={scene.chapterSub ?? ""}
              />
            </Sequence>
          );
        }

        if (scene.kind === "outro") {
          return (
            <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
              <ParticleTitle
                duration={scene.visualDuration}
                title={scene.title ?? ""}
                sub={scene.sub ?? ""}
                credit={scene.credit ?? ""}
                variant="outro"
              />
            </Sequence>
          );
        }

        const cloud = clouds?.[scene.id];
        if (!cloud) return null;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
            <ShotSceneV2 scene={scene} cloud={cloud} />
          </Sequence>
        );
      })}

      <SceneBottomShade />

      {SCENES.filter((scene) => scene.kind === "scene" && scene.lines && scene.en).map(
        (scene) => (
          <Sequence
            key={`sub-${scene.id}`}
            name={`sub-${scene.id}`}
            from={Math.round(scene.visualFrom * fps)}
            durationInFrames={Math.max(1, Math.round(scene.visualDuration * fps))}
          >
            <SubtitleV2
              lines={scene.lines ?? []}
              en={scene.en ?? ""}
              bodyStart={scene.inDuration}
              duration={scene.visualDuration}
            />
          </Sequence>
        ),
      )}

      {SCENES.filter((scene) => scene.vo).map((scene) => (
        <Sequence
          key={`vo-${scene.id}`}
          name={`vo-${scene.id}`}
          from={Math.round(scene.voStart * fps)}
          durationInFrames={Math.max(1, Math.round(scene.voDuration * fps) + 2)}
        >
          <Audio src={staticFile(`film/vo-v2/${scene.vo}.wav`)} volume={1} />
        </Sequence>
      ))}

      <Audio
        src={staticFile("film/bgm-v2.wav")}
        volume={(frame) => bgmVolumeAt(frame / fps)}
      />

      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};

