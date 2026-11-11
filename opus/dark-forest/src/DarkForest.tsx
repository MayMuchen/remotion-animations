import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, staticFile, Track } from "remotion";
import { CutFlash, FilmGrain, Letterbox, Vignette } from "./lib/Overlays";
import { Axioms } from "./scenes/Axioms";
import { ColdOpen } from "./scenes/ColdOpen";
import { End } from "./scenes/End";
import { Foil } from "./scenes/Foil";
import { Forest } from "./scenes/Forest";
import { Strike } from "./scenes/Strike";
import { Suspicion } from "./scenes/Suspicion";
import { TechExplosion } from "./scenes/TechExplosion";
import { Title } from "./scenes/Title";
import { SCENES } from "./timeline";

export const DarkForest: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Track name="Scenes">
        <Sequence name="01 不要回答" from={SCENES.cold.from} durationInFrames={SCENES.cold.dur}>
          <ColdOpen />
        </Sequence>
        <Sequence name="02 标题" from={SCENES.title.from} durationInFrames={SCENES.title.dur}>
          <Title />
        </Sequence>
        <Sequence name="03 两条公理" from={SCENES.axioms.from} durationInFrames={SCENES.axioms.dur}>
          <Axioms />
        </Sequence>
        <Sequence name="04 猜疑链" from={SCENES.suspicion.from} durationInFrames={SCENES.suspicion.dur}>
          <Suspicion />
        </Sequence>
        <Sequence name="05 技术爆炸" from={SCENES.tech.from} durationInFrames={SCENES.tech.dur}>
          <TechExplosion />
        </Sequence>
        <Sequence name="06 黑暗森林" from={SCENES.forest.from} durationInFrames={SCENES.forest.dur}>
          <Forest />
        </Sequence>
        <Sequence name="07 光粒打击" from={SCENES.strike.from} durationInFrames={SCENES.strike.dur}>
          <Strike />
        </Sequence>
        <Sequence name="08 二向箔" from={SCENES.foil.from} durationInFrames={SCENES.foil.dur}>
          <Foil />
        </Sequence>
        <Sequence name="09 尾声" from={SCENES.end.from} durationInFrames={SCENES.end.dur}>
          <End />
        </Sequence>
      </Track>
      <Vignette />
      <FilmGrain />
      <CutFlash
        at={[SCENES.title.from + SCENES.title.dur, SCENES.suspicion.from, SCENES.tech.from + SCENES.tech.dur, SCENES.foil.from]}
      />
      <Letterbox />
      <Audio name="Score" src={staticFile("audio/score.wav")} />
    </AbsoluteFill>
  );
};
