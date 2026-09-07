(function () {
  const SOFISA_ACCENT = '#006157';
  const PREFS_PREFIX = 'autodocs.documentacoes.prefs.';
  const PAGE_FLAT = 30;
  const PAGE_GROUP = 10;

  /** @type {{ flatLimit: number, groupLimits: Record<string, number> }} */
  let pageState = { flatLimit: PAGE_FLAT, groupLimits: {} };
  let lastFilterKey = '';

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

  function isAdmin() {
    const a = window.__autodocsAuth;
    return !!(a && a.user && String(a.user.role || '').toLowerCase() === 'admin');
  }

  function currentUserKey() {
    const a = window.__autodocsAuth;
    if (!a || !a.user) return 'anon';
    if (a.user.id != null) return String(a.user.id);
    if (a.user.email) return String(a.user.email).toLowerCase();
    return 'anon';
  }

  function prefsKey() {
    return PREFS_PREFIX + currentUserKey();
  }

  function normalizeTagIds(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.filter(id => typeof id === 'string' && id.trim()).map(id => String(id));
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(prefsKey());
      const parsed = raw ? JSON.parse(raw) : {};
      const legacyFilter =
        parsed && typeof parsed.tagFilter === 'string' && parsed.tagFilter
          ? [parsed.tagFilter]
          : [];
      const tagFilterIds = normalizeTagIds(parsed && parsed.tagFilterIds);
      return {
        groupByTag: !!(parsed && parsed.groupByTag),
        tagFilterIds: tagFilterIds.length ? tagFilterIds : legacyFilter,
        collapsedGroups:
          parsed && parsed.collapsedGroups && typeof parsed.collapsedGroups === 'object'
            ? parsed.collapsedGroups
            : {},
      };
    } catch (_) {
      return { groupByTag: false, tagFilterIds: [], collapsedGroups: {} };
    }
  }

  function savePrefs(partial) {
    const next = Object.assign({}, loadPrefs(), partial || {});
    try {
      localStorage.setItem(prefsKey(), JSON.stringify(next));
    } catch (_) {
      /* ignore quota */
    }
    return next;
  }

  function tagBadgeInlineStyle(hex) {
    if (!hex || typeof hex !== 'string') return '';
    const h = hex.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(h) && !/^#[0-9A-Fa-f]{3}$/.test(h)) return '';
    const full =
      h.length === 4
        ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
        : h;
    /* Só a variável: cor/borda/fundo vêm do CSS (inclui adaptação no dark). */
    return '--tag-accent:' + full + ';';
  }

  function matchesSearch(doc, tagName, q) {
    if (!q) return true;
    const n = q.trim().toLowerCase();
    return (
      doc.title.toLowerCase().includes(n) ||
      (doc.blurb && doc.blurb.toLowerCase().includes(n)) ||
      (tagName && tagName.toLowerCase().includes(n))
    );
  }

  /** null = mostrar todas (admin ou pré-auth / file) */
  function allowedDocIdSet() {
    const a = window.__autodocsAuth;
    if (!a || !a.user) return null;
    if (String(a.user.role || '').toLowerCase() === 'admin' || a.allowedDocIds == null) return null;
    return new Set(a.allowedDocIds);
  }

  function resolveCatalog(catalog) {
    const resolve =
      window.AutoDocsDesignerModels && typeof window.AutoDocsDesignerModels.resolveCatalogDoc === 'function'
        ? window.AutoDocsDesignerModels.resolveCatalogDoc.bind(window.AutoDocsDesignerModels)
        : null;
    if (!resolve) return catalog.slice();
    return catalog.map(doc => resolve(doc));
  }

  function createCard(doc, basePath) {
    const tagName = window.AutoDocsTags.tagNameForDoc(doc.id);
    const tagAccent = window.AutoDocsTags.accentForDoc(doc.id);
    const href = buildHref(basePath, doc.href);
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
      (doc.blurb ? '<p class="doc-hub-card-blurb">' + escapeHtml(doc.blurb) + '</p>' : '') +
      '<span class="doc-hub-card-tag" style="' +
      tagStyle +
      '">' +
      escapeHtml(tagName || '—') +
      '</span>' +
      '</div>';
    return card;
  }

  function filterLabelText(selectedIds, tags) {
    if (!selectedIds.length) return 'Todas as etiquetas';
    if (selectedIds.length === 1) {
      const t = tags.find(x => x.id === selectedIds[0]);
      return t ? t.name : '1 etiqueta';
    }
    return selectedIds.length + ' etiquetas';
  }

  function syncTagFilterChecks(root, preferredIds, tags) {
    const validSelected = normalizeTagIds(preferredIds).filter(id => tags.some(t => t.id === id));
    const allCb = root.querySelector('input[data-tag-all]');
    const boxes = [...root.querySelectorAll('input[data-tag-id]')];
    if (allCb) allCb.checked = validSelected.length === 0;
    boxes.forEach(cb => {
      cb.checked = validSelected.includes(cb.getAttribute('data-tag-id'));
    });
    const label = root.querySelector('.doc-hub-tag-multi-label');
    if (label) label.textContent = filterLabelText(validSelected, tags);
  }

  function populateTagFilter(preferredIds) {
    const root = document.getElementById('documentacoes-tag-filter');
    if (!root || !window.AutoDocsTags) return;
    const tags = visibleTagsForUser();
    const signature = (isAdmin() ? 'a:' : 'u:') + tags.map(t => t.id + ':' + t.name).join('|');
    const validSelected = normalizeTagIds(preferredIds).filter(id => tags.some(t => t.id === id));

    if (root.dataset.tagsSig === signature && root.querySelector('.doc-hub-tag-multi-btn')) {
      syncTagFilterChecks(root, preferredIds, tags);
      return;
    }

    const wasOpen = root.classList.contains('is-open');
    root.innerHTML = '';
    root.classList.add('doc-hub-tag-multiselect');
    root.dataset.tagsSig = signature;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'doc-hub-tag-multi-btn designer-tag-select';
    btn.id = 'documentacoes-tag-filter-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', wasOpen ? 'true' : 'false');
    btn.innerHTML =
      '<span class="doc-hub-tag-multi-label">' +
      escapeHtml(filterLabelText(validSelected, tags)) +
      '</span>' +
      '<span class="material-symbols-rounded" aria-hidden="true">expand_more</span>';

    const panel = document.createElement('div');
    panel.className = 'doc-hub-tag-multi-panel';
    panel.hidden = !wasOpen;
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-multiselectable', 'true');

    const allRow = document.createElement('label');
    allRow.className = 'doc-hub-tag-multi-option';
    allRow.innerHTML =
      '<input type="checkbox" data-tag-all value="*" ' +
      (validSelected.length === 0 ? 'checked' : '') +
      '>' +
      '<span>Todas as etiquetas</span>';
    panel.appendChild(allRow);

    tags.forEach(tag => {
      const row = document.createElement('label');
      row.className = 'doc-hub-tag-multi-option';
      row.innerHTML =
        '<input type="checkbox" data-tag-id="' +
        escapeHtml(tag.id) +
        '" ' +
        (validSelected.includes(tag.id) ? 'checked' : '') +
        '>' +
        '<span>' +
        escapeHtml(tag.name) +
        '</span>';
      panel.appendChild(row);
    });

    root.appendChild(btn);
    root.appendChild(panel);
    if (wasOpen) root.classList.add('is-open');

    function syncFromChecks() {
      const allCb = panel.querySelector('input[data-tag-all]');
      const boxes = [...panel.querySelectorAll('input[data-tag-id]')];
      let ids = boxes.filter(cb => cb.checked).map(cb => cb.getAttribute('data-tag-id'));
      if (allCb && allCb.checked) {
        ids = [];
        boxes.forEach(cb => {
          cb.checked = false;
        });
      } else if (!ids.length && allCb) {
        allCb.checked = true;
      } else if (ids.length && allCb) {
        allCb.checked = false;
      }
      const label = btn.querySelector('.doc-hub-tag-multi-label');
      if (label) label.textContent = filterLabelText(ids, tags);
      savePrefs({ tagFilterIds: ids });
      resetPageState();
      render();
    }

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      root.classList.toggle('is-open', open);
    });

    panel.addEventListener('change', e => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.hasAttribute('data-tag-all') && t.checked) {
        panel.querySelectorAll('input[data-tag-id]').forEach(cb => {
          cb.checked = false;
        });
      }
      if (t.hasAttribute('data-tag-id') && t.checked) {
        const allCb = panel.querySelector('input[data-tag-all]');
        if (allCb) allCb.checked = false;
      }
      syncFromChecks();
    });

    if (!root.dataset.outsideBound) {
      root.dataset.outsideBound = '1';
      document.addEventListener('click', e => {
        if (!root.contains(e.target)) {
          const p = root.querySelector('.doc-hub-tag-multi-panel');
          const b = root.querySelector('.doc-hub-tag-multi-btn');
          if (p) p.hidden = true;
          if (b) b.setAttribute('aria-expanded', 'false');
          root.classList.remove('is-open');
        }
      });
    }
  }

  function syncGroupToggleUi(groupByTag) {
    const btn = document.getElementById('documentacoes-group-toggle');
    if (!btn) return;
    btn.classList.toggle('is-active', !!groupByTag);
    btn.setAttribute('aria-pressed', groupByTag ? 'true' : 'false');
    btn.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">' +
      (groupByTag ? 'view_cozy' : 'view_agenda') +
      '</span>' +
      (groupByTag ? 'Agrupado por etiqueta' : 'Agrupar por etiqueta');
  }

  /** Etiquetas visíveis no filtro/agrupamento (user: só as atribuídas). */
  function visibleTagsForUser() {
    const all = window.AutoDocsTags ? window.AutoDocsTags.getTags() : [];
    if (isAdmin()) return all;
    const a = window.__autodocsAuth;
    const assigned = Array.isArray(a && a.userTagIds) ? a.userTagIds.map(String) : [];
    if (!assigned.length) return [];
    const set = new Set(assigned);
    return all.filter(t => set.has(String(t.id)));
  }

  function syncToolbarTools(groupByTag) {
    const wrap = document.getElementById('documentacoes-admin-tools');
    if (!wrap) return;
    // Agrupar por etiqueta disponível a qualquer utilizador autenticado
    wrap.hidden = false;
    syncGroupToggleUi(groupByTag);
  }

  function visibleDocs(catalog, allowed, q, tagFilterIds) {
    const links = window.AutoDocsTags.getLinks();
    const filterSet = tagFilterIds && tagFilterIds.length ? new Set(tagFilterIds) : null;
    return catalog.filter(doc => {
      if (allowed && !allowed.has(doc.id)) return false;
      const tagId = links[doc.id] || '';
      if (filterSet && !filterSet.has(tagId)) return false;
      const tagName = window.AutoDocsTags.tagNameForDoc(doc.id);
      return matchesSearch(doc, tagName, q);
    });
  }

  function resetPageState() {
    pageState = { flatLimit: PAGE_FLAT, groupLimits: {} };
  }

  function makeLoadMoreBtn(remaining, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'doc-hub-load-more tags-btn-outline';
    btn.textContent = 'Carregar mais (' + remaining + ')';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderGrouped(listEl, docs, basePath) {
    const tags = visibleTagsForUser();
    const links = window.AutoDocsTags.getLinks();
    const prefs = loadPrefs();
    const collapsed = prefs.collapsedGroups || {};
    const byTag = new Map();

    tags.forEach(tag => {
      byTag.set(tag.id, { tag, docs: [] });
    });
    const untagged = { tag: { id: '__untagged__', name: 'Sem tag', accentColor: '#5c6b73' }, docs: [] };

    docs.forEach(doc => {
      const tagId = links[doc.id] || '';
      if (tagId && byTag.has(tagId)) byTag.get(tagId).docs.push(doc);
      else if (isAdmin()) untagged.docs.push(doc);
      // Utilizador: docs fora das etiquetas atribuídas não devem aparecer (já filtrados por allowed)
    });

    const sections = [...byTag.values()].filter(s => s.docs.length > 0);
    if (untagged.docs.length) sections.push(untagged);

    sections.forEach(section => {
      const groupId = section.tag.id || '__untagged__';
      const limit = pageState.groupLimits[groupId] || PAGE_GROUP;
      const isCollapsed = !!collapsed[groupId];
      const shown = section.docs.slice(0, limit);
      const remaining = Math.max(0, section.docs.length - shown.length);

      const group = document.createElement('section');
      group.className = 'doc-hub-group' + (isCollapsed ? ' is-collapsed' : '');
      group.dataset.groupId = groupId;
      const accent = section.tag.accentColor || SOFISA_ACCENT;
      group.style.setProperty('--tag-accent', accent);

      const header = document.createElement('div');
      header.className = 'doc-hub-group-header';

      const collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className = 'doc-hub-group-collapse';
      collapseBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expandir agrupamento' : 'Recolher agrupamento');
      collapseBtn.title = isCollapsed ? 'Expandir' : 'Recolher';
      collapseBtn.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">' +
        (isCollapsed ? 'chevron_right' : 'expand_more') +
        '</span>';
      collapseBtn.addEventListener('click', () => {
        const next = Object.assign({}, loadPrefs().collapsedGroups);
        if (next[groupId]) delete next[groupId];
        else next[groupId] = true;
        savePrefs({ collapsedGroups: next });
        render();
      });

      const title = document.createElement('h2');
      title.className = 'doc-hub-group-title';
      title.innerHTML =
        escapeHtml(section.tag.name) +
        '<span class="doc-hub-group-count">(' +
        section.docs.length +
        ')</span>';

      header.appendChild(collapseBtn);
      header.appendChild(title);
      group.appendChild(header);

      const body = document.createElement('div');
      body.className = 'doc-hub-group-body';
      body.hidden = isCollapsed;

      const grid = document.createElement('div');
      grid.className = 'doc-hub-grid';
      shown.forEach(doc => grid.appendChild(createCard(doc, basePath)));
      body.appendChild(grid);

      if (remaining > 0) {
        const wrap = document.createElement('div');
        wrap.className = 'doc-hub-load-more-wrap';
        wrap.appendChild(
          makeLoadMoreBtn(remaining, () => {
            pageState.groupLimits[groupId] = limit + PAGE_GROUP;
            render();
          })
        );
        body.appendChild(wrap);
      }

      group.appendChild(body);
      listEl.appendChild(group);
    });
  }

  function renderFlat(listEl, docs, basePath) {
    const limit = pageState.flatLimit || PAGE_FLAT;
    const shown = docs.slice(0, limit);
    const remaining = Math.max(0, docs.length - shown.length);
    const grid = document.createElement('div');
    grid.id = 'documentacoes-grid';
    grid.className = 'doc-hub-grid';
    shown.forEach(doc => grid.appendChild(createCard(doc, basePath)));
    listEl.appendChild(grid);
    if (remaining > 0) {
      const wrap = document.createElement('div');
      wrap.className = 'doc-hub-load-more-wrap';
      wrap.appendChild(
        makeLoadMoreBtn(remaining, () => {
          pageState.flatLimit = limit + PAGE_FLAT;
          render();
        })
      );
      listEl.appendChild(wrap);
    }
  }

  function render() {
    const listEl = document.getElementById('documentacoes-list');
    const empty = document.getElementById('documentacoes-empty');
    const search = document.getElementById('documentacoes-search');
    if (!listEl || !window.AUTODOCS_DOCS_CATALOG || !window.AutoDocsTags) return;

    const basePath = typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
    const catalog = resolveCatalog(window.AUTODOCS_DOCS_CATALOG);
    window.AutoDocsTags.ensureDefaults(catalog.map(d => d.id));

    let prefs = loadPrefs();
    const userTags = visibleTagsForUser();
    // Utilizador com 2+ etiquetas: agrupar por defeito na primeira visita
    if (!isAdmin() && userTags.length >= 2 && !prefs._groupPrefTouched) {
      prefs = savePrefs({ groupByTag: true, _groupPrefTouched: true });
    }
    const groupByTag = !!prefs.groupByTag;

    syncToolbarTools(groupByTag);
    populateTagFilter(prefs.tagFilterIds);

    const allowed = allowedDocIdSet();
    const q = search ? search.value : '';
    const filterKey = [groupByTag ? '1' : '0', q, (prefs.tagFilterIds || []).join(',')].join('|');
    if (filterKey !== lastFilterKey) {
      lastFilterKey = filterKey;
      resetPageState();
    }

    const docs = visibleDocs(catalog, allowed, q, prefs.tagFilterIds);

    listEl.innerHTML = '';
    if (groupByTag) renderGrouped(listEl, docs, basePath);
    else renderFlat(listEl, docs, basePath);

    if (empty) empty.hidden = docs.length > 0;
  }

  function bindOnce() {
    const search = document.getElementById('documentacoes-search');
    const groupBtn = document.getElementById('documentacoes-group-toggle');
    const listEl = document.getElementById('documentacoes-list');
    if (!listEl || listEl.dataset.docHubBound === '1') return;
    listEl.dataset.docHubBound = '1';

    if (search) {
      search.addEventListener('input', () => {
        resetPageState();
        render();
      });
    }
    if (groupBtn) {
      groupBtn.addEventListener('click', () => {
        const prefs = loadPrefs();
        savePrefs({ groupByTag: !prefs.groupByTag, _groupPrefTouched: true });
        resetPageState();
        render();
      });
    }
  }

  async function start() {
    const listEl = document.getElementById('documentacoes-list');
    if (!listEl) return;

    if (window.AutoDocsTags && typeof window.AutoDocsTags.syncFromServer === 'function') {
      const bp = typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
      try {
        await window.AutoDocsTags.syncFromServer(bp);
      } catch (_) {
        /* usa localStorage */
      }
    }

    bindOnce();
    render();
  }

  function tryStart() {
    if (document.getElementById('documentacoes-list') || document.getElementById('documentacoes-grid')) {
      start();
    }
  }

  if (window.__autodocsAuth !== undefined) {
    tryStart();
  }
  document.addEventListener('autodocs-auth-ready', tryStart);
  document.addEventListener('autodocs-page-ready', tryStart);

  document.addEventListener('autodocs-tags-synced', () => {
    if (document.getElementById('documentacoes-list') && window.AUTODOCS_DOCS_CATALOG && window.AutoDocsTags) {
      render();
    }
  });

  window.addEventListener('storage', e => {
    if (
      e.key === 'autodocs.designer.catalogOverrides' ||
      e.key === 'autodocs.tags.docLinks' ||
      e.key === 'autodocs.tags.list'
    ) {
      if (document.getElementById('documentacoes-list') && window.AUTODOCS_DOCS_CATALOG && window.AutoDocsTags) {
        render();
      }
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
    if (document.getElementById('documentacoes-list')) {
      render();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.getElementById('documentacoes-list')) {
      refreshTagsFromServer();
    }
  });

  setInterval(() => {
    if (document.visibilityState !== 'visible' || !document.getElementById('documentacoes-list')) return;
    refreshTagsFromServer();
  }, 30000);
})();
