#!/usr/bin/env node
/**
 * Extração por strings do .fig (ZIP) + canvas.fig, sem fig-to-json.
 * Mais robusto para ficheiros grandes / formato moderno.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;
const FIGMA_PKG = path.join(__dirname, '..', 'figma-package');
const requireFig = createRequire(path.join(FIGMA_PKG, 'package.json'));
const requireLocal = createRequire(import.meta.url);
const UZIP = requireFig('uzip');

const FIG_PATH =
  process.argv[2] ||
  String.raw`c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.fig`;
const PDF_PATH =
  process.argv[3] ||
  String.raw`c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.pdf`;

function isMostlyPrintable(s) {
  if (!s || s.length < 2) return false;
  let bad = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 9 || (c > 13 && c < 32) || c === 0x7f) bad++;
  }
  return bad / s.length < 0.08;
}

function extractUtf8Strings(buf, minLen = 4) {
  const out = [];
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let i = 0;
  while (i < u8.length) {
    // ASCII run
    if (u8[i] >= 0x20 && u8[i] <= 0x7e) {
      let j = i;
      while (j < u8.length && u8[j] >= 0x20 && u8[j] <= 0x7e) j++;
      if (j - i >= minLen) {
        out.push(Buffer.from(u8.subarray(i, j)).toString('latin1'));
      }
      i = j;
      continue;
    }
    // UTF-8 multi-byte start
    if (u8[i] >= 0xc2) {
      let j = i;
      const start = i;
      let ok = true;
      while (j < u8.length) {
        const b = u8[j];
        if (b >= 0x20 && b <= 0x7e) {
          j++;
          continue;
        }
        if (b >= 0xc2 && b <= 0xdf && j + 1 < u8.length && (u8[j + 1] & 0xc0) === 0x80) {
          j += 2;
          continue;
        }
        if (b >= 0xe0 && b <= 0xef && j + 2 < u8.length && (u8[j + 1] & 0xc0) === 0x80 && (u8[j + 2] & 0xc0) === 0x80) {
          j += 3;
          continue;
        }
        if (b === 0x0a || b === 0x0d || b === 0x09) {
          j++;
          continue;
        }
        break;
      }
      if (j - start >= minLen) {
        try {
          const s = Buffer.from(u8.subarray(start, j)).toString('utf8');
          if (isMostlyPrintable(s) && !s.includes('\uFFFD')) out.push(s);
        } catch {
          /* ignore */
        }
      }
      i = Math.max(j, i + 1);
      continue;
    }
    i++;
  }
  return out;
}

function kiwiNullTerminatedStrings(buf, minLen = 3) {
  // Figma kiwi encodes strings as UTF-8 + 0x00 terminator (among other encodings)
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const out = [];
  let i = 0;
  while (i < u8.length) {
    if (u8[i] >= 0x20 && u8[i] < 0xf5) {
      let j = i;
      let bytes = [];
      while (j < u8.length && u8[j] !== 0) {
        const b = u8[j];
        if (b < 0x09 || (b > 0x0d && b < 0x20) || b === 0x7f) break;
        bytes.push(b);
        j++;
        if (bytes.length > 2000) break;
      }
      if (u8[j] === 0 && bytes.length >= minLen) {
        try {
          const s = Buffer.from(bytes).toString('utf8');
          if (isMostlyPrintable(s) && !s.includes('\uFFFD')) out.push(s);
        } catch {
          /* ignore */
        }
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  return out;
}

function uniqKeepOrder(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const t = String(s).replace(/\u0000/g, '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function isLikelyPlaceholder(inner) {
  const s = String(inner || '').trim();
  if (s.length < 2 || s.length > 80) return false;
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s)) return false;
  let bad = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || (c > 126 && c < 160)) bad++;
  }
  if (bad / s.length > 0.1) return false;
  if (!/[A-Za-zÀ-ú_]/.test(s)) return false;
  if (/^[\d\s.,R$%/-]+$/.test(s)) return false;
  // reject path-like / css / code noise
  if (/https?:|www\.|node_modules|function\s*\(|=>/.test(s)) return false;
  return true;
}

function findPlaceholders(strings) {
  const map = new Map();
  const re = /\{([^{}\n]{1,80})\}/g;
  for (const s of strings) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      const inner = m[1].trim();
      if (!isLikelyPlaceholder(inner)) continue;
      const raw = `{${inner}}`;
      map.set(raw, (map.get(raw) || 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([placeholder, count]) => ({ placeholder, count }))
    .sort((a, b) => a.placeholder.localeCompare(b.placeholder, 'pt'));
}

function looksLikeDocumentText(s) {
  if (s.length < 8) return false;
  // Portuguese / document keywords
  if (/[àáâãéêíóôõúç]/i.test(s)) return true;
  if (/\b(laudo|avaliação|avaliacao|valuation|magnus|empresa|cliente|data|valor|equity|patrimônio|patrimonio|receita|fluxo|metodologia|conclusão|conclusao|introdução|introducao|página|pagina|capa|CNPJ|CPF|R\$)\b/i.test(s))
    return true;
  if (/\{[A-Za-zÀ-ú_]/.test(s)) return true;
  // multi-word sentence-like
  if (s.length >= 20 && /[A-Za-zÀ-ú]{3,}\s+[A-Za-zÀ-ú]{3,}/.test(s) && !/^[A-Z0-9_./-]+$/.test(s))
    return true;
  return false;
}

function looksLikePageName(s) {
  return /^(capa|página|pagina|page|folha)(\s|\/|$)/i.test(s.trim());
}

function suggestGroups(placeholders) {
  const groups = {
    cliente: [],
    empresa_avaliada: [],
    datas: [],
    valores: [],
    endereco: [],
    responsavel_tecnico: [],
    documento: [],
    outros: [],
  };
  for (const { placeholder } of placeholders) {
    const p = placeholder.toLowerCase();
    if (/cliente|contratante|solicitante|requerente|interessad/.test(p)) groups.cliente.push(placeholder);
    else if (/empresa|avaliad|sociedade|cnpj|razao|razão|nome.?fantasia|segmento|atividade|alvo|target/.test(p))
      groups.empresa_avaliada.push(placeholder);
    else if (/data|dia|mes|mês|ano|periodo|período|vigencia|vigência|emiss/.test(p))
      groups.datas.push(placeholder);
    else if (/valor|preco|preço|reais|equity|enterprise|\bev\b|patrimon|percent|multipl|taxa|desconto|wacc|fluxo|receita|ebitda|lucro|montante|capital/.test(p))
      groups.valores.push(placeholder);
    else if (/endere|rua|av\.|cidade|uf\b|cep|bairro|logradouro/.test(p))
      groups.endereco.push(placeholder);
    else if (/engenheir|avaliador|respons|crea|crc|assinatura|perit|economista/.test(p))
      groups.responsavel_tecnico.push(placeholder);
    else if (/laudo|numero|número|processo|protocolo|versao|versão|titulo|título|objeto|finalidade|escopo/.test(p))
      groups.documento.push(placeholder);
    else groups.outros.push(placeholder);
  }
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length));
}

function tryClusterByPageHints(docStrings, pageNames) {
  // Without geometry, emit a single "all text" block + page name list.
  // If page names found, attempt crude split by nearest preceding page title occurrence.
  if (!pageNames.length) {
    return [
      {
        index: 1,
        name: 'Documento (texto agregado)',
        isCapa: false,
        text: docStrings.join('\n'),
        textItemCount: docStrings.length,
        placeholders: findPlaceholders(docStrings).map(x => x.placeholder),
      },
    ];
  }

  const pages = pageNames.map((name, i) => ({
    index: i + 1,
    name,
    isCapa: /^capa/i.test(name),
    texts: [],
  }));

  let current = 0;
  for (const s of docStrings) {
    const idx = pageNames.findIndex(n => n === s || s.startsWith(n));
    if (idx >= 0) current = idx;
    // skip pure page-name-only entries as body
    if (looksLikePageName(s) && s.length < 40) continue;
    pages[current].texts.push(s);
  }

  return pages.map(p => ({
    index: p.index,
    name: p.name,
    isCapa: p.isCapa,
    text: uniqKeepOrder(p.texts).join('\n'),
    textItemCount: p.texts.length,
    placeholders: findPlaceholders(p.texts).map(x => x.placeholder),
  }));
}

async function pdfInfo(pdfPath) {
  try {
    const pdfParse = requireLocal('pdf-parse');
    const r = await pdfParse(fs.readFileSync(pdfPath));
    return {
      ok: true,
      pageCount: r.numpages || 0,
      textLength: (r.text || '').length,
      hasExtractableText: !!(r.text && String(r.text).trim()),
      textSample: String(r.text || '').slice(0, 400),
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function tryOcrPdf(pdfPath) {
  // Optional: pdftotext / tesseract if present
  const tools = [];
  for (const cmd of [
    ['pdftotext', ['-layout', pdfPath, '-']],
    ['tesseract', ['--version']],
  ]) {
    const r = spawnSync(cmd[0], cmd[1], { encoding: 'utf8' });
    tools.push({ cmd: cmd[0], ok: r.status === 0, sample: (r.stdout || r.stderr || '').slice(0, 200) });
  }
  return tools;
}

function toMarkdown(data) {
  const L = [];
  L.push('# Magnus Laudo — Content Outline');
  L.push('');
  L.push(`Gerado em: ${new Date().toISOString()}`);
  L.push('');
  L.push('## Summary');
  L.push('');
  L.push(`- **Source:** Figma local \`.fig\` (string/kiwi scan; fig-to-json OOM on this file)`);
  L.push(`- **Title hints:** ${(data.source.titleHints || []).slice(0, 5).join(' · ') || '(n/a)'}`);
  L.push(`- **Pages (named frames):** ${data.summary.pageCount}`);
  L.push(`- **Page 1 is cover:** ${data.summary.page1IsCover ? 'yes' : 'no / unknown'}`);
  L.push(`- **Document text strings:** ${data.summary.docStringCount}`);
  L.push(`- **Unique \`{placeholders}\`:** ${data.summary.uniquePlaceholders}`);
  if (data.summary.pdf) {
    const p = data.summary.pdf;
    if (p.hasExtractableText) L.push(`- **PDF:** ${p.pageCount} pages, extractable text`);
    else L.push(`- **PDF:** ${p.pageCount || '?'} pages — **image-based** (no extractable text)`);
  }
  L.push('');
  L.push('## Unique placeholders');
  L.push('');
  if (!data.placeholders.unique.length) L.push('_None found._');
  else for (const p of data.placeholders.withCounts) L.push(`- \`${p.placeholder}\` (×${p.count})`);
  L.push('');
  L.push('## Suggested form field groups');
  L.push('');
  const groups = data.placeholders.formFieldGroups || {};
  if (!Object.keys(groups).length) L.push('_Infer from page text; no brace tokens detected._\n');
  else {
    for (const [g, list] of Object.entries(groups)) {
      L.push(`### ${g}`);
      L.push('');
      for (const p of list) L.push(`- \`${p}\``);
      L.push('');
    }
  }
  L.push('## Page names (from Figma frames)');
  L.push('');
  for (const n of data.summary.pageNames || []) L.push(`- ${n}`);
  L.push('');
  L.push('## Pages / text (best-effort reading order)');
  L.push('');
  L.push(
    '> Note: without a full kiwi decode, page assignment is approximate (split by page-name string hits). Full unique document strings are also listed.'
  );
  L.push('');
  for (const page of data.pages) {
    L.push(`### Página ${page.index} — ${page.name}${page.isCapa ? ' (CAPA)' : ''}`);
    L.push('');
    L.push(`- Text items: ${page.textItemCount}`);
    if (page.placeholders?.length) L.push(`- Placeholders: ${page.placeholders.map(p => `\`${p}\``).join(', ')}`);
    L.push('');
    if (page.text) {
      L.push('```');
      L.push(page.text.slice(0, 50000));
      L.push('```');
    } else L.push('_No text._');
    L.push('');
  }
  L.push('## All unique document strings (filtered)');
  L.push('');
  L.push('```');
  L.push((data.allDocumentStrings || []).join('\n').slice(0, 200000));
  L.push('```');
  L.push('');
  L.push('## Notes for AutoDocs HTML template');
  L.push('');
  L.push('1. Mirror Contrato Sofisa: capa + A4 pages + `inputs.js` bindings.');
  L.push('2. PDF is raster — use Figma strings / OCR for copy.');
  L.push('3. Map `{PLACEHOLDER}` tokens to form fields.');
  L.push('4. Existing import stub: `documentos/importados/valuation-magnus/` (4 pages, capa+mda assets).');
  L.push('');
  return L.join('\n');
}

async function main() {
  console.error('Scanning', FIG_PATH);
  const buf = fs.readFileSync(FIG_PATH);
  let files = {};
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    files = UZIP.parse(buf);
  } else {
    files = { 'canvas.fig': buf };
  }
  const names = Object.keys(files);
  console.error('ZIP entries:', names.length, names.slice(0, 30));

  // meta / thumbnail / canvas
  const metaKeys = names.filter(n => /meta|manifest|json|html|txt|svg/i.test(n));
  console.error('meta-like:', metaKeys);

  let canvas =
    files['canvas.fig'] ||
    files[names.find(n => n.endsWith('.fig') && !/thumbnail/i.test(n))] ||
    null;
  if (!canvas) throw new Error('canvas.fig missing');
  const canvasBuf = Buffer.from(canvas);
  console.error('canvas bytes', canvasBuf.length);

  // Also scan other small text-ish zip entries
  const extraStrings = [];
  for (const n of names) {
    const f = files[n];
    if (!f || f.length > 5_000_000) continue;
    if (/\.(json|txt|html|svg|xml)$/i.test(n) || /meta/i.test(n)) {
      try {
        const s = Buffer.from(f).toString('utf8');
        if (s && !s.includes('\u0000')) extraStrings.push(s);
      } catch {
        /* ignore */
      }
    }
  }

  console.error('Extracting strings…');
  const raw = [
    ...kiwiNullTerminatedStrings(canvasBuf, 3),
    ...extractUtf8Strings(canvasBuf, 6),
    ...extraStrings.flatMap(s => s.split(/\r?\n/)),
  ];
  const all = uniqKeepOrder(raw);
  console.error('unique strings', all.length);

  const pageNames = uniqKeepOrder(all.filter(looksLikePageName)).sort((a, b) => {
    if (/^capa/i.test(a)) return -1;
    if (/^capa/i.test(b)) return 1;
    const na = a.match(/(\d+)/);
    const nb = b.match(/(\d+)/);
    return (na ? +na[1] : 99) - (nb ? +nb[1] : 99);
  });

  const docStrings = uniqKeepOrder(all.filter(looksLikeDocumentText));
  const titleHints = uniqKeepOrder(
    all.filter(s => /magnus|laudo|avalia/i.test(s) && s.length < 120)
  ).slice(0, 20);

  const placeholders = findPlaceholders([...docStrings, ...all.filter(s => s.includes('{'))]);
  const pages = tryClusterByPageHints(docStrings, pageNames);

  const pdf = fs.existsSync(PDF_PATH) ? await pdfInfo(PDF_PATH) : { ok: false };
  const ocrTools = tryOcrPdf(PDF_PATH);

  // If PDF page count known and no page names, synthesize page slots
  let finalPages = pages;
  if ((!pageNames.length || pages.length === 1) && pdf.pageCount) {
    finalPages = Array.from({ length: pdf.pageCount }, (_, i) => ({
      index: i + 1,
      name: i === 0 ? 'Capa (inferida do PDF)' : `Página ${i + 1} (inferida do PDF)`,
      isCapa: i === 0,
      text: i === 0 ? docStrings.slice(0, Math.ceil(docStrings.length / pdf.pageCount)).join('\n') : '',
      textItemCount: i === 0 ? docStrings.length : 0,
      placeholders: i === 0 ? placeholders.map(p => p.placeholder) : [],
    }));
    // put all text on a combined note page if we couldn't split
    finalPages = [
      {
        index: 1,
        name: 'Capa',
        isCapa: true,
        text: '(Ver strings agregadas — PDF imagem; split por página indisponível sem kiwi decode)',
        textItemCount: 0,
        placeholders: [],
      },
      {
        index: 2,
        name: 'Texto agregado do Figma (todas as páginas)',
        isCapa: false,
        text: docStrings.join('\n'),
        textItemCount: docStrings.length,
        placeholders: placeholders.map(p => p.placeholder),
      },
    ];
    // Prefer real page names when available
    if (pageNames.length) finalPages = pages;
  }

  const data = {
    ok: true,
    method: 'fig-zip-string-scan',
    source: { fig: FIG_PATH, pdf: PDF_PATH, titleHints, zipEntries: names.slice(0, 100) },
    summary: {
      pageCount: pageNames.length || pdf.pageCount || finalPages.length,
      page1IsCover: /^capa/i.test(pageNames[0] || finalPages[0]?.name || ''),
      pageNames,
      docStringCount: docStrings.length,
      uniquePlaceholders: placeholders.length,
      pdf,
      ocrTools,
    },
    placeholders: {
      unique: placeholders.map(p => p.placeholder),
      withCounts: placeholders,
      formFieldGroups: suggestGroups(placeholders),
    },
    pages: finalPages,
    allDocumentStrings: docStrings,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'magnus-texts.json'), JSON.stringify(data, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'magnus-content-outline.md'), toMarkdown(data), 'utf8');
  fs.writeFileSync(
    path.join(OUT_DIR, 'magnus-fig.json'),
    JSON.stringify(
      {
        ok: true,
        method: data.method,
        pageNames,
        pageCount: data.summary.pageCount,
        placeholders: data.placeholders.unique,
      },
      null,
      2
    ),
    'utf8'
  );

  console.error(
    JSON.stringify(
      {
        ok: true,
        pages: data.summary.pageCount,
        pageNames,
        docStrings: docStrings.length,
        placeholders: placeholders.length,
        placeholderSample: placeholders.slice(0, 30),
      },
      null,
      2
    )
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
