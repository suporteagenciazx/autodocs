(function () {
  const LS_LEGACY_KEYS = ['autodocs.logo', 'autodocs.favicon', 'autodocs.corDestaque', 'autodocs.corAccent'];

  function clearLegacyThemeStorage() {
    LS_LEGACY_KEYS.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (_) {
        /* ignore */
      }
    });
  }

  function normalizeHexForPicker(hex) {
    if (!hex || typeof hex !== 'string') return '#eef1ee';
    const t = hex.trim();
    if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
      const r = t[1];
      const g = t[2];
      const b = t[3];
      return '#' + r + r + g + g + b + b;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    return '#eef1ee';
  }

  function getBasePath() {
    return typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
  }

  async function loadForm() {
    const logoEl = document.getElementById('autodocs-logo');
    const favEl = document.getElementById('autodocs-favicon');
    const pickerD = document.getElementById('autodocs-cor-destaque');
    const textD = document.getElementById('autodocs-cor-destaque-text');
    const pickerA = document.getElementById('autodocs-cor-accent');
    const textA = document.getElementById('autodocs-cor-accent-text');
    if (!logoEl || !favEl) return;

    const basePath = getBasePath();
    let data = null;
    try {
      const res = await fetch(basePath + 'api/autodocs-theme.php', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) data = await res.json();
    } catch (_) {
      /* mantém campos vazios */
    }

    if (data && typeof data === 'object') {
      logoEl.value = typeof data.logo === 'string' ? data.logo : '';
      favEl.value = typeof data.favicon === 'string' ? data.favicon : '';
      const storedD = typeof data.corDestaque === 'string' ? data.corDestaque : '#eef1ee';
      const storedA = typeof data.corAccent === 'string' ? data.corAccent : '#025aa4';
      if (pickerD) pickerD.value = normalizeHexForPicker(storedD);
      if (textD) textD.value = storedD;
      if (pickerA) pickerA.value = normalizeHexForPicker(storedA);
      if (textA) textA.value = storedA;
    }
  }

  async function save(e) {
    e.preventDefault();
    const basePath = getBasePath();
    const logo = document.getElementById('autodocs-logo').value.trim();
    const fav = document.getElementById('autodocs-favicon').value.trim();
    const cd = document.getElementById('autodocs-cor-destaque-text').value.trim();
    const ca = document.getElementById('autodocs-cor-accent-text').value.trim();

    let res;
    try {
      res = await fetch(basePath + 'api/autodocs-theme.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ logo, favicon: fav, corDestaque: cd, corAccent: ca }),
      });
    } catch (_) {
      alert('Não foi possível contactar o servidor.');
      return;
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body.error || 'Erro ao guardar.');
      return;
    }

    clearLegacyThemeStorage();
    if (typeof window.applyAutoDocsTheme === 'function') {
      await window.applyAutoDocsTheme();
    }
    location.reload();
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadForm();
    const form = document.getElementById('form-autodocs-tema');
    if (form) form.addEventListener('submit', save);

    const pickerD = document.getElementById('autodocs-cor-destaque');
    const textD = document.getElementById('autodocs-cor-destaque-text');
    const pickerA = document.getElementById('autodocs-cor-accent');
    const textA = document.getElementById('autodocs-cor-accent-text');

    if (pickerD && textD) {
      pickerD.addEventListener('input', () => {
        textD.value = pickerD.value;
      });
      textD.addEventListener('input', () => {
        const v = textD.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/i.test(v)) pickerD.value = v;
      });
    }
    if (pickerA && textA) {
      pickerA.addEventListener('input', () => {
        textA.value = pickerA.value;
      });
      textA.addEventListener('input', () => {
        const v = textA.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/i.test(v)) pickerA.value = v;
      });
    }
  });
})();
