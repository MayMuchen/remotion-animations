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
import {
  Backdrop,
  BottomShade,
  FilmBars,
  Grain,
  Halation,
  Scanlines,
  Vignette,
} from "./Atmosphere";
import { ChapterCardV2, SubtitleV2 } from "./CardsV2";
import { ParticleTitle } from "./ParticleTitle";
import { getFilmCloud, type FilmCloud } from "./pointcloud-v2";
import { ShotCanvasV2 } from "./ShotCanvasV2";
import {
  bgmVolumeAtV3,
  SCENES_V3_SILENT,
  THROUGH_LENGTH_SECONDS_V3,
  THROUGH_START_SECONDS_V3,
} from "./story-v3";
import { SUBTITLES_V3_SILENT } from "./subtitles-v3";
import type { Scene } from "./story-v2";
import { WaveCanvas } from "./WaveCanvas";

const SERIF_STYLE_ID = "three-days-serif";
const TITLE_PACE = 0.78;

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
  SCENES_V3_SILENT.find(
    (scene) => time >= scene.start && time < scene.start + scene.duration,
  ) ?? SCENES_V3_SILENT[SCENES_V3_SILENT.length - 1];

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

// A sub-pixel gate weave. Every shot gets a tiny mechanical float, as if the
// film were moving through a real projector rather than a clean digital card.
const GateWeave: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const x =
    Math.sin(frame * 0.21) * 0.6 + Math.sin(frame * 0.53 + 1.1) * 0.18;
  const y =
    Math.cos(frame * 0.17) * 0.45 + Math.cos(frame * 0.47 + 0.6) * 0.14;
  const rotate = Math.sin(frame * 0.13 + 2.1) * 0.012;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${x}px, ${y}px) scale(1.004) rotate(${rotate}deg)`,
      }}
    >
      {children}
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

// The halation follows the grade of the active shot: warm amber for memory,
// cool pearl for dawn/afterlight. It stays global so the highlights bloom as
// one optical layer instead of per-particle glow.
const SceneHalation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = activeSceneAt(frame / fps);
  const tone = scene.tone ?? (scene.id === "ch2" ? "cool" : "warm");
  return <Halation tone={tone} strength={tone === "cool" ? 0.78 : 0.94} />;
};

const ShotSceneV3: React.FC<{ scene: Scene; cloud: FilmCloud }> = ({
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
        throughStartSeconds={THROUGH_START_SECONDS_V3}
        throughLengthSeconds={THROUGH_LENGTH_SECONDS_V3}
      />
    </AbsoluteFill>
  );
};

export const ThreeDaysOfLightV3Silent: React.FC = () => {
  const { fps } = useVideoConfig();
  useSerifFont();
  const [cloudHandle] = useState(() => delayRender("Sampling film point clouds"));
  const [clouds, setClouds] = useState<Record<string, FilmCloud> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const shots = SCENES_V3_SILENT.filter(
      (scene) => scene.kind === "scene" && scene.image,
    );
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

      <GateWeave>
        {SCENES_V3_SILENT.map((scene) => {
          const from = Math.round(scene.visualFrom * fps);
          const durationInFrames = Math.max(
            1,
            Math.round(scene.visualDuration * fps),
          );

          if (scene.kind === "title") {
            return (
              <Sequence
                key={scene.id}
                from={from}
                durationInFrames={durationInFrames}
                name={scene.id}
              >
                <ParticleTitle
                  duration={scene.visualDuration}
                  title={scene.title ?? ""}
                  sub={scene.sub ?? ""}
                  kicker={scene.kicker ?? ""}
                  variant="title"
                  pace={TITLE_PACE}
                />
              </Sequence>
            );
          }

          if (scene.kind === "chapter") {
            return (
              <Sequence
                key={scene.id}
                from={from}
                durationInFrames={durationInFrames}
                name={scene.id}
              >
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
              <Sequence
                key={scene.id}
                from={from}
                durationInFrames={durationInFrames}
                name={scene.id}
              >
                <ParticleTitle
                  duration={scene.visualDuration}
                  title={scene.title ?? ""}
                  sub={scene.sub ?? ""}
                  credit={scene.credit ?? ""}
                  variant="outro"
                  pace={TITLE_PACE}
                />
              </Sequence>
            );
          }

          const cloud = clouds?.[scene.id];
          if (!cloud) return null;
          return (
            <Sequence
              key={scene.id}
              from={from}
              durationInFrames={durationInFrames}
              name={scene.id}
            >
              <ShotSceneV3 scene={scene} cloud={cloud} />
            </Sequence>
          );
        })}
      </GateWeave>

      <SceneBottomShade />

      {SCENES_V3_SILENT.filter(
        (scene) => scene.kind === "scene" && SUBTITLES_V3_SILENT[scene.id],
      ).map((scene) => {
        const subtitle = SUBTITLES_V3_SILENT[scene.id];
        return (
          <Sequence
            key={`sub-${scene.id}`}
            name={`sub-${scene.id}`}
            from={Math.round(scene.visualFrom * fps)}
            durationInFrames={Math.max(
              1,
              Math.round(scene.visualDuration * fps),
            )}
          >
            <SubtitleV2
              lines={subtitle.lines}
              en={subtitle.en}
              bodyStart={scene.inDuration}
              duration={scene.visualDuration}
            />
          </Sequence>
        );
      })}

      <Audio
        src={staticFile("film/bgm-v2.wav")}
        volume={(frame) => bgmVolumeAtV3(frame / fps)}
      />

      <SceneHalation />
      <Grain strength={1.18} />
      <Scanlines />
      <Vignette />
      <FilmBars />
    </AbsoluteFill>
  );
};
