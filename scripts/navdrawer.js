// navdrawer.js

const NAVDRAWER_COLLAPSED_LS = 'autodocs.navdrawer.collapsed';
const THEME_MODE_LS = 'autodocs.theme.mode';
const PROFILE_PREFIX = 'autodocs.profile.';
/** Incrementar quando o HTML do menu lateral mudar (força atualização após soft-nav). */
const AUTODOCS_NAVDRAWER_REVISION = '7';

(function applyNavdrawerCollapsedEarly() {
  try {
    if (localStorage.getItem(NAVDRAWER_COLLAPSED_LS) === '1') {
      document.documentElement.classList.add('navdrawer-collapsed');
    }
  } catch (_) {
    /* ignore */
  }
})();

(function applyThemeModeEarly() {
  try {
    const mode = localStorage.getItem(THEME_MODE_LS);
    if (mode === 'dark') document.documentElement.classList.add('theme-dark');
    else document.documentElement.classList.remove('theme-dark');
  } catch (_) {
    /* ignore */
  }
})();

const AUTODOCS_DEFAULTS = {
  logo: 'sistema/logo-horizontal.svg',
  favicon: 'sistema/favicon.svg',
};

/** Rotas só para role admin (caminho na URL). */
const AUTODOCS_ADMIN_PATH_MARKERS = [
  '/configuracoes/',
  '/tags/',
  '/usuarios/',
  '/designer/',
  '/seguranca/',
  '/integracoes/',
];

const navdrawerHTML = `
<header id="navdrawer" data-revision="${AUTODOCS_NAVDRAWER_REVISION}">
  <div class="sistema-logo">
    <div class="logo logo--full"><img src="" id="logo" alt="Logo"></div>
    <img class="logo logo--compact" src="" id="logo-compact" alt="Logo">
    <div class="sistema-logo-actions">
      <button id="navdrawer-collapse" type="button" aria-label="Recolher menu" title="Recolher menu">
        <span class="material-symbols-rounded" aria-hidden="true">chevron_left</span>
      </button>
      <button id="navdrawer-toggle" type="button" aria-label="Abrir menu" aria-expanded="false">
        <span class="material-symbols-rounded">menu</span>
      </button>
    </div>
    <div class="logo-div"></div>
  </div>
  <button id="navdrawer-backdrop" type="button" aria-label="Fechar menu"></button>
  <div class="sistema-navdrawer">
    <div class="up-side">
      <a class="navdrawer-option" id="menu-home" data-path="" href="#" title="Painel Inicial">
        <span class="material-symbols-rounded" aria-hidden="true">home</span><span class="navdrawer-label">Painel Inicial</span>
      </a>
      <a class="navdrawer-option" id="menu-documentacoes" data-path="documentacoes/" href="#" title="Documentações">
        <span class="material-symbols-rounded" aria-hidden="true">folder_open</span><span class="navdrawer-label">Documentações</span>
      </a>
      <a class="navdrawer-option navdrawer-admin-only" id="menu-tags" data-path="tags/" href="#" title="Etiqueta">
        <span class="material-symbols-rounded" aria-hidden="true">label</span><span class="navdrawer-label">Etiqueta</span>
      </a>
      <a class="navdrawer-option navdrawer-admin-only" id="menu-usuarios" data-path="usuarios/" href="#" title="Usuários">
        <span class="material-symbols-rounded" aria-hidden="true">group</span><span class="navdrawer-label">Usuários</span>
      </a>
      <a class="navdrawer-option navdrawer-admin-only" id="menu-designer" data-path="designer/" href="#" title="Designer">
        <span class="material-symbols-rounded" aria-hidden="true">design_services</span><span class="navdrawer-label">Designer</span>
      </a>
      <a class="navdrawer-option navdrawer-admin-only" id="menu-integracoes" data-path="integracoes/" href="#" title="Integrações">
        <span class="material-symbols-rounded" aria-hidden="true">hub</span><span class="navdrawer-label">Integrações</span>
      </a>
      <a class="navdrawer-option" id="menu-suporte" data-path="suporte/" href="#" title="Suporte">
        <span class="material-symbols-rounded" aria-hidden="true">support_agent</span><span class="navdrawer-label">Suporte</span>
      </a>
      <a class="navdrawer-option navdrawer-admin-only" id="menu-configuracoes" data-path="configuracoes/" href="#" title="Branding">
        <span class="material-symbols-rounded" aria-hidden="true">palette</span><span class="navdrawer-label">Branding</span>
      </a>
      <a class="navdrawer-option navdrawer-admin-only" id="menu-seguranca" data-path="seguranca/" href="#" title="Segurança">
        <span class="material-symbols-rounded" aria-hidden="true">shield</span><span class="navdrawer-label">Segurança</span>
      </a>
    </div>
    <div class="down-side">
      <div class="navdrawer-div"></div>
      <button type="button" class="navdrawer-footer-card navdrawer-lock" id="navdrawer-lock" title="Bloquear sessão">
        <span class="material-symbols-rounded" aria-hidden="true">lock</span><span class="navdrawer-label">Bloquear</span>
      </button>
      <div class="navdrawer-div navdrawer-lock-div"></div>
      <button type="button" class="navdrawer-footer-card navdrawer-profile-card" id="navdrawer-profile" title="Editar perfil">
        <span class="navdrawer-profile-avatar" aria-hidden="true"><span class="navdrawer-profile-initial">A</span></span>
        <span class="navdrawer-profile-meta">
          <span class="navdrawer-profile-name navdrawer-label">Utilizador</span>
          <span class="navdrawer-profile-role navdrawer-label">Utilizador</span>
        </span>
      </button>
      <div class="navdrawer-footer-card navdrawer-theme-switch" title="Alternar modo claro/escuro">
        <span class="navdrawer-theme-label navdrawer-label">Claro</span>
        <label class="navdrawer-switch" aria-label="Alternar tema">
          <input type="checkbox" id="navdrawer-theme-toggle">
          <span class="navdrawer-switch-track"></span>
        </label>
      </div>
      <a class="navdrawer-footer-card navdrawer-logout" id="menu-sair" href="#" title="Sair">
        <span class="material-symbols-rounded" aria-hidden="true">logout</span><span class="navdrawer-label">Sair</span>
      </a>
    </div>
  </div>
</header>
<button type="button" id="autodocs-support-fab" class="autodocs-support-fab" title="Suporte" aria-label="Abrir suporte">
  <span class="material-symbols-rounded" aria-hidden="true">headset_mic</span>
</button>
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
    '/integracoes/',
    '/suporte/',
    '/ajuda/',
    '/configuracoes/',
    '/seguranca/',
    '/perfil/',
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

  const logoCompact = document.getElementById('logo-compact');
  if (logoCompact) {
    logoCompact.src = basePath + favRel;
  }

  let linkIcon = document.querySelector('link[rel~="icon"]');
  if (!linkIcon) {
    linkIcon = document.createElement('link');
    linkIcon.rel = 'icon';
    document.head.appendChild(linkIcon);
  }
  linkIcon.href = basePath + favRel;

  if (corDestaque && isValidHexColor(corDestaque)) {
    root.style.setProperty('--brand-destaque', corDestaque.trim());
  } else {
    root.style.removeProperty('--brand-destaque');
  }

  if (corAccent && isValidHexColor(corAccent)) {
    root.style.setProperty('--brand-accent', corAccent.trim());
  } else {
    root.style.removeProperty('--brand-accent');
  }

  /* Evita inline antigo que bloqueava o dark mode */
  root.style.removeProperty('--cor-destaque');
  root.style.removeProperty('--cor-accent');
}

/** Reaplica tema a partir de api/private/theme.json (ex.: após salvar em Configurações). */
async function applyAutoDocsTheme() {
  const basePath = getBasePath();
  const theme = await fetchAutodocsThemeJson(basePath);
  aplicarTemaAutoDocs(basePath, theme);
}

function navdrawerPrecisaAtualizar() {
  const nav = document.getElementById('navdrawer');
  return !nav || nav.getAttribute('data-revision') !== AUTODOCS_NAVDRAWER_REVISION;
}

const SUPPORT_FAB_HTML = `<button type="button" id="autodocs-support-fab" class="autodocs-support-fab" title="Suporte" aria-label="Abrir suporte">
  <span class="material-symbols-rounded" aria-hidden="true">headset_mic</span>
</button>`;

function autodocsShouldHideSupportFab() {
  if (autodocsIsPublicAuthPath()) return true;
  // Páginas de documentação (editor / exportação PDF ou PNG)
  if (document.getElementById('documento')) return true;
  const path = (location.pathname || '').toLowerCase();
  if (path.includes('/documentos/')) return true;
  return false;
}

function ensureSupportFab() {
  let fab = document.getElementById('autodocs-support-fab');
  if (autodocsShouldHideSupportFab()) {
    if (fab) {
      fab.hidden = true;
      fab.setAttribute('aria-hidden', 'true');
    }
    return fab;
  }
  if (!fab) {
    document.body.insertAdjacentHTML('beforeend', SUPPORT_FAB_HTML);
    fab = document.getElementById('autodocs-support-fab');
  }
  return fab;
}

function ensureNavdrawerAtual() {
  if (!navdrawerPrecisaAtualizar()) {
    if (!autodocsShouldHideSupportFab()) ensureSupportFab();
    else {
      const fab = document.getElementById('autodocs-support-fab');
      if (fab) {
        fab.hidden = true;
        fab.setAttribute('aria-hidden', 'true');
      }
    }
    return false;
  }
  const old = document.getElementById('navdrawer');
  if (old) old.remove();
  const oldFab = document.getElementById('autodocs-support-fab');
  if (oldFab) oldFab.remove();
  document.body.insertAdjacentHTML('afterbegin', navdrawerHTML);
  if (autodocsShouldHideSupportFab()) {
    const fab = document.getElementById('autodocs-support-fab');
    if (fab) {
      fab.hidden = true;
      fab.setAttribute('aria-hidden', 'true');
    }
  }
  return true;
}

function inserirNavdrawer() {
  ensureNavdrawerAtual();
}

function ligarLinksNavegacaoShell() {
  if (location.protocol === 'file:') return;
  document.querySelectorAll('.sistema-navdrawer a[data-path]').forEach(link => {
    if (link.dataset.shellNavBound === '1') return;
    link.dataset.shellNavBound = '1';
    link.addEventListener('click', e => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (link.id === 'menu-sair') return;
      const href = link.href;
      if (!href || href.endsWith('#')) return;
      if (!autodocsIsShellUrl(href)) return;
      e.preventDefault();
      autodocsSoftNavigate(href, { push: true });
    });
    link.addEventListener('pointerenter', () => {
      if (link.id === 'menu-sair') return;
      const href = link.href;
      if (!href || href.endsWith('#')) return;
      autodocsPrefetchShell(href);
    });
    link.addEventListener('focus', () => {
      if (link.id === 'menu-sair') return;
      const href = link.href;
      if (!href || href.endsWith('#')) return;
      autodocsPrefetchShell(href);
    });
  });
}

function getThemeMode() {
  try {
    return localStorage.getItem(THEME_MODE_LS) === 'dark' ? 'dark' : 'light';
  } catch (_) {
    return 'light';
  }
}

function setThemeMode(mode) {
  const next = mode === 'dark' ? 'dark' : 'light';
  try {
    localStorage.setItem(THEME_MODE_LS, next);
  } catch (_) {
    /* ignore */
  }
  document.documentElement.classList.toggle('theme-dark', next === 'dark');
  syncThemeSwitchUi();
}

function syncThemeSwitchUi() {
  const dark = getThemeMode() === 'dark';
  const input = document.getElementById('navdrawer-theme-toggle');
  const wrap = document.querySelector('.navdrawer-theme-switch');
  const label = wrap && wrap.querySelector('.navdrawer-theme-label');
  if (input) input.checked = dark;
  if (label) label.textContent = dark ? 'Escuro' : 'Claro';
}

function configurarThemeSwitch() {
  syncThemeSwitchUi();
  const input = document.getElementById('navdrawer-theme-toggle');
  const wrap = document.querySelector('.navdrawer-theme-switch');
  if (input && input.dataset.bound !== '1') {
    input.dataset.bound = '1';
    input.addEventListener('change', () => {
      setThemeMode(input.checked ? 'dark' : 'light');
    });
  }
  if (wrap && wrap.dataset.bound !== '1') {
    wrap.dataset.bound = '1';
    wrap.addEventListener('click', e => {
      if (e.target && e.target.closest && e.target.closest('.navdrawer-switch')) return;
      setThemeMode(getThemeMode() === 'dark' ? 'light' : 'dark');
    });
  }
}

function profileStorageKey() {
  const a = window.__autodocsAuth;
  if (!a || !a.user) return PROFILE_PREFIX + 'anon';
  if (a.user.id != null) return PROFILE_PREFIX + String(a.user.id);
  return PROFILE_PREFIX + String(a.user.email || 'anon').toLowerCase();
}

function loadProfilePrefs() {
  try {
    const raw = localStorage.getItem(profileStorageKey());
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '',
    };
  } catch (_) {
    return { displayName: '' };
  }
}

function resolveDisplayName() {
  const prefs = loadProfilePrefs();
  if (prefs.displayName) return prefs.displayName;
  const a = window.__autodocsAuth;
  if (a && a.user) {
    if (String(a.user.role || '').toLowerCase() === 'admin') return 'Administrador';
    if (a.user.email) {
      const local = String(a.user.email).split('@')[0];
      return local || String(a.user.email);
    }
  }
  return 'Utilizador';
}

function resolveRoleLabel() {
  const a = window.__autodocsAuth;
  if (!a || !a.user) return '';
  return String(a.user.role || '').toLowerCase() === 'admin' ? 'Admin' : 'Utilizador';
}

function syncProfileCardUi() {
  const name = resolveDisplayName();
  const role = resolveRoleLabel();
  const nameEl = document.querySelector('#navdrawer-profile .navdrawer-profile-name');
  const roleEl = document.querySelector('#navdrawer-profile .navdrawer-profile-role');
  const initialEl = document.querySelector('#navdrawer-profile .navdrawer-profile-initial');
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role;
  if (initialEl) {
    const letter = (name || 'U').trim().charAt(0).toUpperCase() || 'U';
    initialEl.textContent = letter;
  }
  const card = document.getElementById('navdrawer-profile');
  const auth = window.__autodocsAuth;
  if (card) {
    card.hidden = !(auth && auth.user);
  }
}

function configurarProfileCard(basePath) {
  syncProfileCardUi();
  const card = document.getElementById('navdrawer-profile');
  if (!card || card.dataset.bound === '1') return;
  card.dataset.bound = '1';
  card.addEventListener('click', () => {
    const href = basePath + 'perfil/';
    if (location.protocol === 'file:') {
      location.href = href;
      return;
    }
    if (typeof autodocsSoftNavigate === 'function') {
      autodocsSoftNavigate(href, { push: true });
    } else {
      location.href = href;
    }
  });
}

function configurarSupportFab(basePath) {
  if (autodocsShouldHideSupportFab()) {
    const existing = document.getElementById('autodocs-support-fab');
    if (existing) {
      existing.hidden = true;
      existing.setAttribute('aria-hidden', 'true');
    }
    return;
  }
  const fab = ensureSupportFab();
  if (!fab) return;
  fab.hidden = false;
  fab.setAttribute('aria-hidden', 'false');
  if (fab.dataset.bound === '1') return;
  fab.dataset.bound = '1';
  fab.addEventListener('click', () => {
    const href = (typeof getBasePath === 'function' ? getBasePath() : basePath || '/') + 'suporte/';
    if (location.protocol === 'file:') {
      location.href = href;
      return;
    }
    if (typeof autodocsSoftNavigate === 'function') {
      autodocsSoftNavigate(href, { push: true });
    } else {
      location.href = href;
    }
  });
}

function prepararNavdrawerShell(basePath) {
  const rebuilt = ensureNavdrawerAtual();
  ajustarLinks(basePath);
  aplicarVisibilidadeMenuAuth(basePath);
  configurarBotaoSair(basePath);
  configurarBotaoBloquear();
  configurarThemeSwitch();
  configurarProfileCard(basePath);
  configurarSupportFab(basePath);
  ativarMenu();
  configurarMenuMovel();
  configurarNavdrawerCollapse();
  ligarLinksNavegacaoShell();
  configurarTransicaoDocumentos();
  return rebuilt;
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
  const lockBtn = document.getElementById('navdrawer-lock');
  const lockDiv = document.querySelector('.navdrawer-lock-div');
  if (lockBtn) {
    const showLock = !!(auth && auth.user);
    lockBtn.hidden = !showLock;
    lockBtn.setAttribute('aria-hidden', showLock ? 'false' : 'true');
    if (lockDiv) {
      lockDiv.hidden = !showLock;
      lockDiv.setAttribute('aria-hidden', showLock ? 'false' : 'true');
    }
  }
  if (!sair) return;
  if (auth && auth.user) {
    sair.className = 'navdrawer-footer-card navdrawer-logout';
    sair.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">logout</span><span class="navdrawer-label">Sair</span>';
    sair.href = '#';
    sair.title = 'Sair';
  } else if (autodocsIsPublicAuthPath()) {
    sair.removeAttribute('data-path');
    sair.className = 'navdrawer-footer-card navdrawer-logout';
    if (location.pathname.toLowerCase().includes('/login/')) {
      sair.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">home</span><span class="navdrawer-label">Início</span>';
      sair.href = basePath;
      sair.title = 'Início';
    } else {
      sair.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">login</span><span class="navdrawer-label">Entrar</span>';
      sair.href = basePath + 'login/';
      sair.title = 'Entrar';
    }
  }
}

function configurarBotaoBloquear() {
  const btn = document.getElementById('navdrawer-lock');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', e => {
    e.preventDefault();
    if (!window.__autodocsAuth || !window.__autodocsAuth.user) return;
    if (window.AutoDocsIdleLock && typeof window.AutoDocsIdleLock.lock === 'function') {
      window.AutoDocsIdleLock.lock();
      return;
    }
    document.dispatchEvent(new CustomEvent('autodocs-lock-request'));
  });
}

function configurarBotaoSair(basePath) {
  const sair = document.getElementById('menu-sair');
  if (!sair || sair.dataset.bound === '1') return;
  sair.dataset.bound = '1';
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
        headers: Object.assign(
          { Accept: 'application/json' },
          window.__autodocsCsrf ? { 'X-AutoDocs-CSRF': window.__autodocsCsrf } : {}
        ),
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
  const profile = document.getElementById('navdrawer-profile');
  if (profile) profile.classList.remove('is-active');

  function ativarPorId(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('ativo');
  }

  const pathSemIndex = currentPath.replace(/index\.html$/i, '');

  if (pathSemIndex.includes('/configuracoes/')) {
    ativarPorId('menu-configuracoes');
  } else if (pathSemIndex.includes('/seguranca/')) {
    ativarPorId('menu-seguranca');
  } else if (pathSemIndex.includes('/perfil/')) {
    if (profile) profile.classList.add('is-active');
  } else if (pathSemIndex.includes('/usuarios/')) {
    ativarPorId('menu-usuarios');
  } else if (pathSemIndex.includes('/designer/')) {
    ativarPorId('menu-designer');
  } else if (pathSemIndex.includes('/integracoes/')) {
    ativarPorId('menu-integracoes');
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
  if (!toggle || !backdrop) return;
  if (toggle.dataset.bound === '1') return;
  toggle.dataset.bound = '1';

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

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      closeMenu();
    }
  });
}

function navdrawerIsCollapsed() {
  return document.documentElement.classList.contains('navdrawer-collapsed');
}

function aplicarNavdrawerCollapsed(collapsed) {
  const root = document.documentElement;
  const collapseBtn = document.getElementById('navdrawer-collapse');
  if (collapsed) {
    root.classList.add('navdrawer-collapsed');
    document.body.classList.add('navdrawer-collapsed');
    if (collapseBtn) {
      collapseBtn.setAttribute('aria-label', 'Expandir menu');
      collapseBtn.title = 'Expandir menu';
      const icon = collapseBtn.querySelector('.material-symbols-rounded');
      if (icon) icon.textContent = 'chevron_right';
    }
    try {
      localStorage.setItem(NAVDRAWER_COLLAPSED_LS, '1');
    } catch (_) {
      /* ignore */
    }
  } else {
    root.classList.remove('navdrawer-collapsed');
    document.body.classList.remove('navdrawer-collapsed');
    if (collapseBtn) {
      collapseBtn.setAttribute('aria-label', 'Recolher menu');
      collapseBtn.title = 'Recolher menu';
      const icon = collapseBtn.querySelector('.material-symbols-rounded');
      if (icon) icon.textContent = 'chevron_left';
    }
    try {
      localStorage.setItem(NAVDRAWER_COLLAPSED_LS, '0');
    } catch (_) {
      /* ignore */
    }
  }
}

function configurarNavdrawerCollapse() {
  const btn = document.getElementById('navdrawer-collapse');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  let collapsed = false;
  try {
    collapsed = localStorage.getItem(NAVDRAWER_COLLAPSED_LS) === '1';
  } catch (_) {
    collapsed = false;
  }
  aplicarNavdrawerCollapsed(collapsed);

  btn.addEventListener('click', () => {
    aplicarNavdrawerCollapsed(!navdrawerIsCollapsed());
  });
}

/** Páginas do hub: sidebar persiste; só o conteúdo é trocado. */
function autodocsNormalizePathname(pathname) {
  let p = String(pathname || '').replace(/\\/g, '/').toLowerCase();
  p = p.replace(/\/index\.html?$/i, '/');
  if (!p.endsWith('/')) p += '/';
  return p;
}

function autodocsIsShellUrl(href) {
  if (location.protocol === 'file:') return false;
  let url;
  try {
    url = new URL(href, location.href);
  } catch (_) {
    return false;
  }
  if (url.origin !== location.origin) return false;
  const path = autodocsNormalizePathname(url.pathname);
  if (
    path.includes('/documentos/') ||
    path.includes('/consulta/') ||
    path.includes('/login/') ||
    path.includes('/cadastro/') ||
    path.includes('/install/')
  ) {
    return false;
  }
  const base = autodocsNormalizePathname(getBasePath());
  if (base !== '/' && !path.startsWith(base) && path !== base.slice(0, -1) + '/') {
    return false;
  }
  return true;
}

function autodocsScriptPathKey(src) {
  try {
    return new URL(src, location.href).pathname.replace(/\\/g, '/').toLowerCase();
  } catch (_) {
    return String(src || '').toLowerCase();
  }
}

function autodocsEnsureStylesFrom(doc, pageUrl) {
  const base = pageUrl instanceof URL ? pageUrl.href : String(pageUrl);
  doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    let abs;
    try {
      abs = new URL(href, base).href;
    } catch (_) {
      return;
    }
    const exists = [...document.querySelectorAll('link[rel="stylesheet"]')].some(l => {
      try {
        return l.href === abs;
      } catch (_) {
        return false;
      }
    });
    if (exists) return;
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = abs;
    document.head.appendChild(el);
  });
  doc.querySelectorAll('head style').forEach(styleEl => {
    const text = styleEl.textContent || '';
    if (!text.trim()) return;
    const marker = text.slice(0, 80);
    const dup = [...document.head.querySelectorAll('style')].some(s => (s.textContent || '').includes(marker));
    if (dup) return;
    const el = document.createElement('style');
    el.textContent = text;
    document.head.appendChild(el);
  });
}

async function autodocsLoadPageScripts(scriptEls, pageUrl) {
  const base = pageUrl instanceof URL ? pageUrl.href : String(pageUrl);
  for (let i = 0; i < scriptEls.length; i++) {
    const el = scriptEls[i];
    const src = el.getAttribute('src');
    if (!src) continue;
    let abs;
    try {
      abs = new URL(src, base).href;
    } catch (_) {
      continue;
    }
    const key = autodocsScriptPathKey(abs);
    if (key.endsWith('/navdrawer.js') || key.endsWith('/scripts/navdrawer.js')) continue;
    const already = [...document.scripts].some(s => s.src && autodocsScriptPathKey(s.src) === key);
    if (already) continue;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = abs;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Falha ao carregar ' + src));
      document.body.appendChild(s);
    });
  }
}

let autodocsSoftNavBusy = false;
let autodocsSoftNavAbort = null;
const autodocsPrefetchCache = new Map();
const AUTODOCS_PAGE_TRANSITION_MS = 700;
let autodocsPageTransitionStarted = 0;

function autodocsEnsurePageTransitionOverlay() {
  if (!document.body) return null;
  let el = document.getElementById('autodocs-page-transition');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'autodocs-page-transition';
  el.className = 'autodocs-page-transition';
  el.hidden = true;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-label', 'A carregar documentação');
  el.innerHTML = '<div class="autodocs-page-transition-spinner" aria-hidden="true"></div>';
  document.body.appendChild(el);
  return el;
}

function autodocsShowPageTransition() {
  document.documentElement.classList.remove('autodocs-page-transition-pending');
  const el = autodocsEnsurePageTransitionOverlay();
  if (!el) return;
  if (!autodocsPageTransitionStarted) {
    autodocsPageTransitionStarted = Date.now();
  }
  el.classList.remove('is-hiding');
  el.hidden = false;
}

function autodocsHidePageTransition() {
  const el = document.getElementById('autodocs-page-transition');
  document.documentElement.classList.remove('autodocs-page-transition-pending');
  autodocsPageTransitionStarted = 0;
  if (!el || el.hidden) return;
  el.classList.add('is-hiding');
  window.setTimeout(() => {
    el.hidden = true;
    el.classList.remove('is-hiding');
  }, 280);
}

function autodocsNavigateToDocumento(href) {
  try {
    sessionStorage.setItem('autodocs.pageTransition', String(Date.now()));
  } catch (_) {
    /* ignore */
  }
  autodocsPageTransitionStarted = Date.now();
  autodocsShowPageTransition();
  window.setTimeout(() => {
    location.href = href;
  }, 16);
}

function autodocsResumePageTransition() {
  let started = 0;
  try {
    const raw = sessionStorage.getItem('autodocs.pageTransition');
    if (raw) {
      sessionStorage.removeItem('autodocs.pageTransition');
      started = parseInt(raw, 10) || 0;
    }
  } catch (_) {
    /* ignore */
  }
  const pending = document.documentElement.classList.contains('autodocs-page-transition-pending');
  if (!started && !pending) return;

  autodocsPageTransitionStarted = started || Date.now();
  autodocsShowPageTransition();
  const wait = Math.max(0, AUTODOCS_PAGE_TRANSITION_MS - (Date.now() - autodocsPageTransitionStarted));
  window.setTimeout(autodocsHidePageTransition, wait);
}

function configurarTransicaoDocumentos() {
  if (document.documentElement.dataset.autodocsDocTransitionBound === '1') return;
  document.documentElement.dataset.autodocsDocTransitionBound = '1';
  document.addEventListener('click', e => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a.doc-hub-card, a.designer-card-link');
    if (!link || !link.href) return;
    let url;
    try {
      url = new URL(link.href, location.href);
    } catch (_) {
      return;
    }
    if (url.origin !== location.origin) return;
    if (!url.pathname.toLowerCase().includes('/documentos/')) return;
    e.preventDefault();
    autodocsNavigateToDocumento(url.href);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autodocsResumePageTransition);
} else {
  autodocsResumePageTransition();
}

function autodocsPrefetchShell(href) {
  if (!autodocsIsShellUrl(href)) return;
  let url;
  try {
    url = new URL(href, location.href);
  } catch (_) {
    return;
  }
  const key = autodocsNormalizePathname(url.pathname);
  if (autodocsPrefetchCache.has(key)) return;
  if (key === autodocsNormalizePathname(location.pathname)) return;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const p = fetch(url.href, {
    credentials: 'same-origin',
    headers: { Accept: 'text/html' },
    signal: ctrl ? ctrl.signal : undefined,
  })
    .then(async res => {
      if (!res.ok) {
        autodocsPrefetchCache.delete(key);
        return null;
      }
      const html = await res.text();
      return { html, href: url.href };
    })
    .catch(() => {
      autodocsPrefetchCache.delete(key);
      return null;
    });
  autodocsPrefetchCache.set(key, p);
  // Limitar cache de prefetch
  if (autodocsPrefetchCache.size > 12) {
    const first = autodocsPrefetchCache.keys().next().value;
    autodocsPrefetchCache.delete(first);
  }
}

async function autodocsSoftNavigate(href, opts) {
  const push = !opts || opts.push !== false;
  if (autodocsSoftNavBusy) return;
  if (!autodocsIsShellUrl(href)) {
    location.href = href;
    return;
  }
  let url;
  try {
    url = new URL(href, location.href);
  } catch (_) {
    location.href = href;
    return;
  }
  if (autodocsNormalizePathname(url.pathname) === autodocsNormalizePathname(location.pathname)) {
    ativarMenu();
    return;
  }

  if (autodocsSoftNavAbort) {
    try {
      autodocsSoftNavAbort.abort();
    } catch (_) {
      /* ignore */
    }
  }
  autodocsSoftNavAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;

  autodocsSoftNavBusy = true;
  document.body.classList.add('autodocs-soft-nav');
  try {
    if (navdrawerPrecisaAtualizar()) {
      prepararNavdrawerShell(getBasePath());
    }
    const pathKey = autodocsNormalizePathname(url.pathname);
    let html = null;
    const pre = autodocsPrefetchCache.get(pathKey);
    if (pre) {
      const hit = await pre;
      if (hit && hit.html) {
        html = hit.html;
        url = new URL(hit.href, location.href);
      }
      autodocsPrefetchCache.delete(pathKey);
    }
    if (!html) {
      const res = await fetch(url.href, {
        credentials: 'same-origin',
        headers: { Accept: 'text/html' },
        signal: autodocsSoftNavAbort ? autodocsSoftNavAbort.signal : undefined,
      });
      if (!res.ok) {
        location.href = url.href;
        return;
      }
      html = await res.text();
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const path = autodocsNormalizePathname(url.pathname);
    if (AUTODOCS_ADMIN_PATH_MARKERS.some(m => path.includes(m)) && !autodocsUserIsAdmin(window.__autodocsAuth)) {
      location.replace(getBasePath() + 'documentacoes/');
      return;
    }

    autodocsEnsureStylesFrom(doc, url);

    // Mantém #navdrawer, FAB de suporte e scripts de shell; só troca o conteúdo da direita
    const nav = document.getElementById('navdrawer');
    const fab = document.getElementById('autodocs-support-fab');
    [...document.body.children].forEach(child => {
      if (child === nav || child === fab) return;
      if (child.id === 'navdrawer' || child.id === 'autodocs-support-fab') return;
      if (child.tagName === 'SCRIPT') return;
      child.remove();
    });

    const toInsert = [];
    const scripts = [];
    [...doc.body.children].forEach(child => {
      if (child.tagName === 'SCRIPT') {
        scripts.push(child);
        return;
      }
      if (child.id === 'navdrawer' || child.id === 'autodocs-support-fab') return;
      toInsert.push(document.importNode(child, true));
    });
    toInsert.forEach(node => document.body.appendChild(node));

    if (doc.title) document.title = doc.title;

    try {
      await autodocsLoadPageScripts(scripts, url);
    } catch (_) {
      location.href = url.href;
      return;
    }

    if (push) {
      history.pushState({ autodocsShell: true }, '', url.href);
    }

    if (typeof window.aplicarTextosBanco === 'function') {
      window.aplicarTextosBanco();
    }
    ativarMenu();
    aplicarVisibilidadeMenuAuth(getBasePath());
    configurarSupportFab(getBasePath());

    document.body.classList.remove('navdrawer-open');
    const toggle = document.getElementById('navdrawer-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');

    document.dispatchEvent(new CustomEvent('autodocs-page-ready', { detail: { href: url.href } }));
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    location.href = href;
  } finally {
    autodocsSoftNavBusy = false;
    document.body.classList.remove('autodocs-soft-nav');
  }
}

function configurarNavegacaoShell() {
  if (location.protocol === 'file:') return;

  ligarLinksNavegacaoShell();

  if (window.__autodocsShellPopstateBound) return;
  window.__autodocsShellPopstateBound = true;

  window.addEventListener('popstate', () => {
    if (!autodocsIsShellUrl(location.href)) {
      location.reload();
      return;
    }
    autodocsSoftNavigate(location.href, { push: false });
  });

  try {
    history.replaceState(
      Object.assign({}, history.state || {}, { autodocsShell: true }),
      '',
      location.href
    );
  } catch (_) {
    /* ignore */
  }
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
    if (data && typeof data.csrfToken === 'string') {
      window.__autodocsCsrf = data.csrfToken;
      if (window.AutoDocsApi) window.AutoDocsApi.setCsrf(data.csrfToken);
    }
    window.__autodocsAuth = {
      user: data.user,
      allowedDocIds: Array.isArray(data.allowedDocIds) ? data.allowedDocIds : [],
      userTagIds: Array.isArray(data.userTagIds) ? data.userTagIds : [],
      locked: !!data.locked,
      pinOk: !!data.pinOk,
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

function autodocsEnsureApiScript(basePath) {
  if (window.AutoDocsApi) return;
  if (document.querySelector('script[data-autodocs-api]')) return;
  const s = document.createElement('script');
  s.src = basePath + 'scripts/autodocs-api.js?v=20260907';
  s.dataset.autodocsApi = '1';
  s.async = false;
  document.head.appendChild(s);
}

function autodocsEnsureIdleLockScript(basePath) {
  if (document.querySelector('script[data-autodocs-idle-lock]')) return;
  const s = document.createElement('script');
  s.src = basePath + 'scripts/autodocs-idle-lock.js?v=20260907b';
  s.dataset.autodocsIdleLock = '1';
  document.head.appendChild(s);
}

function autodocsEnsureToastScript(basePath) {
  if (window.AutoDocsToast) return;
  if (document.querySelector('script[data-autodocs-toast]')) return;
  const s = document.createElement('script');
  s.src = basePath + 'scripts/autodocs-toast.js';
  s.dataset.autodocsToast = '1';
  s.async = false;
  document.head.appendChild(s);
}

function autodocsEnsureCssGuardScript(basePath) {
  if (document.querySelector('script[data-autodocs-css-guard]')) return;
  const s = document.createElement('script');
  s.src = basePath + 'scripts/autodocs-css-guard.js';
  s.dataset.autodocsCssGuard = '1';
  s.async = true;
  document.head.appendChild(s);
}

function autodocsDispatchAuthReady() {
  document.dispatchEvent(new CustomEvent('autodocs-auth-ready', { detail: window.__autodocsAuth }));
}

function autodocsIsDocumentoEditorPage() {
  const path = autodocsNormalizePathname(location.pathname).toLowerCase();
  if (!path.includes('/documentos/')) return false;
  if (path.endsWith('/documentos/') || path.endsWith('/documentos')) return false;
  const pagina = document.querySelector('.sistema-pagina');
  if (!pagina) return false;
  const h1 = pagina.querySelector(':scope > h1');
  return !!(h1 && !h1.closest('.doc-pagina-titulo'));
}

function autodocsNavigateToDocumentacoes(basePath) {
  const href = basePath + 'documentacoes/';
  if (typeof autodocsSoftNavigate === 'function' && autodocsIsShellUrl(href)) {
    autodocsSoftNavigate(href, { push: true });
    return;
  }
  location.href = href;
}

function autodocsSetupDocumentoVoltar() {
  if (!autodocsIsDocumentoEditorPage()) return;
  const pagina = document.querySelector('.sistema-pagina');
  const h1 = pagina.querySelector(':scope > h1');
  if (!h1 || h1.closest('.doc-pagina-titulo')) return;

  const row = document.createElement('div');
  row.className = 'doc-pagina-titulo';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'doc-pagina-voltar';
  btn.setAttribute('aria-label', 'Voltar à lista de documentações');
  btn.setAttribute('title', 'Voltar à lista de documentações');
  btn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>';

  const basePath = getBasePath();
  btn.addEventListener('click', () => autodocsNavigateToDocumentacoes(basePath));

  row.appendChild(btn);
  row.appendChild(h1);
  pagina.insertBefore(row, pagina.firstChild);
}

document.addEventListener('DOMContentLoaded', async () => {
  const basePath = getBasePath();
  autodocsEnsureApiScript(basePath);
  let abort = false;
  try {
    // Tema em paralelo com auth — reduz FOUC de cores/logo sem bloquear o gate.
    const themePromise = fetchAutodocsThemeJson(basePath);
    abort = await autodocsResolveAuth(basePath);
    if (abort) return;
    autodocsEnsureCssGuardScript(basePath);
    autodocsEnsureToastScript(basePath);
    autodocsEnsureIdleLockScript(basePath);
    autodocsGuardAdminRoute(basePath);
    prepararNavdrawerShell(basePath);
    const themeData = await themePromise;
    aplicarTemaAutoDocs(basePath, themeData);
    if (window.AutoDocsTags && typeof window.AutoDocsTags.syncFromServer === 'function') {
      try {
        await window.AutoDocsTags.syncFromServer(basePath);
      } catch (_) {
        /* mantém localStorage */
      }
    }
    configurarNavegacaoShell();
  } finally {
    if (!abort) {
      autodocsSetupDocumentoVoltar();
      autodocsDispatchAuthReady();
    }
  }
});

document.addEventListener('autodocs-page-ready', () => {
  autodocsSetupDocumentoVoltar();
  if (!autodocsIsPublicAuthPath()) {
    configurarSupportFab(getBasePath());
  }
});

window.applyAutoDocsTheme = applyAutoDocsTheme;
window.getAutoDocsBasePath = getBasePath;
window.autodocsSoftNavigate = autodocsSoftNavigate;
