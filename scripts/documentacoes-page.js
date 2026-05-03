(function () {
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

  function matchesSearch(doc, tagName, q) {
    if (!q) return true;
    const n = q.trim().toLowerCase();
    return (
      doc.title.toLowerCase().includes(n) ||
      doc.blurb.toLowerCase().includes(n) ||
      (tagName && tagName.toLowerCase().includes(n))
    );
  }

  function render() {
    const grid = document.getElementById('documentacoes-grid');
    const empty = document.getElementById('documentacoes-empty');
    const search = document.getElementById('documentacoes-search');
    if (!grid || !window.AUTODOCS_DOCS_CATALOG || !window.AutoDocsTags) return;

    const basePath = typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
    const catalog = window.AUTODOCS_DOCS_CATALOG;
    window.AutoDocsTags.ensureDefaults(catalog.map(d => d.id));

    function paint() {
      const q = search ? search.value : '';
      grid.innerHTML = '';
      let count = 0;
      catalog.forEach(doc => {
        const tagName = window.AutoDocsTags.tagNameForDoc(doc.id);
        if (!matchesSearch(doc, tagName, q)) return;
        count++;
        const href = buildHref(basePath, doc.href);
        const tagAccent = window.AutoDocsTags.accentForDoc(doc.id);
        const card = document.createElement('a');
        card.className = 'doc-hub-card';
        card.href = href;
        const tagStyle =
          /^#[0-9A-Fa-f]{6}$/.test(tagAccent) || /^#[0-9A-Fa-f]{3}$/.test(tagAccent)
            ? '--tag-accent:' + tagAccent + ';'
            : '';
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
    if (search) search.addEventListener('input', paint);
  }

  document.addEventListener('DOMContentLoaded', render);
})();
