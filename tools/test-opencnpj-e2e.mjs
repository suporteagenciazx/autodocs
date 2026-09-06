import { chromium } from 'playwright';

const BASE = 'http://localhost:8088';
const EMAIL = 'admin@autodocs.com';
const PASSWORD = 'Test@12345';

async function login(page) {
  await page.goto(`${BASE}/login/`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function typeCnpj(page, selector) {
  await page.waitForFunction(
    sel => {
      const el = document.querySelector(sel);
      return el && el.dataset.opencnpjBound === '1';
    },
    selector,
    { timeout: 10000 }
  );
  await page.evaluate(sel => {
    const input = document.querySelector(sel);
    if (!input) throw new Error('Campo CNPJ não encontrado: ' + sel);
    input.focus();
    input.value = '';
    for (const ch of '00000000000191') {
      input.value += ch;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, selector);
  await page.waitForTimeout(1200);
}

async function testContrato(page) {
  await page.goto(`${BASE}/documentos/contrato/`, { waitUntil: 'networkidle' });
  await typeCnpj(page, '#i-cnpj');
  const razao = await page.inputValue('#i-razao');
  if (!razao.includes('BRASIL')) throw new Error(`Contrato falhou: "${razao}"`);
  console.log('OK contrato:', razao);
}

async function testAprovacao(page) {
  await page.goto(`${BASE}/documentos/aprovacao/`, { waitUntil: 'networkidle' });
  await typeCnpj(page, '#i-cnpj');
  const razao = await page.inputValue('#i-razao');
  const abertura = await page.inputValue('#i-abertura');
  if (!razao.includes('BRASIL')) throw new Error('Aprovação: razão vazia');
  if (!abertura.startsWith('1966')) throw new Error(`Aprovação: abertura="${abertura}"`);
  console.log('OK aprovacao:', razao, abertura);
}

async function testDeclaracao(page) {
  await page.goto(`${BASE}/documentos/declaracao/`, { waitUntil: 'networkidle' });
  await typeCnpj(page, '#i-cnpj');
  const razao = await page.inputValue('#i-razao');
  if (!razao.includes('BRASIL')) throw new Error('Declaração falhou');
  console.log('OK declaracao:', razao);
}

async function testTermo(page) {
  await page.goto(`${BASE}/documentos/termo/`, { waitUntil: 'networkidle' });
  await typeCnpj(page, '#i-cnpj');
  const razao = await page.inputValue('#i-razao');
  if (!razao.includes('BRASIL')) throw new Error('Termo falhou');
  console.log('OK termo:', razao);
}

async function testOrdem(page) {
  await page.goto(`${BASE}/documentos/ordem/`, { waitUntil: 'networkidle' });
  await typeCnpj(page, '#i-cnpj');
  const razao = await page.inputValue('#i-razao');
  if (!razao.includes('BRASIL')) throw new Error('Ordem falhou');
  console.log('OK ordem:', razao);
}

async function testGarantia(page) {
  await page.goto(`${BASE}/documentos/garantia/`, { waitUntil: 'networkidle' });
  await typeCnpj(page, '#i-cnpj');
  const cliente = await page.inputValue('#i-cliente');
  if (!cliente.includes('BRASIL')) throw new Error('Garantia falhou');
  console.log('OK garantia:', cliente);
}

async function testDesignerVoltar(page) {
  await page.goto(`${BASE}/designer/`, { waitUntil: 'networkidle' });
  await page.click('#designer-btn-arquivo');
  await page.waitForSelector('#designer-view-arquivo:not([hidden])');
  await page.click('#designer-btn-arquivo-voltar');
  await page.waitForSelector('#designer-view-active:not([hidden])');
  if (!(await page.locator('#designer-view-arquivo').isHidden())) {
    throw new Error('Designer voltar não ocultou arquivo');
  }
  console.log('OK designer voltar');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await login(page);
  await testContrato(page);
  await testAprovacao(page);
  await testDeclaracao(page);
  await testOrdem(page);
  await testTermo(page);
  await testGarantia(page);
  await testDesignerVoltar(page);
  console.log('\nTodos os testes passaram.');
} catch (e) {
  console.error('\nFALHOU:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
