import fs from "node:fs";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const outRoot = path.resolve("out/tts-style-test2");
fs.rmSync(outRoot, {recursive: true, force: true});
fs.mkdirSync(outRoot, {recursive: true});

const cases = [
  {id: "xiaoxiao-plain", voice: "zh-CN-XiaoxiaoNeural", style: null},
  {id: "xiaoxiao-gentle", voice: "zh-CN-XiaoxiaoNeural", style: "gentle", degree: "1.5"},
  {id: "xiaoxiao-sad", voice: "zh-CN-XiaoxiaoNeural", style: "sad", degree: "1.4"},
  {id: "xiaomo-plain", voice: "zh-CN-XiaomoNeural", style: null},
  {id: "xiaomo-sad", voice: "zh-CN-XiaomoNeural", style: "sad", degree: "1.4"},
  {id: "xiaoxuan-plain", voice: "zh-CN-XiaoxuanNeural", style: null},
];

const text = "如果，明天醒来，世界只剩下声音。你会先去看什么？";

for (const c of cases) {
  const dir = path.join(outRoot, c.id);
  fs.mkdirSync(dir, {recursive: true});
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(c.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {sentenceBoundaryEnabled: true});
    const inner = `<prosody pitch="-2Hz" rate="-4%">${text}</prosody>`;
    const body = c.style
      ? `<mstts:express-as style="${c.style}" styledegree="${c.degree}">${inner}</mstts:express-as>`
      : inner;
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN"><voice name="${c.voice}">${body}</voice></speak>`;
    const res = await tts.rawToFile(dir, ssml);
    const st = fs.statSync(res.audioFilePath);
    console.log(c.id, st.size);
  } catch (e) {
    console.log(c.id, "ERROR", String(e.message || e).slice(0, 200));
  } finally {
    tts.close();
  }
}
