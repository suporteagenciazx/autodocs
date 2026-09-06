import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = 'documentos/contrato/index.html';
const filePath = path.join(root, rel);

const gitBlob = execSync(`git -C ${JSON.stringify(root)} show HEAD:${rel}`);
fs.writeFileSync(filePath, gitBlob);

let text = fs.readFileSync(filePath, 'utf8');

text = text.replace(
  '    <link rel="stylesheet" href="../../estilos/sistema.css">',
  '    <link rel="stylesheet" href="../../estilos/fontes/inter.css">\n    <link rel="stylesheet" href="../../estilos/sistema.css">'
);

text = text.replace(
  /\n    <link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols[^>]*>\n\n/,
  '\n'
);

text = text.replace(
  '    <script src="../../scripts/cnpj.js"></script>\n    <script src="../../scripts/datas.js"></script>',
  '    <script src="../../scripts/cnpj.js"></script>\n    <script src="../../scripts/autodocs-toast.js"></script>\n    <script src="../../scripts/opencnpj-autofill.js?v=2"></script>\n    <script src="../../scripts/datas.js"></script>'
);

fs.writeFileSync(filePath, text, 'utf8');

const buf = fs.readFileSync(filePath);
const idx = buf.indexOf(Buffer.from('Contrato de Cr'));
const sample = buf.slice(idx, idx + 20);
const ok = sample.includes(Buffer.from([0xc3, 0xa9]));
console.log(ok ? 'UTF-8 OK' : 'UTF-8 FAIL', sample.toString('utf8'));
console.log('inter.css', text.includes('fontes/inter.css'));
console.log('opencnpj', text.includes('opencnpj-autofill.js'));
