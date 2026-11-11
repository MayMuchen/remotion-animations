import React from "react";
import { Composition, Folder } from "remotion";
import { DarkForest } from "./DarkForest";
import { loadFonts } from "./lib/fonts";
import { Axioms } from "./scenes/Axioms";
import { ColdOpen } from "./scenes/ColdOpen";
import { End } from "./scenes/End";
import { Foil } from "./scenes/Foil";
import { Forest } from "./scenes/Forest";
import { Strike } from "./scenes/Strike";
import { Suspicion } from "./scenes/Suspicion";
import { TechExplosion } from "./scenes/TechExplosion";
import { Title } from "./scenes/Title";
import { TOTAL } from "./timeline";

loadFonts();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="DarkForest" component={DarkForest} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
      <Folder name="Scenes">
        <Composition id="S1-ColdOpen" component={ColdOpen} durationInFrames={300} fps={30} width={1920} height={1080} />
        <Composition id="S2-Title" component={Title} durationInFrames={240} fps={30} width={1920} height={1080} />
        <Composition id="S3-Axioms" component={Axioms} durationInFrames={510} fps={30} width={1920} height={1080} />
        <Composition id="S4-Suspicion" component={Suspicion} durationInFrames={420} fps={30} width={1920} height={1080} />
        <Composition id="S5-Tech" component={TechExplosion} durationInFrames={300} fps={30} width={1920} height={1080} />
        <Composition id="S6-Forest" component={Forest} durationInFrames={450} fps={30} width={1920} height={1080} />
        <Composition id="S7-Strike" component={Strike} durationInFrames={450} fps={30} width={1920} height={1080} />
        <Composition id="S8-Foil" component={Foil} durationInFrames={390} fps={30} width={1920} height={1080} />
        <Composition id="S9-End" component={End} durationInFrames={300} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
};
