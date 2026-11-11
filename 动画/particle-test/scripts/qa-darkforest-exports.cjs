const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const ffmpeg = path.resolve('node_modules/ffmpeg-static/ffmpeg.exe');
const ffprobe = path.resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe');
const files = ['DarkForest-Space-Groove-1080p.mp4', 'DarkForest-DeepSpace-BGM-1080p.mp4'];
const run = (exe, args) => execFileSync(exe, args, {encoding:'utf8', maxBuffer:8*1024*1024, windowsHide:true});
const reports = files.map((name) => {
  const file = path.resolve('out/dark-forest', name);
  const info = JSON.parse(run(ffprobe, ['-v','error','-show_streams','-show_format','-of','json',file]));
  const video = info.streams.find(s => s.codec_type === 'video');
  const audio = info.streams.find(s => s.codec_type === 'audio');
  if (!video || !audio || video.width !== 1920 || video.height !== 1080 || video.nb_frames !== '2700' || video.r_frame_rate !== '30/1' || Math.abs(+info.format.duration-90) > .05) throw Error(`Invalid export: ${name}`);
  // Decode the entire export, not just its container header.
  run(ffmpeg, ['-v','error','-xerror','-i',file,'-map','0:v:0','-map','0:a:0','-f','null','-']);
  const videoHash = run(ffmpeg, ['-v','error','-i',file,'-map','0:v:0','-c:v','copy','-f','hash','-hash','sha256','-']).trim();
  const audioHash = run(ffmpeg, ['-v','error','-i',file,'-map','0:a:0','-c:a','copy','-f','hash','-hash','sha256','-']).trim();
  return {file, bytes:fs.statSync(file).size, duration:+info.format.duration, width:video.width, height:video.height, fps:video.r_frame_rate, frames:+video.nb_frames, videoCodec:video.codec_name, audioCodec:audio.codec_name, audioChannels:audio.channels, fullDecodePassed:true, videoHash, audioHash};
});
const result = {exports:reports, identicalVideoTrack:reports[0].videoHash===reports[1].videoHash, differentAudioTracks:reports[0].audioHash!==reports[1].audioHash, voiceover:false};
if (!result.identicalVideoTrack || !result.differentAudioTracks) throw Error('A/B track validation failed');
fs.writeFileSync('out/dark-forest/export-validation.json', JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
