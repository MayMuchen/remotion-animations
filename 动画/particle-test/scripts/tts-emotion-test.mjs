import fs from "node:fs";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const out = path.resolve("out/tts-test");
fs.mkdirSync(out, { recursive: true });

const text = "第三天夜晚，我会去看一场日落。然后闭上眼睛，把光留在眼皮后面。";
const tests = [
  { id: "xiaoxiao_plain", voice: "zh-CN-XiaoxiaoNeural", style: null, rate: "+8%" },
  { id: "xiaoxiao_sad", voice: "zh-CN-XiaoxiaoNeural", style: "sad", rate: "+4%" },
  { id: "xiaoxiao_gentle", voice: "zh-CN-XiaoxiaoNeural", style: "gentle", rate: "+6%" },
  { id: "xiaoyi_plain", voice: "zh-CN-XiaoyiNeural", style: null, rate: "+6%" },
  { id: "yunxi_plain", voice: "zh-CN-YunxiNeural", style: null, rate: "+6%" },
  { id: "yunjian_plain", voice: "zh-CN-YunjianNeural", style: null, rate: "+2%" },
];

for (const t of tests) {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 30000, synthesisTimeoutMs: 120000 });
  try {
    await tts.setMetadata(t.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { sentenceBoundaryEnabled: true });
    const styleOpen = t.style ? `<mstts:express-as style="${t.style}">` : "";
    const styleClose = t.style ? "</mstts:express-as>" : "";
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN"><voice name="${t.voice}"><prosody rate="${t.rate}" pitch="+0Hz">${styleOpen}${text}${styleClose}</prosody></voice></speak>`;
    const dir = path.join(out, t.id);
    fs.mkdirSync(dir, { recursive: true });
    await tts.rawToFile(dir, ssml);
    fs.copyFileSync(path.join(dir, "audio.mp3"), path.join(out, `${t.id}.mp3`));
    console.log("ok", t.id);
  } catch (e) {
    console.log("fail", t.id, String(e && e.message || e).slice(0, 240));
  } finally {
    tts.close();
  }
}
