#!/usr/bin/env node
/**
 * Extrai texto por página de um PDF (stdout JSON).
 * Uso: node extract.mjs /caminho/arquivo.pdf
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

function normalizePageText(raw) {
  return String(raw || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extract(pdfPath) {
  const abs = path.resolve(pdfPath);
  if (!fs.existsSync(abs)) {
    throw new Error('PDF não encontrado: ' + abs);
  }
  const dataBuffer = fs.readFileSync(abs);
  const pages = [];

  const result = await pdfParse(dataBuffer, {
    // pagerender: acumula texto por página
    pagerender: function (pageData) {
      return pageData.getTextContent().then(function (textContent) {
        let lastY = null;
        const parts = [];
        for (const item of textContent.items) {
          if (!item || typeof item.str !== 'string') continue;
          const y = Array.isArray(item.transform) ? item.transform[5] : null;
          if (lastY != null && y != null && Math.abs(lastY - y) > 6) {
            parts.push('\n');
          } else if (
            parts.length &&
            parts[parts.length - 1] !== '\n' &&
            item.str &&
            !/^\s/.test(item.str) &&
            !/\s$/.test(parts[parts.length - 1])
          ) {
            parts.push(' ');
          }
          parts.push(item.str);
          if (item.hasEOL) parts.push('\n');
          if (y != null) lastY = y;
        }
        const text = normalizePageText(parts.join(''));
        pages.push({
          index: pages.length + 1,
          text,
        });
        return text;
      });
    },
  });

  if (pages.length === 0) {
    // fallback: texto completo (sem pagerender efetivo)
    const full = normalizePageText(result.text || '');
    const chunks = full.split('\f').map(s => normalizePageText(s)).filter(Boolean);
    if (chunks.length) {
      chunks.forEach((text, i) => pages.push({ index: i + 1, text }));
    } else if (full) {
      pages.push({ index: 1, text: full });
    }
  }

  if (pages.length === 0) {
    throw new Error('O PDF não contém texto extraível.');
  }

  return {
    ok: true,
    pageCount: pages.length,
    pages,
  };
}

const pdfArg = process.argv[2];
if (!pdfArg) {
  console.error(JSON.stringify({ ok: false, error: 'Uso: node extract.mjs <arquivo.pdf>' }));
  process.exit(1);
}

try {
  const result = await extract(pdfArg);
  process.stdout.write(JSON.stringify(result));
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: e && e.message ? e.message : String(e) }));
  process.exit(1);
}
