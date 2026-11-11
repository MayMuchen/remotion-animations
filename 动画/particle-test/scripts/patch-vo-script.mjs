import fs from "node:fs";
const p = "scripts/make-vo-v2.mjs";
let s = fs.readFileSync(p, "utf8");
s = s.replace('await tts.setMetadata("zh-CN-XiaoxiaoNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { sentenceBoundaryEnabled: true });', 'await tts.setMetadata("zh-CN-YunxiNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { sentenceBoundaryEnabled: true });');
s = s.replace(`  const hp = highpass(72), e1 = peaking(190, 0.7, 1.2), e2 = peaking(3200, 1.1, 1.1);
  for (let i = 0; i < out.length; i++) out[i] = e2.process(e1.process(hp.process(out[i])));`, `  const hp = highpass(66), e1 = peaking(185, 1.15, 1.15), e2 = peaking(2900, 0.35, 1.0), e3 = peaking(5400, -0.65, 1.25);
  for (let i = 0; i < out.length; i++) out[i] = e3.process(e2.process(e1.process(hp.process(out[i]))));`);
s = s.replace(`  // Active-speech RMS to about -17 dBFS, then peak-safe soft limit.
  let sum = 0, cnt = 0;`, `  // A very short, dark room tail glues the phrases together and makes the
  // read feel closer and more intimate without sounding like a cathedral.
  const wet = new Float32Array(out.length);
  const taps = [
    [0.019, 0.085],
    [0.037, 0.058],
    [0.071, 0.037],
    [0.113, 0.024],
    [0.167, 0.015],
  ];
  for (const [seconds, gain] of taps) {
    const d = Math.round(seconds * SR);
    for (let i = d; i < out.length; i++) wet[i] += out[i - d] * gain;
  }
  let lp = 0;
  let wetSum = 0;
  for (let i = 0; i < wet.length; i++) {
    lp += 0.2 * (wet[i] - lp);
    wet[i] = lp;
    wetSum += Math.abs(lp);
  }
  if (wetSum > 0.0001) {
    for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.95 + wet[i] * 0.48;
  }

  // Active-speech RMS to about -17 dBFS, then peak-safe soft limit.
  let sum = 0, cnt = 0;`);
fs.writeFileSync(p, s);
