const {chromium}=require('C:/Users/f2408/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1700,height:1050}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:3000/DarkForestDeepSpace',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('canvas'));
  const results=[];
  for(const frame of [148,1226,1748,2240]){
   const timecode=page.getByRole('button').filter({hasText:/^\d\d:\d\d\.\d\d$/}).last();
   await timecode.click();
   const input=page.locator('input[type="text"]').filter({visible:true});
   await input.fill(String(frame));await input.press('Enter');
   await page.waitForTimeout(500);
   await page.getByRole('button',{name:'Play',exact:true}).click();
   await page.waitForTimeout(1000);
   await page.getByRole('button',{name:'Pause',exact:true}).click();
   const result=await page.evaluate(()=>({
    canvases:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height})),
    shaderError:/Shader compilation|Shader link|WebGL unavailable/.test(document.body.innerText),
    timecodes:document.body.innerText.match(/\d\d:\d\d\.\d\d/g),
   }));
   await page.screenshot({path:`out/dark-forest/polish-studio-${frame}.jpg`});
   results.push({seek:frame,...result});
   if(result.shaderError||!result.canvases.some(c=>c.width===1920&&c.height===1080))throw Error('Invalid WebGL scene');
  }
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync('out/dark-forest/polish-studio-check.json',JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({results,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
