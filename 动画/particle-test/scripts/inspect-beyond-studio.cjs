const {chromium}=require('C:/Users/f2408/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
await page.goto('http://localhost:3000/Beyond',{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.querySelector('canvas'),{timeout:60000});
console.log(JSON.stringify(await page.evaluate(()=>({buttons:Array.from(document.querySelectorAll('button,[role="button"],[title]')).map(e=>({tag:e.tagName,label:e.getAttribute('aria-label'),title:e.getAttribute('title'),text:e.innerText?.slice(0,50)})).filter(e=>e.label||e.title),inputs:Array.from(document.querySelectorAll('input')).map(e=>({type:e.type,value:e.value,placeholder:e.placeholder})),audio:Array.from(document.querySelectorAll('audio')).map(a=>({src:a.currentSrc,ready:a.readyState}))})),null,2));
await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
