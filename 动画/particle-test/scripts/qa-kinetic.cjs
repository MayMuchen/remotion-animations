const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill, openBrowser} = require('@remotion/renderer');
const path = require('node:path');

(async () => {
  const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
  const browser = await openBrowser('chrome');
  try {
    const composition = await selectComposition({serveUrl, id: 'ThreeDaysOfLightKinetic', puppeteerInstance: browser});
    for (const frame of [210, 265, 307, 324, 355, 642, 813, 961, 1140, 1270, 1370]) {
      await renderStill({composition, serveUrl, output: path.resolve(`out/kinetic-${frame}.png`), frame, puppeteerInstance: browser, logLevel: 'error'});
      console.log(`checked ${frame}`);
    }
  } finally { await browser.close({silent: true}); }
})().catch(error => {console.error(error); process.exitCode = 1;});
