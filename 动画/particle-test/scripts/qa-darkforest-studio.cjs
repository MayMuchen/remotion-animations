const {chromium}=require('C:/Users/f2408/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const composition=process.argv[2]||'DarkForest';
if(!['DarkForest','DarkForestDeepSpace'].includes(composition))throw new Error('Unknown composition');
const prefix=composition==='DarkForestDeepSpace'?'deep-space-':'';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1700,height:1050}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__darkAudio=[];const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){if(destination instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();analyser.fftSize=2048;connect.call(this,analyser);window.__darkAudio.push(analyser);}return connect.call(this,destination,...args);};
 });
 await page.goto(`http://localhost:3000/${composition}`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('canvas'),{timeout:60000});
 await page.getByRole('button',{name:'Play',exact:true}).click();
 await page.waitForFunction(()=>window.__darkAudio.some(a=>a.context.currentTime>3),{timeout:30000});
 const audio=await page.evaluate(()=>window.__darkAudio.map(a=>{const x=new Float32Array(a.fftSize);a.getFloatTimeDomainData(x);let sum=0,peak=0;for(const s of x){sum+=s*s;peak=Math.max(peak,Math.abs(s));}return{state:a.context.state,time:a.context.currentTime,rms:Math.sqrt(sum/x.length),peak};}));
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.screenshot({path:`out/dark-forest/${prefix}studio-playing.jpg`});
 const body=await page.locator('body').innerText();
 const result={url:page.url(),audio,errors,nonSilent:audio.some(a=>a.rms>.0001),voiceover:false,timecodes:body.match(/\d\d:\d\d\.\d\d/g),containsVoiceAssets:/voice\/(?:00|01)-|旁白音轨/.test(body),text:body.slice(0,2000)};
 fs.writeFileSync(`out/dark-forest/${prefix}playback-check.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({...result,text:undefined}));
 if(errors.length||!result.nonSilent||result.containsVoiceAssets)throw new Error('Studio playback validation failed');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
