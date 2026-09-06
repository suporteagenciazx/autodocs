import { chromium } from 'playwright';

const base = process.env.AUTODOCS_URL || 'http://localhost:8088';
const email = process.env.AUTODOCS_EMAIL || 'admin@autodocs.com';
const password = process.env.AUTODOCS_PASSWORD || 'Test@12345';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`${base}/login/`, { waitUntil: 'networkidle' });
await page.fill('#login-email', email);
await page.fill('#login-password', password);
await page.click('#form-login button[type="submit"]');
await page.waitForURL(/documentacoes|\/$/);

await page.goto(`${base}/documentos/aprovacao/`, { waitUntil: 'networkidle' });

const btn = page.locator('.doc-pagina-voltar');
await btn.waitFor({ state: 'visible', timeout: 10000 });
const h1 = page.locator('.doc-pagina-titulo h1');
await h1.waitFor({ state: 'visible' });

const title = await h1.textContent();
if (!title || !title.includes('Aprova')) {
  throw new Error(`Título inesperado: ${title}`);
}

await btn.click();
await page.waitForURL(/documentacoes/, { timeout: 10000 });

console.log('OK: botão voltar visível e navega para documentações');

await browser.close();
