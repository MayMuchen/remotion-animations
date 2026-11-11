import { Composition } from "remotion";
import { Beyond } from "./beyond/Beyond";
import { DarkForest, DarkForestDeepSpace } from "./dark-forest/DarkForest";
import { ParticleTest } from "./ParticleTest";
import { ThreeDaysOfLight } from "./film/ThreeDaysOfLight";
import { ThreeDaysOfLightV2 } from "./film/ThreeDaysOfLightV2";
import { ThreeDaysOfLightV3Silent } from "./film/ThreeDaysOfLightV3Silent";
import { ThreeDaysOfLightKinetic } from "./film/ThreeDaysOfLightKinetic";
import { KINETIC_FRAMES } from "./film/story-v4";
import { FILM_FPS, TOTAL_FRAMES } from "./film/story";
import { TOTAL_FRAMES as TOTAL_FRAMES_V2 } from "./film/story-v2";
import { TOTAL_FRAMES_V3_SILENT } from "./film/story-v3";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DarkForest"
        component={DarkForest}
        durationInFrames={2700}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DarkForestDeepSpace"
        component={DarkForestDeepSpace}
        durationInFrames={2700}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Beyond"
        component={Beyond}
        durationInFrames={1920}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ThreeDaysOfLightKinetic"
        component={ThreeDaysOfLightKinetic}
        durationInFrames={KINETIC_FRAMES}
        fps={24}
        width={1920}
        height={1080}
      />
      <Composition
        id="ParticleTest"
        component={ParticleTest}
        durationInFrames={240}
        fps={24}
        width={1920}
        height={1080}
      />
      <Composition
        id="ThreeDaysOfLight"
        component={ThreeDaysOfLight}
        durationInFrames={TOTAL_FRAMES}
        fps={FILM_FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ThreeDaysOfLightV2"
        component={ThreeDaysOfLightV2}
        durationInFrames={TOTAL_FRAMES_V2}
        fps={FILM_FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ThreeDaysOfLightV3Silent"
        component={ThreeDaysOfLightV3Silent}
        durationInFrames={TOTAL_FRAMES_V3_SILENT}
        fps={FILM_FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
