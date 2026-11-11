const {chromium}=require('C:/Users/f2408/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1000}});
 await page.goto('http://localhost:3000/DarkForest',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('canvas'));
 await page.getByRole('button',{name:'0',exact:true}).click();
 console.log(JSON.stringify(await page.evaluate(()=>Array.from(document.querySelectorAll('input')).map(e=>({type:e.type,value:e.value,placeholder:e.placeholder,outer:e.outerHTML.slice(0,250)}))),null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
