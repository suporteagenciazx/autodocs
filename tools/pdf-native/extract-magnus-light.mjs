#!/usr/bin/env node
/**
 * Extrator leve: .fig → textos + {placeholders} (sem dump da árvore completa).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;
const FIGMA_PKG = path.join(__dirname, '..', 'figma-package');
const requireFig = createRequire(path.join(FIGMA_PKG, 'package.json'));
const requireLocal = createRequire(import.meta.url);

const UZIP = requireFig('uzip');
const { getFigJsonData } = await import(
  pathToFileURL(requireFig.resolve('fig-to-json/dist/FigToJSON.esm-bundler.js')).href
);

const FIG_PATH =
  process.argv[2] ||
  String.raw`c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.fig`;
const PDF_PATH =
  process.argv[3] ||
  String.raw`c:\Users\EMPRESARIAL\Desktop\MAGNUS VALUATION\Laudo de avaliação econômica MAGNUS.pdf`;

const FIG_TYPE_MAP = {
  0: 'NONE', 1: 'DOCUMENT', 2: 'CANVAS', 3: 'GROUP', 4: 'FRAME', 5: 'BOOLEAN_OPERATION',
  6: 'VECTOR', 7: 'STAR', 8: 'LINE', 9: 'ELLIPSE', 10: 'RECTANGLE', 11: 'REGULAR_POLYGON',
  12: 'ROUNDED_RECTANGLE', 13: 'TEXT', 14: 'SLICE', 15: 'SYMBOL', 16: 'INSTANCE',
  17: 'COMPONENT', 18: 'COMPONENT_SET', 19: 'SECTION',
};

const PLACEHOLDER_RE = /\{([^{}\n]{1,120})\}/g;

function readCanvasBuffer(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const files = UZIP.parse(buf);
    if (files['canvas.fig']) return Buffer.from(files['canvas.fig']);
    for (const name of Object.keys(files)) {
      if (name.endsWith('.fig') && name !== 'thumbnail.png') {
        return Buffer.from(files[name]);
      }
    }
    throw new Error('ZIP sem canvas.fig.');
  }
  return buf;
}

function typeName(node) {
  const t = node?.type;
  if (typeof t === 'string' && t) return t.toUpperCase();
  if (typeof t === 'number' && FIG_TYPE_MAP[t]) return FIG_TYPE_MAP[t];
  return 'UNKNOWN';
}

function boxFromNode(node) {
  const b = node?.absoluteBoundingBox || node?.size || node?.sizeBoundingBox || null;
  if (!b || typeof b !== 'object') return null;
  const x = Number(b.x ?? 0);
  const y = Number(b.y ?? 0);
  const w = Number(b.width ?? b.w ?? 0);
  const h = Number(b.height ?? b.h ?? 0);
  if (w <= 0 && h <= 0) return null;
  return { x, y, width: w, height: h };
}

function buildTreeFromNodeChanges(message) {
  const changes = message?.nodeChanges || message?.nodes || [];
  if (!Array.isArray(changes) || !changes.length) {
    return message?.document || message || null;
  }

  const byGuid = new Map();
  for (const ch of changes) {
    const guid = ch.guid || ch.id;
    if (!guid) continue;
    byGuid.set(String(guid), { ...ch, guid: String(guid), children: [] });
  }

  let root = null;
  for (const ch of changes) {
    const guid = String(ch.guid || ch.id || '');
    const node = byGuid.get(guid);
    if (!node) continue;
    const parentGuid = ch.parentIndex?.guid;
    if (parentGuid && byGuid.has(String(parentGuid))) {
      byGuid.get(String(parentGuid)).children.push(node);
    } else if (!root) {
      root = node;
    }
  }
  if (!root) root = byGuid.values().next().value || null;
  return root;
}

function looksLikePage(node) {
  const t = typeName(node);
  if (!['FRAME', 'COMPONENT', 'INSTANCE'].includes(t)) return false;
  const name = String(node.name || '').trim();
  if (/^(?:pagina|página|page|folha|capa)(\/|\s|$)/iu.test(name)) return true;
  const box = boxFromNode(node);
  if (!box) return false;
  return box.width >= 500 && box.height >= 700 && box.height > box.width * 1.15;
}

function pageSortKey(name) {
  if (/^capa/iu.test(name)) return [0, 0, name.toLowerCase()];
  const m = name.match(/(?:pagina|página|page|folha)\s*\/?\s*(\d+)/iu);
  if (m) return [1, parseInt(m[1], 10), name.toLowerCase()];
  const num = name.match(/^(\d+)[\s._-]/);
  if (num) return [1, parseInt(num[1], 10), name.toLowerCase()];
  return [2, 0, name.toLowerCase()];
}

function collectLight(node, outTexts, depth = 0) {
  if (!node || typeof node !== 'object') return;
  const t = typeName(node);
  const box = boxFromNode(node);
  if (typeof node.characters === 'string' && node.characters.length) {
    outTexts.push({
      text: node.characters,
      name: String(node.name || ''),
      type: t,
      x: box?.x ?? null,
      y: box?.y ?? null,
      width: box?.width ?? null,
      height: box?.height ?? null,
    });
  }
  const children = node.children;
  if (Array.isArray(children)) {
    for (const c of children) collectLight(c, outTexts, depth + 1);
  }
}

function discoverPageNodes(root) {
  if (!root) return { title: 'Modelo Figma', pages: [] };
  const title = String(root.name || 'Modelo Figma');
  const children = Array.isArray(root.children) ? root.children : [];
  const candidates = [];

  const push = (node) => {
    const box = boxFromNode(node) || { width: 0, height: 0 };
    const name = String(node.name || 'Página').trim();
    candidates.push({
      name,
      node,
      isCapa: /^capa/iu.test(name),
      width: box.width,
      height: box.height,
    });
  };

  for (const child of children) {
    if (looksLikePage(child)) push(child);
  }

  if (!candidates.length && looksLikePage(root)) push(root);

  if (!candidates.length && ['CANVAS', 'SECTION', 'DOCUMENT'].includes(typeName(root))) {
    for (const child of children) {
      if (['FRAME', 'COMPONENT', 'INSTANCE'].includes(typeName(child))) push(child);
    }
  }

  if (!candidates.length) push(root);

  candidates.sort((a, b) => {
    const ka = pageSortKey(a.name);
    const kb = pageSortKey(b.name);
    for (let i = 0; i < 3; i++) {
      if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
    }
    return 0;
  });

  return { title, pages: candidates };
}

function readingOrder(a, b) {
  const ay = a.y == null ? 1e12 : a.y;
  const by = b.y == null ? 1e12 : b.y;
  if (Math.abs(ay - by) > 4) return ay - by;
  const ax = a.x == null ? 1e12 : a.x;
  const bx = b.x == null ? 1e12 : b.x;
  return ax - bx;
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
    const chunk = String(it.text || '').replace(/\s+/g, ' ').trim();
    if (chunk) buf.push(chunk);
    if (y != null) lastY = y;
  }
  flush();
  return lines.filter(Boolean).join('\n');
}

function isLikelyPlaceholder(inner) {
  const s = String(inner || '').trim();
  if (s.length < 2 || s.length > 80) return false;
  // binary / control noise
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s)) return false;
  // mostly non-printable / high binary
  let bad = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || (c > 126 && c < 160)) bad++;
  }
  if (bad / s.length > 0.15) return false;
  // pure numbers / currency-looking without letters → skip as brace artifact unless labeled
  if (/^[\d\s.,R$%/-]+$/.test(s) && !/[A-Za-zÀ-ú_]/.test(s)) return false;
  // must look like a token / label
  if (!/[A-Za-zÀ-ú_]/.test(s)) return false;
  return true;
}

function extractPlaceholders(texts) {
  const map = new Map();
  for (const t of texts) {
    const s = t.text || '';
    let m;
    PLACEHOLDER_RE.lastIndex = 0;
    while ((m = PLACEHOLDER_RE.exec(s))) {
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

function tryPdf(pdfPath) {
  try {
    let pdfParse;
    try {
      pdfParse = requireLocal('pdf-parse');
    } catch {
      pdfParse = requireLocal(path.join(OUT_DIR, 'node_modules', 'pdf-parse'));
    }
    const buf = fs.readFileSync(pdfPath);
    return pdfParse(buf).then(r => ({
      ok: true,
      pageCount: r.numpages || 0,
      textLength: (r.text || '').length,
      textSample: String(r.text || '').slice(0, 500),
      hasExtractableText: !!(r.text && String(r.text).trim()),
    }));
  } catch (e) {
    return Promise.resolve({ ok: false, error: e.message });
  }
}

function toMarkdown(data) {
  const lines = [];
  lines.push('# Magnus Laudo — Content Outline');
  lines.push('');
  lines.push(`Gerado em: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Title (Figma root):** ${data.source.title}`);
  lines.push(`- **Pages:** ${data.summary.pageCount}`);
  lines.push(`- **Page 1 is cover:** ${data.summary.page1IsCover ? 'yes' : 'no'}`);
  if (data.summary.coverPages?.length) {
    lines.push(
      `- **Cover frames:** ${data.summary.coverPages.map(c => `${c.index} (${c.name})`).join(', ')}`
    );
  }
  lines.push(`- **Text nodes:** ${data.summary.totalTextItems}`);
  lines.push(`- **Unique \`{placeholders}\`:** ${data.summary.uniquePlaceholders}`);
  const pdf = data.summary.pdf;
  if (pdf) {
    if (pdf.hasExtractableText) {
      lines.push(`- **PDF:** ${pdf.pageCount} pages with extractable text (${pdf.textLength} chars)`);
    } else {
      lines.push(
        `- **PDF:** ${pdf.pageCount || '?'} pages — **no extractable text** (image-based / scan). Figma is source of truth.`
      );
    }
  }
  lines.push('');
  lines.push('## Unique placeholders');
  lines.push('');
  if (!data.placeholders.unique.length) {
    lines.push('_None found matching printable `{TOKEN}` pattern._');
  } else {
    for (const p of data.placeholders.withCounts) {
      lines.push(`- \`${p.placeholder}\` (×${p.count})`);
    }
  }
  lines.push('');
  lines.push('## Suggested form field groups');
  lines.push('');
  const groups = data.placeholders.formFieldGroups || {};
  if (!Object.keys(groups).length) {
    lines.push('_No placeholders to group — infer fields from page text below._');
    lines.push('');
  } else {
    for (const [group, list] of Object.entries(groups)) {
      lines.push(`### ${group}`);
      lines.push('');
      for (const p of list) lines.push(`- \`${p}\``);
      lines.push('');
    }
  }
  lines.push('## Pages (reading order)');
  lines.push('');
  for (const page of data.pages) {
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
  lines.push('1. Mirror Contrato Sofisa: capa + A4 pages with editable spans bound via `inputs.js`.');
  lines.push('2. Prefer Figma text layers — PDF appears rasterized.');
  lines.push('3. Map each `{PLACEHOLDER}` to form inputs (`inputId` / `targetId` / `originalText`).');
  lines.push('4. Use capa/mda assets only as visual reference; native template should be HTML/CSS text.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  console.error('Reading .fig…', FIG_PATH);
  if (!fs.existsSync(FIG_PATH)) throw new Error('FIG not found: ' + FIG_PATH);

  const t0 = Date.now();
  const canvasBuf = readCanvasBuffer(FIG_PATH);
  console.error(`canvas.fig bytes: ${canvasBuf.length} (${Date.now() - t0}ms)`);

  const t1 = Date.now();
  const decoded = getFigJsonData(canvasBuf);
  console.error(`decoded fig-to-json (${Date.now() - t1}ms)`);
  console.error('keys', Object.keys(decoded || {}).slice(0, 20));
  const changeCount = (decoded?.nodeChanges || decoded?.nodes || []).length;
  console.error('nodeChanges', changeCount);

  const t2 = Date.now();
  const tree = buildTreeFromNodeChanges(decoded);
  console.error(`tree built (${Date.now() - t2}ms)`);

  const { title, pages: pageNodes } = discoverPageNodes(tree);
  console.error(`pages discovered: ${pageNodes.length} — ${pageNodes.map(p => p.name).join(' | ')}`);

  const pages = pageNodes.map((p, i) => {
    const items = [];
    collectLight(p.node, items);
    items.sort(readingOrder);
    const text = joinPageText(items);
    const ph = extractPlaceholders(items);
    // free heavy node reference
    p.node = null;
    return {
      index: i + 1,
      name: p.name,
      isCapa: !!p.isCapa,
      width: p.width,
      height: p.height,
      textItemCount: items.length,
      text,
      placeholders: ph.map(x => x.placeholder),
      textItems: items,
    };
  });

  const allItems = pages.flatMap(p => p.textItems);
  const ph = extractPlaceholders(allItems);

  let pdfInfo = { ok: false };
  if (fs.existsSync(PDF_PATH)) {
    console.error('Parsing PDF…');
    pdfInfo = await tryPdf(PDF_PATH);
    console.error('PDF:', JSON.stringify(pdfInfo));
  }

  const data = {
    ok: true,
    source: { fig: FIG_PATH, pdf: PDF_PATH, title },
    summary: {
      pageCount: pages.length,
      page1IsCover: pages[0] ? !!pages[0].isCapa : false,
      coverPages: pages.filter(p => p.isCapa).map(p => ({ index: p.index, name: p.name })),
      totalTextItems: allItems.length,
      uniquePlaceholders: ph.length,
      pdf: pdfInfo,
    },
    placeholders: {
      unique: ph.map(x => x.placeholder),
      withCounts: ph,
      formFieldGroups: suggestGroups(ph),
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
    textItemsByPage: pages.map(p => ({
      index: p.index,
      name: p.name,
      items: p.textItems,
    })),
  };

  const mdPath = path.join(OUT_DIR, 'magnus-content-outline.md');
  const jsonPath = path.join(OUT_DIR, 'magnus-texts.json');
  fs.writeFileSync(mdPath, toMarkdown(data), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(OUT_DIR, 'magnus-fig.json'),
    JSON.stringify(
      {
        ok: true,
        title,
        pageCount: pages.length,
        pages: pages.map(p => ({
          index: p.index,
          name: p.name,
          isCapa: p.isCapa,
          width: p.width,
          height: p.height,
          textItemCount: p.textItemCount,
        })),
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
        pages: pages.length,
        textItems: allItems.length,
        placeholders: ph.length,
        md: mdPath,
        json: jsonPath,
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
