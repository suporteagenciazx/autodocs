// navdrawer.js

const AUTODOCS_DEFAULTS = {
  logo: 'sistema/logo-horizontal.svg',
  favicon: 'sistema/favicon.svg',
};

/** Rotas só para role admin (caminho na URL). */
const AUTODOCS_ADMIN_PATH_MARKERS = ['/configuracoes/', '/tags/', '/usuarios/', '/designer/'];

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
      <a class="navdrawer-option navdrawer-admin-only" id="menu-tags" data-path="tags/" href="#">
        <span class="material-symbols-rounded">label</span>Tags
      </a>
      <a class="navdrawer-option navdrawer-admin-only" id="menu-usuarios" data-path="usuarios/" href="#">
        <span class="material-symbols-rounded">group</span>Usuários
      </a>
      <a class="navdrawer-option navdrawer-admin-only" id="menu-designer" data-path="designer/" href="#">
        <span class="material-symbols-rounded">design_services</span>Designer
      </a>
      <a class="navdrawer-option" id="menu-suporte" data-path="suporte/" href="#">
        <span class="material-symbols-rounded">support_agent</span>Suporte
      </a>
    </div>
    <div class="down-side">
      <div class="navdrawer-div"></div>
      <a class="navdrawer-option navdrawer-admin-only" id="menu-configuracoes" data-path="configuracoes/" href="#">
        <span class="material-symbols-rounded">settings</span>Configurações
      </a>
      <a class="navdrawer-option" id="menu-sair" href="#">
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

function autodocsUserIsAdmin(auth) {
  return !!(auth && auth.user && String(auth.user.role || '').toLowerCase() === 'admin');
}

function autodocsIsPublicAuthPath() {
  const p = location.pathname.toLowerCase();
  return (
    p.includes('/login/') ||
    p.includes('/cadastro/') ||
    p.includes('/install/')
  );
}

function autodocsPathRequiresAdmin() {
  const p = location.pathname.toLowerCase();
  return AUTODOCS_ADMIN_PATH_MARKERS.some(m => p.includes(m));
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
    '/login/',
    '/cadastro/',
    '/install/',
  ];
  for (let i = 0; i < markers.length; i++) {
    const idx = lower.indexOf(markers[i]);
    if (idx !== -1) {
      return p.slice(0, idx + 1);
    }
  }

  return p;
}

async function fetchAutodocsThemeJson(basePath) {
  if (location.protocol === 'file:') return null;
  try {
    const res = await fetch(basePath + 'api/autodocs-theme.php', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === 'object' ? data : null;
  } catch (_) {
    return null;
  }
}

function aplicarTemaAutoDocs(basePath, theme) {
  const root = document.documentElement;

  let logoRel = '';
  let favRel = '';
  let corDestaque = null;
  let corAccent = null;
  if (theme && typeof theme === 'object') {
    logoRel = normalizeThemePath(theme.logo || '');
    favRel = normalizeThemePath(theme.favicon || '');
    if (typeof theme.corDestaque === 'string') corDestaque = theme.corDestaque;
    if (typeof theme.corAccent === 'string') corAccent = theme.corAccent;
  }

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

/** Reaplica tema a partir de api/private/theme.json (ex.: após salvar em Configurações). */
async function applyAutoDocsTheme() {
  const basePath = getBasePath();
  const theme = await fetchAutodocsThemeJson(basePath);
  aplicarTemaAutoDocs(basePath, theme);
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

function aplicarVisibilidadeMenuAuth(basePath) {
  const auth = window.__autodocsAuth;
  const isAdmin = autodocsUserIsAdmin(auth);
  document.querySelectorAll('.navdrawer-admin-only').forEach(el => {
    if (isAdmin) {
      el.removeAttribute('hidden');
      el.setAttribute('aria-hidden', 'false');
    } else {
      el.setAttribute('hidden', 'hidden');
      el.setAttribute('aria-hidden', 'true');
    }
  });
  const sair = document.getElementById('menu-sair');
  if (!sair) return;
  if (auth && auth.user) {
    sair.innerHTML = '<span class="material-symbols-rounded">logout</span>Sair do Sistema';
    sair.href = '#';
  } else if (autodocsIsPublicAuthPath()) {
    sair.removeAttribute('data-path');
    if (location.pathname.toLowerCase().includes('/login/')) {
      sair.innerHTML = '<span class="material-symbols-rounded">home</span>Início';
      sair.href = basePath;
    } else {
      sair.innerHTML = '<span class="material-symbols-rounded">login</span>Entrar';
      sair.href = basePath + 'login/';
    }
  }
}

function configurarBotaoSair(basePath) {
  const sair = document.getElementById('menu-sair');
  if (!sair) return;
  sair.addEventListener('click', async e => {
    const auth = window.__autodocsAuth;
    if (!auth || !auth.user) {
      return;
    }
    e.preventDefault();
    try {
      await fetch(basePath + 'api/auth-logout.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
    } catch (_) {
      /* continua para limpar UI */
    }
    window.__autodocsAuth = null;
    location.href = basePath + 'login/';
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
  } else if (
    pathSemIndex.includes('/login/') ||
    pathSemIndex.includes('/cadastro/') ||
    pathSemIndex.includes('/install/')
  ) {
    /* sem item ativo */
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

/** @returns {Promise<boolean>} true = abortar início do shell (ex.: redirect login em curso) */
async function autodocsResolveAuth(basePath) {
  if (location.protocol === 'file:') {
    window.__autodocsAuth = {
      user: { id: 0, email: 'local@file', role: 'admin' },
      allowedDocIds: null,
    };
    return false;
  }
  if (autodocsIsPublicAuthPath()) {
    window.__autodocsAuth = null;
    return false;
  }
  const url = basePath + 'api/auth-me.php';
  let res;
  try {
    res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  } catch (_) {
    window.__autodocsAuth = null;
    const here = location.pathname + location.search + location.hash;
    location.href = basePath + 'login/?returnUrl=' + encodeURIComponent(here);
    return true;
  }
  if (res.status === 401) {
    const here = location.pathname + location.search + location.hash;
    location.href = basePath + 'login/?returnUrl=' + encodeURIComponent(here);
    return true;
  }
  if (res.status === 503) {
    window.__autodocsAuth = null;
    if (!location.pathname.toLowerCase().includes('/install/')) {
      location.href = basePath + 'install/';
    }
    return true;
  }
  if (!res.ok) {
    window.__autodocsAuth = null;
    const here = location.pathname + location.search + location.hash;
    location.href = basePath + 'login/?returnUrl=' + encodeURIComponent(here);
    return true;
  }
  try {
    const data = await res.json();
    window.__autodocsAuth = {
      user: data.user,
      allowedDocIds: Array.isArray(data.allowedDocIds) ? data.allowedDocIds : [],
      userTagIds: Array.isArray(data.userTagIds) ? data.userTagIds : [],
    };
  } catch (_) {
    window.__autodocsAuth = null;
    location.href = basePath + 'login/?returnUrl=' + encodeURIComponent(location.pathname);
    return true;
  }
  return false;
}

function autodocsGuardAdminRoute(basePath) {
  if (location.protocol === 'file:') return;
  if (autodocsIsPublicAuthPath()) return;
  if (!autodocsPathRequiresAdmin()) return;
  const auth = window.__autodocsAuth;
  if (autodocsUserIsAdmin(auth)) return;
  location.replace(basePath + 'documentacoes/');
}

function autodocsDispatchAuthReady() {
  document.dispatchEvent(new CustomEvent('autodocs-auth-ready', { detail: window.__autodocsAuth }));
}

document.addEventListener('DOMContentLoaded', async () => {
  const basePath = getBasePath();
  let abort = false;
  try {
    abort = await autodocsResolveAuth(basePath);
    if (abort) return;
    autodocsGuardAdminRoute(basePath);
    inserirNavdrawer();
    ajustarLinks(basePath);
    const themeData = await fetchAutodocsThemeJson(basePath);
    aplicarTemaAutoDocs(basePath, themeData);
    if (window.AutoDocsTags && typeof window.AutoDocsTags.syncFromServer === 'function') {
      try {
        await window.AutoDocsTags.syncFromServer(basePath);
      } catch (_) {
        /* mantém localStorage */
      }
    }
    aplicarVisibilidadeMenuAuth(basePath);
    configurarBotaoSair(basePath);
    ativarMenu();
    configurarMenuMovel();
  } finally {
    if (!abort) {
      autodocsDispatchAuthReady();
    }
  }
});

window.applyAutoDocsTheme = applyAutoDocsTheme;
window.getAutoDocsBasePath = getBasePath;
