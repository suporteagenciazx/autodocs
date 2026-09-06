#!/usr/bin/env node
/**
 * Inflata chunks do canvas.fig e extrai strings UTF-8 (incl. length-prefixed kiwi).
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
const OUT = path.join(__dirname, 'magnus-inflated-strings.json');

function readU32(u8, off) {
  return (u8[off] | (u8[off + 1] << 8) | (u8[off + 2] << 16) | (u8[off + 3] << 24)) >>> 0;
}

function inflateChunks(canvasBuf) {
  const u8 = new Uint8Array(canvasBuf);
  let a = 8;
  readU32(u8, a);
  a += 4;
  const chunks = [];
  while (a + 4 <= u8.length) {
    const size = readU32(u8, a);
    a += 4;
    if (size <= 0 || a + size > u8.length) break;
    let slice = u8.subarray(a, a + size);
    // PNG magic = already uncompressed image-ish; else inflateRaw
    const isPng = slice[0] === 137 && slice[1] === 80;
    if (!isPng) {
      try {
        const out = UZIP.inflateRaw(slice);
        if (out && out.length) slice = out;
      } catch {
        /* keep raw */
      }
    }
    chunks.push({ size, inflated: slice.length, isPng, data: slice });
    a += size;
  }
  return chunks;
}

function extractStrings(u8, minLen = 4) {
  const out = [];
  // null-terminated
  for (let i = 0; i < u8.length; i++) {
    if (u8[i] < 0x20 || u8[i] > 0xf4) continue;
    let j = i;
    const bytes = [];
    while (j < u8.length && u8[j] !== 0 && bytes.length < 2500) {
      const b = u8[j];
      if (b < 0x09 || (b > 0x0d && b < 0x20)) break;
      bytes.push(b);
      j++;
    }
    if (u8[j] === 0 && bytes.length >= minLen) {
      try {
        const s = Buffer.from(bytes).toString('utf8');
        if (!s.includes('\uFFFD') && /[A-Za-zÀ-ú{]/.test(s)) out.push(s);
      } catch {
        /* ignore */
      }
      i = j;
    }
  }
  // also ASCII runs
  let i = 0;
  while (i < u8.length) {
    if (u8[i] >= 0x20 && u8[i] <= 0x7e) {
      let j = i;
      while (j < u8.length && u8[j] >= 0x20 && u8[j] <= 0x7e) j++;
      if (j - i >= minLen) out.push(Buffer.from(u8.subarray(i, j)).toString('latin1'));
      i = j;
    } else i++;
  }
  return out;
}

function uniq(arr) {
  return [...new Set(arr.map(s => s.trim()).filter(Boolean))];
}

const fig = fs.readFileSync(FIG_PATH);
const files = UZIP.parse(fig);
const meta = files['meta.json'] ? Buffer.from(files['meta.json']).toString('utf8') : null;
const canvas = Buffer.from(files['canvas.fig']);

console.error('meta.json:', meta?.slice(0, 500));
const chunks = inflateChunks(canvas);
console.error(
  'chunks',
  chunks.map(c => ({ size: c.size, inflated: c.inflated, isPng: c.isPng }))
);

const all = [];
chunks.forEach((c, idx) => {
  if (c.isPng) return;
  const strs = extractStrings(c.data, 3);
  console.error(`chunk ${idx}: ${strs.length} strings, inflated ${c.inflated}`);
  all.push(...strs);
});

const unique = uniq(all);
const interesting = unique.filter(
  s =>
    /\{[A-Za-zÀ-ú_][^}]{0,80}\}/.test(s) ||
    /magnus|laudo|avalia|cliente|empresa|cnpj|equity|valuation|página|pagina|capa|R\$|metodolog|conclus/i.test(
      s
    ) ||
    (s.length >= 12 && /[àáâãéêíóôõúç]/i.test(s))
);

const placeholders = [];
const re = /\{([^{}\n]{1,80})\}/g;
for (const s of unique) {
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(s))) {
    const inner = m[1].trim();
    if (!/[A-Za-zÀ-ú_]/.test(inner)) continue;
    if (/^"?(r|width|height|x|y)"?:/.test(inner)) continue; // json geometry
    if (inner.includes('"r":') || inner.includes('"width"')) continue;
    placeholders.push(`{${inner}}`);
  }
}

const result = {
  meta: meta ? JSON.parse(meta) : null,
  chunkSummary: chunks.map(c => ({ size: c.size, inflated: c.inflated, isPng: c.isPng })),
  stringCount: unique.length,
  interestingCount: interesting.length,
  interesting: interesting.slice(0, 2000),
  placeholders: [...new Set(placeholders)].sort(),
  sampleUnique: unique.filter(s => s.length >= 8 && s.length < 200).slice(0, 300),
};

fs.writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
console.error(JSON.stringify({
  ok: true,
  strings: unique.length,
  interesting: interesting.length,
  placeholders: result.placeholders.slice(0, 50),
  out: OUT,
}, null, 2));
