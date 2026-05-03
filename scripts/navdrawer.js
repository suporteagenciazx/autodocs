// navdrawer.js

const AUTODOCS_THEME_KEYS = {
  logo: 'autodocs.logo',
  favicon: 'autodocs.favicon',
  corDestaque: 'autodocs.corDestaque',
  corAccent: 'autodocs.corAccent',
};

const AUTODOCS_DEFAULTS = {
  logo: 'sistema/logo.svg',
  favicon: 'sistema/logo.svg',
};

const navdrawerHTML = `
<header id="navdrawer">
  <div class="sistema-logo">
    <div class="logo"><img src="" id="logo" alt="Logo"></div>
    <button id="navdrawer-toggle" type="button" aria-label="Abrir menu" aria-expanded="false">
      <span class="material-symbols-rounded">menu</span>
    </button>
    <div class="logo-div"></div>
  </div>
  <button id="navdrawer-backdrop" type="button" aria-label="Fechar menu"></button>
  <div class="sistema-navdrawer">
    <div class="up-side">
      <a class="navdrawer-option" id="menu-home" data-path="" href="#">
        <span class="material-symbols-rounded">home</span>Painel Inicial
      </a>
      <a class="navdrawer-option" id="menu-documentacoes" data-path="documentacoes/" href="#">
        <span class="material-symbols-rounded">folder_open</span>Documentações
      </a>
      <a class="navdrawer-option" id="menu-tags" data-path="tags/" href="#">
        <span class="material-symbols-rounded">label</span>Tags
      </a>
      <a class="navdrawer-option" id="menu-usuarios" data-path="usuarios/" href="#">
        <span class="material-symbols-rounded">group</span>Usuários
      </a>
      <a class="navdrawer-option" id="menu-designer" data-path="designer/" href="#">
        <span class="material-symbols-rounded">design_services</span>Designer
      </a>
      <a class="navdrawer-option" id="menu-suporte" data-path="suporte/" href="#">
        <span class="material-symbols-rounded">support_agent</span>Suporte
      </a>
    </div>
    <div class="down-side">
      <div class="navdrawer-div"></div>
      <a class="navdrawer-option" id="menu-configuracoes" data-path="configuracoes/" href="#">
        <span class="material-symbols-rounded">settings</span>Configurações
      </a>
      <a class="navdrawer-option" id="menu-sair" href="https://www.google.com">
        <span class="material-symbols-rounded">logout</span>Sair do Sistema
      </a>
    </div>
  </div>
</header>
`;

function normalizeThemePath(s) {
  if (!s || typeof s !== 'string') return '';
  let t = s.trim().replace(/\\/g, '/');
  if (t.startsWith('./')) t = t.slice(2);
  if (t.includes('..')) return '';
  return t;
}

function isValidHexColor(v) {
  return typeof v === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(v.trim());
}

/**
 * Caminho base do app (sempre com barra final).
 * Detecta automaticamente raiz do Live Server, subpasta de deploy (ex.: /autodocs/) e file://.
 */
function getBasePath() {
  let p = location.pathname.replace(/\\/g, '/');
  p = p.replace(/\/?index\.html?$/i, '');
  if (!p.endsWith('/')) {
    p += '/';
  }

  const lower = p.toLowerCase();
  const markers = [
    '/documentos/',
    '/consulta/',
    '/documentacoes/',
    '/tags/',
    '/usuarios/',
    '/designer/',
    '/suporte/',
    '/ajuda/',
    '/configuracoes/',
  ];
  for (let i = 0; i < markers.length; i++) {
    const idx = lower.indexOf(markers[i]);
    if (idx !== -1) {
      return p.slice(0, idx + 1);
    }
  }

  return p;
}

function aplicarTemaAutoDocs(basePath) {
  const root = document.documentElement;

  let logoRel = normalizeThemePath(localStorage.getItem(AUTODOCS_THEME_KEYS.logo) || '');
  let favRel = normalizeThemePath(localStorage.getItem(AUTODOCS_THEME_KEYS.favicon) || '');
  const corDestaque = localStorage.getItem(AUTODOCS_THEME_KEYS.corDestaque);
  const corAccent = localStorage.getItem(AUTODOCS_THEME_KEYS.corAccent);

  if (!logoRel) logoRel = AUTODOCS_DEFAULTS.logo;
  if (!favRel) favRel = AUTODOCS_DEFAULTS.favicon;

  const logoEl = document.getElementById('logo');
  if (logoEl) {
    logoEl.src = basePath + logoRel;
  }

  let linkIcon = document.querySelector('link[rel~="icon"]');
  if (!linkIcon) {
    linkIcon = document.createElement('link');
    linkIcon.rel = 'icon';
    document.head.appendChild(linkIcon);
  }
  linkIcon.href = basePath + favRel;

  if (corDestaque && isValidHexColor(corDestaque)) {
    root.style.setProperty('--cor-destaque', corDestaque.trim());
  } else {
    root.style.removeProperty('--cor-destaque');
  }

  if (corAccent && isValidHexColor(corAccent)) {
    root.style.setProperty('--cor-accent', corAccent.trim());
  } else {
    root.style.removeProperty('--cor-accent');
  }
}

/** Reaplica tema (ex.: após salvar em Configurações). */
function applyAutoDocsTheme() {
  aplicarTemaAutoDocs(getBasePath());
}

function inserirNavdrawer() {
  document.body.insertAdjacentHTML('afterbegin', navdrawerHTML);
}

function ajustarLinks(basePath) {
  const navLinks = document.querySelectorAll('.sistema-navdrawer a[data-path]');
  navLinks.forEach(link => {
    const relativePath = link.getAttribute('data-path');
    let fullHref = basePath + relativePath;
    if (!fullHref.endsWith('/')) fullHref += '/';
    link.href = fullHref;
  });
}

function ativarMenu() {
  const navLinks = document.querySelectorAll('.sistema-navdrawer a[data-path]');
  const currentPath = location.pathname.toLowerCase();

  navLinks.forEach(link => {
    link.classList.remove('ativo');
  });

  function ativarPorId(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('ativo');
  }

  const pathSemIndex = currentPath.replace(/index\.html$/i, '');

  if (pathSemIndex.includes('/configuracoes/')) {
    ativarPorId('menu-configuracoes');
  } else if (pathSemIndex.includes('/usuarios/')) {
    ativarPorId('menu-usuarios');
  } else if (pathSemIndex.includes('/designer/')) {
    ativarPorId('menu-designer');
  } else if (pathSemIndex.includes('/suporte/')) {
    ativarPorId('menu-suporte');
  } else if (pathSemIndex.includes('/tags/')) {
    ativarPorId('menu-tags');
  } else if (pathSemIndex.includes('/documentacoes/')) {
    ativarPorId('menu-documentacoes');
  } else if (pathSemIndex.includes('/documentos/') || pathSemIndex.includes('/consulta/') || pathSemIndex.includes('/ajuda/')) {
    ativarPorId('menu-documentacoes');
  } else {
    ativarPorId('menu-home');
  }
}

function configurarMenuMovel() {
  const toggle = document.getElementById('navdrawer-toggle');
  const backdrop = document.getElementById('navdrawer-backdrop');
  const navLinks = document.querySelectorAll('.sistema-navdrawer a[data-path]');
  if (!toggle || !backdrop) return;

  function closeMenu() {
    document.body.classList.remove('navdrawer-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    const opened = document.body.classList.toggle('navdrawer-open');
    toggle.setAttribute('aria-expanded', opened ? 'true' : 'false');
  }

  toggle.addEventListener('click', toggleMenu);
  backdrop.addEventListener('click', closeMenu);
  navLinks.forEach(link => link.addEventListener('click', closeMenu));

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      closeMenu();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  inserirNavdrawer();
  const basePath = getBasePath();
  ajustarLinks(basePath);
  aplicarTemaAutoDocs(basePath);
  ativarMenu();
  configurarMenuMovel();
});

window.applyAutoDocsTheme = applyAutoDocsTheme;
window.getAutoDocsBasePath = getBasePath;
