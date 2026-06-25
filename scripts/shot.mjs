// Headless screenshot WITH software WebGL (SwiftShader) so we can actually see
// the @kineviz/gl scenes render. Usage: node scripts/shot.mjs <url> <out.png> [waitMs]
import { chromium } from 'playwright-core';

const EXEC = '/Users/dienert/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const url = process.argv[2] || 'http://localhost:8099/';
const out = process.argv[3] || '/tmp/shot.png';
const waitMs = parseInt(process.argv[4] || '7000', 10);

const browser = await chromium.launch({
  executablePath: EXEC,
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(waitMs);
await page.screenshot({ path: out, timeout: 60000 });

// dump WebGL availability + interesting logs
const gl = await page.evaluate(() => {
  const c = document.createElement('canvas');
  const g = c.getContext('webgl2') || c.getContext('webgl');
  return g ? g.getParameter(g.VERSION) : 'NO WEBGL';
});
console.log('WEBGL:', gl);
console.log('--- console (filtered) ---');
console.log(logs.filter((l) => !/maxInstancedCount|favicon|Download the React/.test(l)).slice(-40).join('\n'));
await browser.close();
console.log('saved', out);
