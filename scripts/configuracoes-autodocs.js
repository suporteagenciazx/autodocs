(function () {
  const KEYS = {
    logo: 'autodocs.logo',
    favicon: 'autodocs.favicon',
    corDestaque: 'autodocs.corDestaque',
    corAccent: 'autodocs.corAccent',
  };

  function loadForm() {
    const logoEl = document.getElementById('autodocs-logo');
    const favEl = document.getElementById('autodocs-favicon');
    const pickerD = document.getElementById('autodocs-cor-destaque');
    const textD = document.getElementById('autodocs-cor-destaque-text');
    const pickerA = document.getElementById('autodocs-cor-accent');
    const textA = document.getElementById('autodocs-cor-accent-text');
    if (!logoEl || !favEl) return;

    logoEl.value = localStorage.getItem(KEYS.logo) || '';
    favEl.value = localStorage.getItem(KEYS.favicon) || '';

    const storedD = localStorage.getItem(KEYS.corDestaque) || '#eef1ee';
    const storedA = localStorage.getItem(KEYS.corAccent) || '#006157';
    if (pickerD) pickerD.value = normalizeHexForPicker(storedD);
    if (textD) textD.value = storedD;
    if (pickerA) pickerA.value = normalizeHexForPicker(storedA);
    if (textA) textA.value = storedA;
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

  function save(e) {
    e.preventDefault();
    const logo = document.getElementById('autodocs-logo').value.trim();
    const fav = document.getElementById('autodocs-favicon').value.trim();
    const cd = document.getElementById('autodocs-cor-destaque-text').value.trim();
    const ca = document.getElementById('autodocs-cor-accent-text').value.trim();

    if (logo) localStorage.setItem(KEYS.logo, logo);
    else localStorage.removeItem(KEYS.logo);
    if (fav) localStorage.setItem(KEYS.favicon, fav);
    else localStorage.removeItem(KEYS.favicon);
    if (cd) localStorage.setItem(KEYS.corDestaque, cd);
    else localStorage.removeItem(KEYS.corDestaque);
    if (ca) localStorage.setItem(KEYS.corAccent, ca);
    else localStorage.removeItem(KEYS.corAccent);

    if (typeof window.applyAutoDocsTheme === 'function') {
      window.applyAutoDocsTheme();
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
