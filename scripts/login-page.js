(function () {
  const DEFAULT_LOGO = 'sistema/logo-horizontal.svg';
  const DEFAULT_FAV = 'sistema/favicon.svg';

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

  async function fetchAutodocsTheme(basePath) {
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

  function applyLoginBranding(basePath, theme) {
    const root = document.documentElement;
    let logoRel = '';
    let favRel = '';
    if (theme && typeof theme === 'object') {
      logoRel = normalizeThemePath(theme.logo || '');
      favRel = normalizeThemePath(theme.favicon || '');
    }
    if (!logoRel) logoRel = DEFAULT_LOGO;
    if (!favRel) favRel = DEFAULT_FAV;

    const img = document.getElementById('login-logo');
    if (img) img.src = basePath + logoRel;

    let linkIcon = document.querySelector('link[rel~="icon"]');
    if (!linkIcon) {
      linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      document.head.appendChild(linkIcon);
    }
    linkIcon.href = basePath + favRel;

    const corDestaque = theme && typeof theme.corDestaque === 'string' ? theme.corDestaque : null;
    const corAccent = theme && typeof theme.corAccent === 'string' ? theme.corAccent : null;
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

  function getBasePath() {
    let p = location.pathname.replace(/\\/g, '/');
    p = p.replace(/\/?index\.html?$/i, '');
    if (!p.endsWith('/')) p += '/';
    const lower = p.toLowerCase();
    const idx = lower.indexOf('/login/');
    if (idx !== -1) return p.slice(0, idx + 1);
    return '/';
  }

  function readReturnUrl(basePath) {
    const q = new URLSearchParams(location.search).get('returnUrl');
    if (!q || typeof q !== 'string') return null;
    let raw = q.trim();
    try {
      raw = decodeURIComponent(raw);
    } catch (_) {
      return null;
    }
    // Rejeitar open redirect: protocol-relative, URLs absolutas, backslash, ..
    if (!raw.startsWith('/')) return null;
    if (raw.startsWith('//') || raw.includes('\\') || raw.includes('..')) return null;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return null;
    // Opcional: garantir que fica sob o mesmo basePath da app
    const base = typeof basePath === 'string' && basePath.startsWith('/') ? basePath : '/';
    if (base !== '/' && !raw.startsWith(base) && raw !== base.slice(0, -1)) {
      // Em subpasta (ex. /AutoDocsv7/), só aceitar paths dessa árvore
      return null;
    }
    return raw;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const basePath = getBasePath();
    const theme = await fetchAutodocsTheme(basePath);
    applyLoginBranding(basePath, theme);

    const form = document.getElementById('form-login');
    const msg = document.getElementById('login-msg');
    const linkCad = document.getElementById('link-cadastro');
    if (linkCad) {
      linkCad.href = basePath + 'cadastro/';
    }

    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (msg) msg.textContent = '';
      const email = (document.getElementById('login-email') || {}).value || '';
      const password = (document.getElementById('login-password') || {}).value || '';
      try {
        const res = await fetch(basePath + 'api/auth-login.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (msg) msg.textContent = data.error || 'Credenciais inválidas.';
          return;
        }
        const ret = readReturnUrl(basePath);
        // returnUrl vem de location.pathname (ex.: /AutoDocsv7/documentacoes/) — já é caminho absoluto no host; não prefixar com basePath.
        if (ret) {
          location.href = ret;
        } else {
          location.href = basePath;
        }
      } catch (_) {
        if (msg) msg.textContent = 'Erro de rede. Tente novamente.';
      }
    });
  });
})();
