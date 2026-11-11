const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const ffmpeg=path.resolve('node_modules/ffmpeg-static/ffmpeg.exe');
const ffprobe=path.resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe');
const file=path.resolve('out/dark-forest/DarkForest-DeepSpace-Polished-1080p.mp4');
const run=(exe,args)=>execFileSync(exe,args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
const info=JSON.parse(run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',file]));
const video=info.streams.find(s=>s.codec_type==='video');
const audio=info.streams.find(s=>s.codec_type==='audio');
if(!video||!audio||video.width!==1920||video.height!==1080||+video.nb_frames!==2700||video.r_frame_rate!=='30/1'||Math.abs(+info.format.duration-90)>.05)throw Error('Unexpected export metadata');
run(ffmpeg,['-v','error','-xerror','-i',file,'-map','0:v:0','-map','0:a:0','-f','null','-']);
for(const [at,name] of [[2.5,'opening'],[58.5,'impact'],[87.5,'ending']]){
 run(ffmpeg,['-y','-v','error','-ss',String(at),'-i',file,'-frames:v','1','-q:v','2',`out/dark-forest/polished-${name}.jpg`]);
}
const result={file,duration:+info.format.duration,frames:+video.nb_frames,width:video.width,height:video.height,fps:video.r_frame_rate,videoCodec:video.codec_name,audioCodec:audio.codec_name,audioChannels:audio.channels,bytes:fs.statSync(file).size,fullDecodePassed:true,voiceover:false};
fs.writeFileSync('out/dark-forest/polish-export-check.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
