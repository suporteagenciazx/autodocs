#!/usr/bin/env node
/**
 * Extrai textos + placeholders {..} do .fig Magnus e gera outline/JSON.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const FIG_PATH =
  process.argv[2] ||
  String.raw`c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.fig`;
const PDF_PATH =
  process.argv[3] ||
  String.raw`c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.pdf`;
const OUT_DIR = path.join(ROOT, 'tools', 'pdf-native');
const PARSE_FIG = path.join(ROOT, 'tools', 'figma-package', 'parse-fig.mjs');

const PLACEHOLDER_RE = /\{([^{}\n]{1,120})\}/g;
const PLACEHOLDER_STRICT_RE = /\{([A-Za-zÀ-ú0-9_][A-Za-zÀ-ú0-9_\s./-]{0,100})\}/g;

function collectTexts(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (typeof node.characters === 'string' && node.characters.length) {
    const box = node.absoluteBoundingBox || null;
    acc.push({
      id: node.id || '',
      name: node.name || '',
      text: node.characters,
      x: box ? box.x : null,
      y: box ? box.y : null,
      width: box ? box.width : null,
      height: box ? box.height : null,
    });
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) collectTexts(child, acc);
  }
  return acc;
}

function readingOrder(a, b) {
  const ay = a.y == null ? 1e12 : a.y;
  const by = b.y == null ? 1e12 : b.y;
  if (Math.abs(ay - by) > 4) return ay - by;
  const ax = a.x == null ? 1e12 : a.x;
  const bx = b.x == null ? 1e12 : b.x;
  return ax - bx;
}

function extractPlaceholders(texts) {
  const all = new Map();
  const strict = new Map();
  for (const t of texts) {
    const s = t.text || '';
    let m;
    PLACEHOLDER_RE.lastIndex = 0;
    while ((m = PLACEHOLDER_RE.exec(s))) {
      const raw = `{${m[1]}}`;
      all.set(raw, (all.get(raw) || 0) + 1);
    }
    PLACEHOLDER_STRICT_RE.lastIndex = 0;
    while ((m = PLACEHOLDER_STRICT_RE.exec(s))) {
      const inner = m[1].trim();
      // skip pure numbers / noise
      if (/^\d+([.,]\d+)?$/.test(inner)) continue;
      if (inner.length < 2) continue;
      const raw = `{${inner}}`;
      strict.set(raw, (strict.get(raw) || 0) + 1);
    }
  }
  return {
    all: [...all.entries()].map(([placeholder, count]) => ({ placeholder, count })),
    likely: [...strict.entries()]
      .map(([placeholder, count]) => ({ placeholder, count }))
      .sort((a, b) => a.placeholder.localeCompare(b.placeholder, 'pt')),
  };
}

function joinPageText(items) {
  if (!items.length) return '';
  const sorted = [...items].sort(readingOrder);
  const lines = [];
  let lastY = null;
  let buf = [];
  const flush = () => {
    if (buf.length) {
      lines.push(buf.join(' ').replace(/[ \t]+/g, ' ').trim());
      buf = [];
    }
  };
  for (const it of sorted) {
    const y = it.y == null ? null : it.y;
    if (lastY != null && y != null && Math.abs(y - lastY) > 8) flush();
    buf.push(String(it.text || '').replace(/\s+/g, ' ').trim());
    if (y != null) lastY = y;
  }
  flush();
  return lines.filter(Boolean).join('\n');
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
    const inner = placeholder.slice(1, -1);
    if (/cliente|contratante|solicitante|requerente|interessad/.test(p)) groups.cliente.push(placeholder);
    else if (/empresa|avaliad|sociedade|cnpj|razao|razão|nome.?fantasia|segmento|atividade/.test(p))
      groups.empresa_avaliada.push(placeholder);
    else if (/data|dia|mes|mês|ano|periodo|período|vigencia|vigência|emiss/.test(p))
      groups.datas.push(placeholder);
    else if (/valor|preco|preço|r\$|reais|equity|enterprise|ev\b|patrimon|percent|\%|multipl|taxa|desconto|wacc|fluxo|receita|ebitda|lucro/.test(p))
      groups.valores.push(placeholder);
    else if (/endere|rua|av\.|cidade|uf\b|cep|bairro|logradouro/.test(p))
      groups.endereco.push(placeholder);
    else if (/engenheir|avaliador|respons|crea|crc|assinatura|perit/.test(p))
      groups.responsavel_tecnico.push(placeholder);
    else if (/laudo|numero|número|processo|protocolo|versao|versão|titulo|título|objeto|finalidade|escopo/.test(p))
      groups.documento.push(placeholder);
    else groups.outros.push(placeholder);
  }
  // drop empty
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length));
}

function runParseFig(figPath) {
  const r = spawnSync(process.execPath, [PARSE_FIG, figPath], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    cwd: path.dirname(PARSE_FIG),
  });
  if (r.status !== 0 && !r.stdout) {
    throw new Error(r.stderr || `parse-fig exit ${r.status}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch (e) {
    fs.writeFileSync(path.join(OUT_DIR, 'magnus-fig-raw-stdout.txt'), r.stdout || '', 'utf8');
    throw new Error('JSON parse failed: ' + e.message);
  }
  if (!parsed.ok) throw new Error(parsed.error || 'parse-fig failed');
  return parsed;
}

function tryPdfExtract(pdfPath) {
  const extract = path.join(OUT_DIR, 'extract.mjs');
  if (!fs.existsSync(pdfPath) || !fs.existsSync(extract)) {
    return { ok: false, error: 'PDF ou extract.mjs ausente' };
  }
  const r = spawnSync(process.execPath, [extract, pdfPath], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    cwd: OUT_DIR,
  });
  try {
    return JSON.parse(r.stdout || r.stderr || '{}');
  } catch {
    return { ok: false, error: (r.stderr || r.stdout || '').slice(0, 500) };
  }
}

function buildOutline(parsed, pdf) {
  const pages = (parsed.pages || []).map((p, i) => {
    const texts = collectTexts(p.node).sort(readingOrder);
    const pageText = joinPageText(texts);
    const ph = extractPlaceholders(texts);
    return {
      index: i + 1,
      id: p.id,
      name: p.name,
      isCapa: !!p.isCapa || /^capa/iu.test(p.name || ''),
      width: p.width,
      height: p.height,
      textItemCount: texts.length,
      text: pageText,
      textItems: texts.map(t => ({
        text: t.text,
        x: t.x,
        y: t.y,
        name: t.name,
      })),
      placeholders: ph.likely.map(x => x.placeholder),
      placeholdersRaw: ph.all.map(x => x.placeholder),
    };
  });

  const allTexts = pages.flatMap(p => p.textItems.map(t => ({ text: t.text })));
  const ph = extractPlaceholders(allTexts);
  const uniqueLikely = ph.likely.map(x => x.placeholder);

  return {
    source: {
      fig: FIG_PATH,
      pdf: PDF_PATH,
      title: parsed.title || 'Magnus',
    },
    summary: {
      pageCount: pages.length,
      page1IsCover: pages[0] ? !!pages[0].isCapa : false,
      coverPages: pages.filter(p => p.isCapa).map(p => ({ index: p.index, name: p.name })),
      totalTextItems: pages.reduce((n, p) => n + p.textItemCount, 0),
      uniquePlaceholders: uniqueLikely.length,
      pdf: pdf && pdf.ok
        ? { pageCount: pdf.pageCount, hasExtractableText: (pdf.pages || []).some(p => p.text) }
        : { ok: false, note: pdf?.error || 'PDF sem texto extraível (provável scan/imagem)' },
    },
    placeholders: {
      unique: uniqueLikely,
      withCounts: ph.likely,
      formFieldGroups: suggestGroups(ph.likely),
    },
    pages: pages.map(p => ({
      index: p.index,
      name: p.name,
      isCapa: p.isCapa,
      width: p.width,
      height: p.height,
      textItemCount: p.textItemCount,
      text: p.text,
      placeholders: p.placeholders,
    })),
    pdfPages: pdf?.ok ? pdf.pages : null,
  };
}

function toMarkdown(outline) {
  const lines = [];
  lines.push('# Magnus Laudo — Content Outline');
  lines.push('');
  lines.push(`Gerado em: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Title (Figma root):** ${outline.source.title}`);
  lines.push(`- **Pages:** ${outline.summary.pageCount}`);
  lines.push(`- **Page 1 is cover:** ${outline.summary.page1IsCover ? 'yes' : 'no'}`);
  if (outline.summary.coverPages?.length) {
    lines.push(
      `- **Cover frames:** ${outline.summary.coverPages.map(c => `${c.index} (${c.name})`).join(', ')}`
    );
  }
  lines.push(`- **Text nodes:** ${outline.summary.totalTextItems}`);
  lines.push(`- **Unique \`{placeholders}\`:** ${outline.summary.uniquePlaceholders}`);
  const pdf = outline.summary.pdf;
  if (pdf?.hasExtractableText === false || pdf?.ok === false) {
    lines.push(
      `- **PDF:** ${outline.summary.pageCount ? `image-based / no extractable text` : 'n/a'} (pdf-parse returned empty page texts; treat Figma as source of truth)`
    );
  } else if (pdf?.pageCount) {
    lines.push(`- **PDF pages:** ${pdf.pageCount}`);
  }
  lines.push('');
  lines.push('## Unique placeholders');
  lines.push('');
  if (!outline.placeholders.unique.length) {
    lines.push('_None found matching `{TOKEN}` pattern._');
  } else {
    for (const p of outline.placeholders.unique) {
      const count = outline.placeholders.withCounts.find(x => x.placeholder === p)?.count || 1;
      lines.push(`- \`${p}\` (×${count})`);
    }
  }
  lines.push('');
  lines.push('## Suggested form field groups');
  lines.push('');
  const groups = outline.placeholders.formFieldGroups || {};
  for (const [group, list] of Object.entries(groups)) {
    lines.push(`### ${group}`);
    lines.push('');
    for (const p of list) lines.push(`- \`${p}\``);
    lines.push('');
  }
  if (!Object.keys(groups).length) {
    lines.push('_No placeholders to group — infer fields from page text in a later pass._');
    lines.push('');
  }
  lines.push('## Pages (reading order)');
  lines.push('');
  for (const page of outline.pages) {
    lines.push(`### Página ${page.index} — ${page.name}${page.isCapa ? ' (CAPA)' : ''}`);
    lines.push('');
    lines.push(`- Size: ${Math.round(page.width || 0)}×${Math.round(page.height || 0)}`);
    lines.push(`- Text items: ${page.textItemCount}`);
    if (page.placeholders?.length) {
      lines.push(`- Placeholders: ${page.placeholders.map(p => `\`${p}\``).join(', ')}`);
    }
    lines.push('');
    if (page.text) {
      lines.push('```');
      lines.push(page.text);
      lines.push('```');
    } else {
      lines.push('_No text nodes on this page._');
    }
    lines.push('');
  }
  lines.push('## Notes for AutoDocs HTML template');
  lines.push('');
  lines.push('1. Mirror Contrato Sofisa structure: capa + páginas A4 with editable spans bound to form inputs.');
  lines.push('2. Prefer Figma text layers over PDF (PDF appears rasterized).');
  lines.push('3. Map each `{PLACEHOLDER}` to `inputs.js` configuration entries (`inputId` / `targetId` / `originalText`).');
  lines.push('4. Keep visual assets (capa/mda) only as reference; native template should use HTML/CSS text.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(FIG_PATH)) {
    console.error('FIG not found:', FIG_PATH);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.error('Parsing .fig…');
  const parsed = runParseFig(FIG_PATH);
  fs.writeFileSync(
    path.join(OUT_DIR, 'magnus-fig.json'),
    JSON.stringify(
      {
        ok: true,
        title: parsed.title,
        pageCount: parsed.pages?.length || 0,
        pages: (parsed.pages || []).map(p => ({
          id: p.id,
          name: p.name,
          isCapa: p.isCapa,
          width: p.width,
          height: p.height,
        })),
      },
      null,
      2
    ),
    'utf8'
  );

  console.error('Extracting PDF…');
  const pdf = tryPdfExtract(PDF_PATH);

  const outline = buildOutline(parsed, pdf);

  const textsJson = {
    ok: true,
    source: outline.source,
    summary: outline.summary,
    placeholders: outline.placeholders,
    pages: outline.pages,
    // full per-item dump for tooling
    textItemsByPage: (parsed.pages || []).map((p, i) => ({
      index: i + 1,
      name: p.name,
      items: collectTexts(p.node).sort(readingOrder),
    })),
  };

  const mdPath = path.join(OUT_DIR, 'magnus-content-outline.md');
  const jsonPath = path.join(OUT_DIR, 'magnus-texts.json');
  fs.writeFileSync(mdPath, toMarkdown(outline), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(textsJson, null, 2), 'utf8');

  console.error(
    JSON.stringify(
      {
        ok: true,
        pages: outline.summary.pageCount,
        placeholders: outline.summary.uniquePlaceholders,
        md: mdPath,
        json: jsonPath,
      },
      null,
      2
    )
  );
}

main();
