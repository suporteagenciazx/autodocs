#!/usr/bin/env node
/**
 * Extrai imagens do .fig e streams de imagem do PDF para OCR/inspeção.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFig = createRequire(path.join(__dirname, '..', 'figma-package', 'package.json'));
const UZIP = requireFig('uzip');

const FIG_PATH =
  process.argv[2] ||
  String.raw`c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.fig`;
const PDF_PATH =
  process.argv[3] ||
  String.raw`c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.pdf`;
const OUT = path.join(__dirname, 'magnus-assets');

function sniffExt(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return 'webp';
  return 'bin';
}

function extractPdfImages(pdfBuf, outDir) {
  // Find JPEG and PNG streams in PDF
  const found = [];
  const u8 = pdfBuf;
  // JPEG
  for (let i = 0; i < u8.length - 2; i++) {
    if (u8[i] === 0xff && u8[i + 1] === 0xd8 && u8[i + 2] === 0xff) {
      let j = i + 2;
      while (j < u8.length - 1) {
        if (u8[j] === 0xff && u8[j + 1] === 0xd9) {
          j += 2;
          break;
        }
        j++;
      }
      const len = j - i;
      if (len > 20000) {
        found.push({ type: 'jpg', start: i, len, buf: u8.subarray(i, j) });
      }
      i = j;
    }
  }
  // PNG
  for (let i = 0; i < u8.length - 8; i++) {
    if (u8[i] === 0x89 && u8[i + 1] === 0x50 && u8[i + 2] === 0x4e && u8[i + 3] === 0x47) {
      // find IEND
      let j = i + 8;
      let end = -1;
      while (j < u8.length - 8) {
        if (
          u8[j] === 0x49 &&
          u8[j + 1] === 0x45 &&
          u8[j + 2] === 0x4e &&
          u8[j + 3] === 0x44
        ) {
          end = j + 8;
          break;
        }
        j++;
      }
      if (end > 0 && end - i > 20000) {
        found.push({ type: 'png', start: i, len: end - i, buf: u8.subarray(i, end) });
        i = end;
      }
    }
  }

  // Deduplicate overlapping (prefer larger)
  found.sort((a, b) => b.len - a.len);
  const kept = [];
  for (const f of found) {
    const overlaps = kept.some(
      k => !(f.start + f.len <= k.start || k.start + k.len <= f.start)
    );
    if (!overlaps) kept.push(f);
  }
  kept.sort((a, b) => a.start - b.start);

  const pdfDir = path.join(outDir, 'pdf');
  fs.mkdirSync(pdfDir, { recursive: true });
  const meta = [];
  kept.forEach((f, idx) => {
    const name = `pdf-img-${String(idx + 1).padStart(2, '0')}.${f.type}`;
    fs.writeFileSync(path.join(pdfDir, name), f.buf);
    meta.push({ name, type: f.type, bytes: f.len, offset: f.start });
  });
  return meta;
}

function pngSize(buf) {
  if (buf[0] !== 0x89) return null;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h };
}

fs.mkdirSync(OUT, { recursive: true });
const figDir = path.join(OUT, 'fig');
fs.mkdirSync(figDir, { recursive: true });

const figBuf = fs.readFileSync(FIG_PATH);
const files = UZIP.parse(figBuf);
const figImages = [];
for (const name of Object.keys(files)) {
  if (!name.startsWith('images/') || name.endsWith('/')) continue;
  const data = Buffer.from(files[name]);
  const ext = sniffExt(data);
  const base = path.basename(name);
  const outName = `${base}.${ext}`;
  fs.writeFileSync(path.join(figDir, outName), data);
  const dim = ext === 'png' ? pngSize(data) : null;
  figImages.push({
    source: name,
    file: outName,
    bytes: data.length,
    ext,
    width: dim?.w || null,
    height: dim?.h || null,
  });
}
figImages.sort((a, b) => b.bytes - a.bytes);

// thumbnail
if (files['thumbnail.png']) {
  fs.writeFileSync(path.join(OUT, 'thumbnail.png'), Buffer.from(files['thumbnail.png']));
}

const pdfMeta = extractPdfImages(fs.readFileSync(PDF_PATH), OUT);

// Copy desktop CAPA/MDA if present
for (const n of ['CAPA.png', 'MDA.png']) {
  const p = path.join(path.dirname(FIG_PATH), n);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(OUT, n.toLowerCase()));
  }
}

const index = {
  figImages,
  pdfImages: pdfMeta,
  meta: files['meta.json']
    ? JSON.parse(Buffer.from(files['meta.json']).toString('utf8'))
    : null,
  largestFig: figImages.slice(0, 12),
  largestPdf: [...pdfMeta].sort((a, b) => b.bytes - a.bytes).slice(0, 12),
};

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2));
console.log(
  JSON.stringify(
    {
      ok: true,
      figImageCount: figImages.length,
      pdfImageCount: pdfMeta.length,
      largestFig: index.largestFig.map(x => ({
        file: x.file,
        bytes: x.bytes,
        w: x.width,
        h: x.height,
      })),
      largestPdf: index.largestPdf,
      out: OUT,
    },
    null,
    2
  )
);
