import fs from "node:fs";
const p = "src/film/CardsV2.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replace('import { AmbientDust } from "./Atmosphere";', 'import { AmbientDust } from "./Atmosphere";\nimport { ParticleChapterText } from "./ParticleChapter";');
s = s.replace(`export const ChapterCardV2: React.FC<{
  duration: number;
  leadIn: number;
  chapterNo: string;
  chapterTitle: string;
  chapterSub: string;
}> = ({ duration, leadIn, chapterNo, chapterTitle, chapterSub }) => {`, `export const ChapterCardV2: React.FC<{
  duration: number;
  leadIn: number;
  outDuration: number;
  chapterNo: string;
  chapterTitle: string;
  chapterSub: string;
}> = ({ duration, leadIn, outDuration, chapterNo, chapterTitle, chapterSub }) => {`);
s = s.replace(`  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", opacity }}>
      <AmbientDust opacity={0.5} />`, `  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", opacity }}>
      <AmbientDust opacity={0.42} />
      <ParticleChapterText
        duration={duration}
        inDuration={leadIn}
        outDuration={outDuration}
        title={chapterTitle}
      />`);
fs.writeFileSync(p, s);
