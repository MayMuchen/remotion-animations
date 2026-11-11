const {bundle}=require('@remotion/bundler');
const {selectComposition,renderStill,openBrowser}=require('@remotion/renderer');
const path=require('node:path');const fs=require('node:fs');
(async()=>{
 fs.mkdirSync('out/dark-forest/frames',{recursive:true});
 const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts')});
 const browser=await openBrowser('chrome',{chromiumOptions:{gl:'angle'}});const errors=[];
 try{
  const composition=await selectComposition({serveUrl,id:'DarkForest',puppeteerInstance:browser});
  const frames=process.argv.slice(2).length?process.argv.slice(2).map(Number):[75,125,225,375,550,750,975,1075,1225,1330,1475,1580,1700,1755,1875,2000,2175,2425,2625];
  for(const frame of frames){
   const start=Date.now();
   await renderStill({composition,serveUrl,output:path.resolve(`out/dark-forest/frames/${frame}.jpg`),frame,puppeteerInstance:browser,scale:.6,imageFormat:'jpeg',jpegQuality:94,logLevel:'error',onBrowserLog:l=>{if(l.type==='error')errors.push(l.text);}});
   console.log(JSON.stringify({frame,seconds:frame/30,ms:Date.now()-start}));
  }
  fs.writeFileSync('out/dark-forest/keyframe-check.json',JSON.stringify({composition,frames,errors},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
 }finally{await browser.close({silent:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

