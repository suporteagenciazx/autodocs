(function () {
  const SOFISA_ACCENT = '#006157';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildHref(basePath, hrefFromRoot) {
    let full = basePath + hrefFromRoot;
    if (!full.endsWith('/')) full += '/';
    return full;
  }

  function tagBadgeInlineStyle(hex) {
    if (!hex || typeof hex !== 'string') return '';
    const h = hex.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(h) && !/^#[0-9A-Fa-f]{3}$/.test(h)) return '';
    let r;
    let g;
    let b;
    if (h.length === 4) {
      r = parseInt(h[1] + h[1], 16);
      g = parseInt(h[2] + h[2], 16);
      b = parseInt(h[3] + h[3], 16);
    } else {
      r = parseInt(h.slice(1, 3), 16);
      g = parseInt(h.slice(3, 5), 16);
      b = parseInt(h.slice(5, 7), 16);
    }
    const full =
      h.length === 4
        ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
        : h;
    return (
      '--tag-accent:' +
      full +
      ';color:' +
      full +
      ';border-color:rgba(' +
      r +
      ',' +
      g +
      ',' +
      b +
      ',0.35);background-color:rgba(' +
      r +
      ',' +
      g +
      ',' +
      b +
      ',0.12);'
    );
  }

  function matchesSearch(doc, tagName, q) {
    if (!q) return true;
    const n = q.trim().toLowerCase();
    return (
      doc.title.toLowerCase().includes(n) ||
      doc.blurb.toLowerCase().includes(n) ||
      (tagName && tagName.toLowerCase().includes(n))
    );
  }

  /** null = mostrar todas (admin ou pré-auth / file) */
  function allowedDocIdSet() {
    const a = window.__autodocsAuth;
    if (!a || !a.user) return null;
    if (a.user.role === 'admin' || a.allowedDocIds == null) return null;
    return new Set(a.allowedDocIds);
  }

  function render() {
    const grid = document.getElementById('documentacoes-grid');
    const empty = document.getElementById('documentacoes-empty');
    const search = document.getElementById('documentacoes-search');
    if (!grid || !window.AUTODOCS_DOCS_CATALOG || !window.AutoDocsTags) return;

    const basePath = typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
    const catalog = window.AUTODOCS_DOCS_CATALOG;
    window.AutoDocsTags.ensureDefaults(catalog.map(d => d.id));

    const allowed = allowedDocIdSet();

    function paint() {
      const q = search ? search.value : '';
      grid.innerHTML = '';
      let count = 0;
      catalog.forEach(doc => {
        if (allowed && !allowed.has(doc.id)) return;
        const tagName = window.AutoDocsTags.tagNameForDoc(doc.id);
        if (!matchesSearch(doc, tagName, q)) return;
        count++;
        const href = buildHref(basePath, doc.href);
        const tagAccent = window.AutoDocsTags.accentForDoc(doc.id);
        const card = document.createElement('a');
        card.className = 'doc-hub-card';
        card.href = href;
        const tagStyle = tagBadgeInlineStyle(tagAccent) || tagBadgeInlineStyle(SOFISA_ACCENT);
        card.innerHTML =
          '<div class="doc-hub-card-preview doc-hub-card-preview--icon">' +
          '<span class="material-symbols-rounded doc-hub-card-doc-icon" aria-hidden="true">description</span>' +
          '</div>' +
          '<div class="doc-hub-card-body">' +
          '<span class="doc-hub-card-title">' +
          escapeHtml(doc.title) +
          '</span>' +
          '<span class="doc-hub-card-tag" style="' +
          tagStyle +
          '">' +
          escapeHtml(tagName || '—') +
          '</span>' +
          '</div>';
        grid.appendChild(card);
      });
      if (empty) empty.hidden = count > 0;
      if (!count && empty) empty.hidden = false;
    }

    paint();
    if (search && !search.dataset.docHubBound) {
      search.dataset.docHubBound = '1';
      search.addEventListener('input', paint);
    }
  }

  async function start() {
    if (window.AutoDocsTags && typeof window.AutoDocsTags.syncFromServer === 'function') {
      const bp = typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
      try {
        await window.AutoDocsTags.syncFromServer(bp);
      } catch (_) {
        /* usa localStorage */
      }
    }
    render();
  }

  if (window.__autodocsAuth !== undefined) {
    start();
  } else {
    document.addEventListener('autodocs-auth-ready', () => start(), { once: true });
  }

  document.addEventListener('autodocs-tags-synced', () => {
    const grid = document.getElementById('documentacoes-grid');
    if (grid && window.AUTODOCS_DOCS_CATALOG && window.AutoDocsTags) {
      render();
    }
  });

  async function refreshTagsFromServer() {
    if (!window.AutoDocsTags || typeof window.AutoDocsTags.syncFromServer !== 'function') return;
    const bp = typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
    try {
      await window.AutoDocsTags.syncFromServer(bp);
    } catch (_) {
      /* ignore */
    }
    if (document.getElementById('documentacoes-grid')) {
      render();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.getElementById('documentacoes-grid')) {
      refreshTagsFromServer();
    }
  });

  setInterval(() => {
    if (document.visibilityState !== 'visible' || !document.getElementById('documentacoes-grid')) return;
    refreshTagsFromServer();
  }, 30000);
})();

