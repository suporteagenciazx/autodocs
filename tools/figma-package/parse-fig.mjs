#!/usr/bin/env node
/**
 * Lê ficheiro .fig (ZIP Figma ou canvas.fig) e devolve páginas para o AutoDocs.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import UZIP from 'uzip';

// fig-to-json CJS overwrites module.exports with uzip; load ESM bundler instead.
const require = createRequire(import.meta.url);
const { getFigJsonData } = await import(
  pathToFileURL(require.resolve('fig-to-json/dist/FigToJSON.esm-bundler.js')).href
);

const FIG_TYPE_MAP = {
  0: 'NONE', 1: 'DOCUMENT', 2: 'CANVAS', 3: 'GROUP', 4: 'FRAME', 5: 'BOOLEAN_OPERATION',
  6: 'VECTOR', 7: 'STAR', 8: 'LINE', 9: 'ELLIPSE', 10: 'RECTANGLE', 11: 'REGULAR_POLYGON',
  12: 'ROUNDED_RECTANGLE', 13: 'TEXT', 14: 'SLICE', 15: 'SYMBOL', 16: 'INSTANCE',
  17: 'COMPONENT', 18: 'COMPONENT_SET', 19: 'SECTION',
};

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

  if (!root) {
    root = byGuid.values().next().value || null;
  }
  return root;
}

function toApiNode(node, fallbackId = '') {
  if (!node || typeof node !== 'object') return null;
  const guid = String(node.guid || node.id || fallbackId || '');
  const out = {
    id: guid,
    type: typeName(node),
    name: String(node.name || ''),
  };
  const box = boxFromNode(node);
  if (box) out.absoluteBoundingBox = box;
  if (typeof node.characters === 'string') out.characters = node.characters;
  if (Array.isArray(node.children) && node.children.length) {
    out.children = node.children
      .map((c, i) => toApiNode(c, `${guid}-${i}`))
      .filter(Boolean);
  }
  return out;
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

function discoverPages(rootRaw) {
  const root = toApiNode(rootRaw, 'root');
  if (!root) return { title: 'Modelo Figma', pages: [] };

  const title = root.name || 'Modelo Figma';
  const candidates = [];
  const children = Array.isArray(root.children) ? root.children : [];

  for (const child of children) {
    if (looksLikePage(child)) {
      const box = child.absoluteBoundingBox || { width: 0, height: 0 };
      const name = String(child.name || 'Página').trim();
      candidates.push({
        id: child.id,
        name,
        node: child,
        isCapa: /^capa/iu.test(name),
        width: box.width,
        height: box.height,
      });
    }
  }

  if (!candidates.length && looksLikePage(root)) {
    const box = root.absoluteBoundingBox || { width: 0, height: 0 };
    candidates.push({
      id: root.id,
      name: root.name || 'Página 1',
      node: root,
      isCapa: /^capa/iu.test(root.name || ''),
      width: box.width,
      height: box.height,
    });
  }

  if (!candidates.length && ['CANVAS', 'SECTION', 'DOCUMENT'].includes(root.type)) {
    for (const child of children) {
      if (!['FRAME', 'COMPONENT', 'INSTANCE'].includes(child.type)) continue;
      const box = child.absoluteBoundingBox || { width: 0, height: 0 };
      const name = String(child.name || 'Página').trim();
      candidates.push({
        id: child.id,
        name,
        node: child,
        isCapa: /^capa/iu.test(name),
        width: box.width,
        height: box.height,
      });
    }
  }

  if (!candidates.length) {
    const box = root.absoluteBoundingBox || { width: 0, height: 0 };
    candidates.push({
      id: root.id,
      name: root.name || 'Página 1',
      node: root,
      isCapa: false,
      width: box.width,
      height: box.height,
    });
  }

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

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    process.stdout.write(JSON.stringify({ ok: false, error: 'Caminho do .fig em falta.' }));
    process.exit(1);
  }
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    process.stdout.write(JSON.stringify({ ok: false, error: 'Ficheiro não encontrado: ' + abs }));
    process.exit(1);
  }
  try {
    const canvasBuf = readCanvasBuffer(abs);
    const decoded = getFigJsonData(canvasBuf);
    const tree = buildTreeFromNodeChanges(decoded);
    const { title, pages } = discoverPages(tree);
    process.stdout.write(
      JSON.stringify({
        ok: true,
        title,
        pages: pages.map(p => ({
          id: p.id,
          name: p.name,
          isCapa: p.isCapa,
          width: p.width,
          height: p.height,
          node: p.node,
        })),
      })
    );
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    process.stdout.write(JSON.stringify({ ok: false, error: 'Falha ao ler .fig: ' + msg }));
    process.exit(1);
  }
}

main();
