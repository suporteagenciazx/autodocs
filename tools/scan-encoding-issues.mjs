import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipDirs = new Set(['node_modules', '.git', 'sql', 'documentos/importados']);
const exts = new Set(['.html', '.js', '.php', '.css', '.json', '.md']);

const corruptionRe = /(?:Usu\?rios|Documenta\?\?|fun\?\?o|n\?o |p\?gina|Configura\?\?|Cr\?dito|Emiss\?o|Raz\?o|Condi\?\?es|institui\?\?o|CL\?USULA|Ag\?ncia|Banc\?rio|Car\?ncia|Presta\?\?o|Servi\?os|informa\?\?o|opera\?\?o|contrata\?\?o|contribui\?\?es|prote\?\?o|legisla\?\?o|negativa\?\?o|disponibilizar\?|prestar\?|poder\?|ser\?o|ser\? |est\? |ir\? |n\?mero|n\? |c\?digo|v\?rgula|eletr\?nico|per\?odo|m\?s |d\?bito|endere\?o|correspond\?ncia|t\?tulo|d\?bito|inadimpl\?ncia|pr\?vio|d\?vida|al\?m|compara\?\?o|dispon\?veis|informar\?|exerc\?cio|regulat\?ria|regulamenta\?\?o|Resolu\?\?o|concordar\?o|disposi\?\?es|inequ\?voca|cl\?usula|\?Dados|\?poca|\? manifesta)/g;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (exts.has(path.extname(ent.name).toLowerCase())) out.push(full);
  }
  return out;
}

const corrupted = [];
for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const matches = text.match(corruptionRe);
  if (matches && matches.length) {
    corrupted.push({ rel, count: matches.length, sample: [...new Set(matches)].slice(0, 5) });
  }
}

if (!corrupted.length) {
  console.log('Nenhum arquivo com acentos corrompidos encontrado.');
  process.exit(0);
}

console.log('Arquivos com possível corrupção:');
for (const item of corrupted) {
  console.log(`- ${item.rel} (${item.count}): ${item.sample.join(', ')}`);
}
