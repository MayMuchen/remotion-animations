const {chromium}=require('C:/Users/f2408/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000/Beyond',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('canvas'),{timeout:60000});
 await page.screenshot({path:'out/beyond/studio.jpg'});
 const text=await page.locator('body').innerText();
 const result={url:page.url(),canvases:await page.locator('canvas').count(),errors,text:text.slice(0,4000)};
 fs.writeFileSync('out/beyond/studio-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
