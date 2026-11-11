const {chromium} = require('C:/Users/f2408/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true});
  const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/ThreeDaysOfLightKinetic', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, {timeout: 60000});
  await page.screenshot({path: 'out/kinetic-studio.png'});
  const body = await page.locator('body').innerText();
  fs.writeFileSync('out/kinetic-studio-check.json', JSON.stringify({url: page.url(), canvasCount: await page.locator('canvas').count(), errors, text: body.slice(0, 3000)}, null, 2));
  console.log(JSON.stringify({url: page.url(), canvases: await page.locator('canvas').count(), errors}));
  await browser.close();
})().catch(e => {console.error(e); process.exitCode = 1;});
