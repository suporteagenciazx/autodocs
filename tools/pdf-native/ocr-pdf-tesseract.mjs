#!/usr/bin/env node
/**
 * Render PDF pages with Playwright (pdf.js via HTTP) + OCR tesseract.js
 */
import fs from 'fs';
import path from 'path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('../../node_modules/playwright-core');
const Tesseract = require('tesseract.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF = process.argv[2] || path.join(__dirname, 'magnus-assets', 'origem.pdf');
const OUT = path.join(__dirname, 'magnus-assets', 'ocr');
fs.mkdirSync(OUT, { recursive: true });

const pdfBuf = fs.readFileSync(PDF);

const server = http.createServer((req, res) => {
  if (req.url === '/doc.pdf') {
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': pdfBuf.length,
    });
    res.end(pdfBuf);
    return;
  }
  if (req.url === '/' || req.url === '/index.html') {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>html,body{margin:0;background:#333}#wrap{display:flex;flex-direction:column;gap:16px;align-items:center;padding:16px}canvas{background:#fff}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head><body><div id="wrap"></div>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
(async () => {
  const doc = await pdfjsLib.getDocument('/doc.pdf').promise;
  window.__pageCount = doc.numPages;
  const wrap = document.getElementById('wrap');
  const scale = 2.0;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.dataset.page = String(i);
    wrap.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  }
  window.__ready = true;
})().catch(e => { window.__error = String(e && e.message ? e.message : e); });
</script></body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  res.writeHead(404);
  res.end('no');
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
console.error('Serving', base);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 2000 } });
await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 180000 });
const err = await page.evaluate(() => window.__error || null);
if (err) throw new Error(err);
const count = await page.evaluate(() => window.__pageCount);
console.error('PDF pages:', count);

const results = [];
for (let i = 1; i <= count; i++) {
  const canvas = page.locator(`canvas[data-page="${i}"]`);
  const imgPath = path.join(OUT, `page-${String(i).padStart(2, '0')}.png`);
  await canvas.screenshot({ path: imgPath });
  console.error('OCR page', i, '…');
  const { data } = await Tesseract.recognize(imgPath, 'por+eng', {
    logger: m => {
      if (m.status === 'recognizing text') {
        process.stderr.write(`\r  p${i} ${Math.round((m.progress || 0) * 100)}%   `);
      }
    },
  });
  process.stderr.write('\n');
  const text = (data.text || '').replace(/\r/g, '').trim();
  results.push({ index: i, image: path.basename(imgPath), text, confidence: data.confidence });
  fs.writeFileSync(path.join(OUT, `page-${String(i).padStart(2, '0')}.txt`), text, 'utf8');
}

await browser.close();
server.close();

const outJson = path.join(OUT, 'pdf-ocr.json');
fs.writeFileSync(outJson, JSON.stringify({ ok: true, pageCount: count, pages: results }, null, 2), 'utf8');
console.log(JSON.stringify({ ok: true, pageCount: count, chars: results.map(r => r.text.length), out: outJson }));
