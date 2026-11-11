import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Backdrop, BottomShade, Grain, Vignette } from "./Atmosphere";
import { ChapterCard, OutroCard, Subtitle, TitleCard } from "./Cards";
import { getFilmCloud, type FilmCloud } from "./pointcloud";
import { ShotCanvas } from "./ShotCanvas";
import { SCENES, type Scene } from "./story";
import { WaveCanvas } from "./WaveCanvas";

const SERIF_STYLE_ID = "three-days-serif";

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

const ShotScene: React.FC<{ scene: Scene; cloud: FilmCloud }> = ({
  scene,
  cloud,
}) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#030303" }}>
      <Backdrop tone={scene.tone ?? "warm"} frameOffset={scene.start} />
      <WaveCanvas timeOffset={scene.start} />
      <ShotCanvas
        cloud={cloud}
        duration={scene.duration}
        timeOffset={scene.start}
        motion={scene.motion ?? "push"}
        tone={scene.tone ?? "warm"}
      />
      <BottomShade />
      {scene.lines && scene.en ? (
        <Subtitle
          lines={scene.lines}
          en={scene.en}
          duration={Math.round(scene.duration * fps) / fps}
        />
      ) : null}
    </AbsoluteFill>
  );
};

export const ThreeDaysOfLight: React.FC = () => {
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
      {SCENES.map((scene) => {
        const from = Math.round(scene.start * fps);
        const durationInFrames = Math.max(1, Math.round(scene.duration * fps));

        if (scene.kind === "title") {
          return (
            <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
              <TitleCard
                duration={scene.duration}
                title={scene.title ?? ""}
                sub={scene.sub ?? ""}
                kicker={scene.kicker ?? ""}
              />
            </Sequence>
          );
        }

        if (scene.kind === "chapter") {
          return (
            <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
              <ChapterCard
                duration={scene.duration}
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
              <OutroCard
                duration={scene.duration}
                title={scene.title ?? ""}
                sub={scene.sub ?? ""}
                credit={scene.credit ?? ""}
              />
            </Sequence>
          );
        }

        const cloud = clouds?.[scene.id];
        if (!cloud) return null;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
            <ShotScene scene={scene} cloud={cloud} />
          </Sequence>
        );
      })}

      {SCENES.filter((scene) => scene.vo).map((scene) => (
        <Sequence
          key={`vo-${scene.id}`}
          name={`vo-${scene.id}`}
          from={Math.round(scene.voStart * fps)}
          durationInFrames={Math.max(1, Math.round(scene.voDuration * fps) + 2)}
        >
          <Audio src={staticFile(`film/vo/${scene.vo}.mp3`)} volume={0.96} />
        </Sequence>
      ))}
      <Audio src={staticFile("film/bgm-full.wav")} volume={0.5} />

      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};

