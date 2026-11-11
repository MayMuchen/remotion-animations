const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill, openBrowser} = require('@remotion/renderer');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  fs.mkdirSync('out/beyond', {recursive:true});
  const serveUrl = await bundle({entryPoint:path.resolve('src/index.ts')});
  const browser = await openBrowser('chrome', {chromiumOptions:{gl:'angle'}});
  const errors=[];
  try {
    const composition=await selectComposition({serveUrl,id:'Beyond',puppeteerInstance:browser});
    for(const frame of process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [120,360,600,840,1080,1320,1560,1800]) {
      const start=Date.now();
      await renderStill({composition,serveUrl,output:path.resolve(`out/beyond/frame-${frame}.jpg`),frame,puppeteerInstance:browser,scale:.6,imageFormat:'jpeg',jpegQuality:92,logLevel:'error',onBrowserLog: log=>{if(log.type==='error')errors.push(log.text);}});
      console.log(JSON.stringify({frame,ms:Date.now()-start}));
    }
    fs.writeFileSync('out/beyond/check.json',JSON.stringify({composition,errors},null,2));
    if(errors.length)throw new Error(errors.join('\n'));
  } finally {await browser.close({silent:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
