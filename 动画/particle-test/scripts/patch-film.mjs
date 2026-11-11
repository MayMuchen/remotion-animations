import fs from "node:fs";
const p = "src/film/ThreeDaysOfLightV2.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replace(`              <ChapterCardV2
                duration={scene.visualDuration}
                leadIn={scene.inDuration}
                chapterNo={scene.chapterNo ?? ""}`, `              <ChapterCardV2
                duration={scene.visualDuration}
                leadIn={scene.inDuration}
                outDuration={scene.outDuration}
                chapterNo={scene.chapterNo ?? ""}`);
s = s.replace('          <Audio src={staticFile(`film/vo-v2/${scene.vo}.wav`)} volume={1} />', '          <Audio src={staticFile(`film/vo-v2/${scene.vo}.wav`)} volume={0.84} />');
s = s.replace('      <Audio src={staticFile("film/bgm-v2.wav")} volume={0.86} />', `      <Audio
        src={staticFile("film/bgm-v2.wav")}
        volume={(frame) => bgmVolumeAt(frame / fps)}
      />`);
s = s.replace('const SERIF_STYLE_ID = "three-days-serif";', `const SERIF_STYLE_ID = "three-days-serif";
const BGM_BASE = 0.92;
const BGM_DUCKED = 0.64;

const bgmVolumeAt = (time: number) => {
  let duck = 0;
  for (const scene of SCENES) {
    if (!scene.vo) continue;
    const from = scene.voStart - 0.22;
    const to = scene.voStart + scene.voDuration + 0.28;
    if (time < from || time > to) continue;
    const attack = Math.min(1, (time - from) / 0.3);
    const release = Math.min(1, (to - time) / 0.38);
    duck = Math.max(duck, Math.min(attack, release));
  }
  const eased = duck * duck * (3 - 2 * duck);
  return BGM_BASE - (BGM_BASE - BGM_DUCKED) * eased;
};`);
fs.writeFileSync(p, s);
