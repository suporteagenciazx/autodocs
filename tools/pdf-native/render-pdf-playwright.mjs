import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('../../node_modules/playwright-core');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF =
  process.argv[2] ||
  String.raw`c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.pdf`;
const OUT = path.join(__dirname, 'magnus-assets', 'ocr');
fs.mkdirSync(OUT, { recursive: true });

const pdfUrl = pathToFileURL(PDF).href;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });

// Use Chrome PDF viewer
await page.goto(pdfUrl, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(2000);

// Try to detect pages in PDF viewer
const info = await page.evaluate(() => {
  const plugins = !!navigator.pdfViewerEnabled || true;
  return {
    title: document.title,
    bodyText: (document.body?.innerText || '').slice(0, 200),
    embed: !!document.querySelector('embed, object, pdf-viewer'),
    html: document.documentElement.outerHTML.slice(0, 500),
  };
});
console.error('viewer', info);

// Screenshot full viewport as fallback page 1
await page.screenshot({ path: path.join(OUT, 'playwright-view.png'), fullPage: true });

// Try keyboard page down for multiple shots
for (let i = 1; i <= 4; i++) {
  await page.screenshot({
    path: path.join(OUT, `pw-page-${String(i).padStart(2, '0')}.png`),
    fullPage: false,
  });
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(800);
}

await browser.close();
console.log(JSON.stringify({ ok: true, out: OUT }));
