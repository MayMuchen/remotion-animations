import fs from "node:fs"; import path from "node:path"; import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
const out=path.resolve("out/tts-test");
const variants=[
 {id:"v_plain",mode:"file",text:"第三天夜晚，我会去看一场日落。然后闭上眼睛，把光，留在眼皮后面。"},
 {id:"v_break",mode:"file",text:'第三天夜晚，<break time="300ms"/>我会去看一场日落。然后闭上眼睛，<break time="250ms"/>把光，留在眼皮后面。'},
 {id:"v_pros",mode:"file",text:'<prosody rate="+8%">第三天夜晚，</prosody>我会去看一场日落。<prosody rate="-4%">把光，留在眼皮后面。</prosody>'},
 {id:"v_raw",mode:"raw",text:"第三天夜晚，我会去看一场日落。然后闭上眼睛，把光，留在眼皮后面。"},
];
for(const v of variants){const t=new MsEdgeTTS({connectionTimeoutMs:30000,synthesisTimeoutMs:120000});try{await t.setMetadata("zh-CN-XiaoxiaoNeural",OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,{sentenceBoundaryEnabled:true});const dir=path.join(out,v.id+"_d");fs.mkdirSync(dir,{recursive:true});if(v.mode==="file"){await t.toFile(dir,v.text,{rate:"+6%",pitch:"+0Hz"});}else{const ssml=`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><voice name="zh-CN-XiaoxiaoNeural"><prosody rate="+6%" pitch="+0Hz">${v.text}</prosody></voice></speak>`;await t.rawToFile(dir,ssml);}fs.copyFileSync(path.join(dir,"audio.mp3"),path.join(out,v.id+".mp3"));console.log("ok",v.id);}catch(e){console.log("fail",v.id,String(e.message||e).slice(0,160));}finally{t.close();}}
