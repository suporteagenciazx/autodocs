#!/usr/bin/env node
const base = process.argv[2] || 'http://localhost:8088/login/';

async function fetchText(url) {
  const res = await fetch(url);
  return { status: res.status, text: await res.text(), url };
}

const { status, text } = await fetchText(base);
console.log('Page:', base, status);
const links = [...text.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
for (const rel of links) {
  const abs = new URL(rel, base).href;
  const r = await fetch(abs);
  console.log(r.status, abs);
}
