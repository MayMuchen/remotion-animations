const {chromium}=require('C:/Users/f2408/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__beyondAudio=[];
  const original=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){
   if(destination instanceof AudioDestinationNode){
    const analyser=this.context.createAnalyser();analyser.fftSize=2048;
    original.call(this,analyser);window.__beyondAudio.push(analyser);
   }
   return original.call(this,destination,...args);
  };
 });
 await page.goto('http://localhost:3000/Beyond',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('canvas'),{timeout:60000});
 await page.getByRole('button',{name:'Play',exact:true}).click();
 await page.waitForFunction(()=>window.__beyondAudio.some(a=>a.context.currentTime>3),{timeout:30000});
 const audio=await page.evaluate(()=>window.__beyondAudio.map(a=>{
  const x=new Float32Array(a.fftSize);a.getFloatTimeDomainData(x);
  let sum=0,peak=0;for(const sample of x){sum+=sample*sample;peak=Math.max(peak,Math.abs(sample));}
  return {state:a.context.state,currentTime:a.context.currentTime,rms:Math.sqrt(sum/x.length),peak};
 }));
 const time=await page.locator('body').innerText();
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.screenshot({path:'out/beyond/studio-playing.jpg'});
 const result={audio,errors,timecodes:time.match(/\d\d:\d\d\.\d\d/g),nonSilent:audio.some(a=>a.rms>.0001)};
 fs.writeFileSync('out/beyond/playback-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 if(errors.length||!result.nonSilent)throw new Error('Playback/audio validation failed');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
