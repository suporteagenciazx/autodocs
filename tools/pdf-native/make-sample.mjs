import fs from 'node:fs';

function streamObj(content) {
  const stream = content;
  return `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;
}

const objs = [];
objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
objs[2] = '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>';
objs[3] =
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >>';
objs[4] =
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>';
objs[5] = streamObj(
  'BT\n/F1 14 Tf\n50 780 Td\n(Garantia de Liberacao) Tj\n0 -28 Td\n(Prezados, eu [GERENTE] confirmo para [CLIENTE] CNPJ [CNPJ].) Tj\nET'
);
objs[6] = streamObj(
  'BT\n/F1 12 Tf\n50 780 Td\n(Pagina final. Assinatura: [GERENTE]) Tj\nET'
);
objs[7] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

let body = '%PDF-1.4\n';
const offsets = [0];
for (let i = 1; i <= 7; i++) {
  offsets[i] = Buffer.byteLength(body, 'utf8');
  body += `${i} 0 obj\n${objs[i]}\nendobj\n`;
}
const xrefPos = Buffer.byteLength(body, 'utf8');
body += 'xref\n0 8\n';
body += '0000000000 65535 f \n';
for (let i = 1; i <= 7; i++) {
  body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
body += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

fs.writeFileSync(new URL('./sample-garantia.pdf', import.meta.url), body);
console.log('bytes', Buffer.byteLength(body));
