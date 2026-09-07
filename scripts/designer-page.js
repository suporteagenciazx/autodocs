(function () {
  const SOFISA_ACCENT = '#006157';
  const FIGMA_ICON = '../sistema/icon-figma.svg';
  const PREFS_PREFIX = 'autodocs.designer.prefs.';
  const PAGE_FLAT = 30;
  const PAGE_GROUP = 10;

  let modalStep = 'choose';
  let viewMode = 'active'; // active | arquivo
  let confirmState = null;
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

  function getBasePath() {
    return typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
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
      /* ignore */
    }
    return next;
  }

  function resetPageState() {
    pageState = { flatLimit: PAGE_FLAT, groupLimits: {} };
  }

  function setFlash(message, type) {
    if (!message) return;
    if (window.AutoDocsToast) {
      if (type === 'error') window.AutoDocsToast.error(message);
      else if (type === 'ok') window.AutoDocsToast.ok(message);
      else window.AutoDocsToast.info(message);
    }
  }

  function tagBadgeInlineStyle(hex) {
    if (!hex || typeof hex !== 'string') return '';
    const h = hex.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(h) && !/^#[0-9A-Fa-f]{3}$/.test(h)) return '';
    const full =
      h.length === 4
        ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
        : h;
    return '--tag-accent:' + full + ';';
  }

  function resolveTagForModel(model) {
    if (!window.AutoDocsTags) return { id: '', name: '', accent: SOFISA_ACCENT };
    if (model.isCatalog && model.catalogId) {
      const name = window.AutoDocsTags.tagNameForDoc(model.catalogId);
      const accent = window.AutoDocsTags.accentForDoc(model.catalogId);
      const links = window.AutoDocsTags.getLinks();
      const tagId = links[model.catalogId] || '';
      return { id: tagId, name: name || '', accent: accent || SOFISA_ACCENT };
    }
    if (model.tagId) {
      const tag = window.AutoDocsTags.getTags().find(t => t.id === model.tagId);
      return {
        id: model.tagId,
        name: tag ? tag.name : '',
        accent: tag && tag.accentColor ? tag.accentColor : SOFISA_ACCENT,
      };
    }
    return { id: '', name: '', accent: SOFISA_ACCENT };
  }

  function matchesSearch(model, tagName, q) {
    if (!q) return true;
    const n = q.trim().toLowerCase();
    return (
      model.title.toLowerCase().includes(n) ||
      (model.blurb && model.blurb.toLowerCase().includes(n)) ||
      (tagName && tagName.toLowerCase().includes(n))
    );
  }

  function sourceBadgeHtml(source) {
    if (source === 'figma') {
      return (
        '<div class="designer-card-sources" aria-label="Origem: Figma">' +
        '<span class="designer-source-badge designer-source-badge--figma designer-source-badge--active" title="Importado do Figma">' +
        '<img src="' +
        FIGMA_ICON +
        '" alt="" width="16" height="16">' +
        '</span></div>'
      );
    }
    if (source === 'pdf') {
      return (
        '<div class="designer-card-sources" aria-label="Origem: PDF nativo">' +
        '<span class="designer-source-badge designer-source-badge--pdf designer-source-badge--active" title="Importado de PDF (nativo)">' +
        '<span class="material-symbols-rounded" aria-hidden="true">picture_as_pdf</span>' +
        '</span></div>'
      );
    }
    return (
      '<div class="designer-card-sources" aria-label="Origem: AutoDocs nativo">' +
      '<span class="designer-source-badge designer-source-badge--native designer-source-badge--active" title="Modelo nativo AutoDocs">' +
      '<span class="material-symbols-rounded" aria-hidden="true">edit_document</span>' +
      '</span></div>'
    );
  }

  function buildCardHref(model) {
    if (!model.href) return '';
    let full = getBasePath() + model.href;
    if (!full.endsWith('/')) full += '/';
    return full;
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

  function populateTagFilter() {
    const root = document.getElementById('designer-tag-filter');
    if (!root || !window.AutoDocsTags) return;
    const tags = window.AutoDocsTags.getTags();
    const prefs = loadPrefs();
    const preferredIds = prefs.tagFilterIds;
    const signature = tags.map(t => t.id + ':' + t.name).join('|');
    const validSelected = normalizeTagIds(preferredIds).filter(id => tags.some(t => t.id === id));

    if (root.dataset.tagsSig === signature && root.querySelector('.doc-hub-tag-multi-btn')) {
      syncTagFilterChecks(root, preferredIds, tags);
      populateFigmaTagSelect();
      populatePdfTagSelect();
      return;
    }

    const wasOpen = root.classList.contains('is-open');
    root.innerHTML = '';
    root.classList.add('doc-hub-tag-multiselect');
    root.dataset.tagsSig = signature;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'doc-hub-tag-multi-btn designer-tag-select';
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

    populateFigmaTagSelect();
    populatePdfTagSelect();
  }

  function syncGroupToggleUi(groupByTag) {
    const btn = document.getElementById('designer-group-toggle');
    if (!btn) return;
    btn.classList.toggle('is-active', !!groupByTag);
    btn.setAttribute('aria-pressed', groupByTag ? 'true' : 'false');
    btn.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">' +
      (groupByTag ? 'view_cozy' : 'view_agenda') +
      '</span>' +
      (groupByTag ? 'Agrupado por etiqueta' : 'Agrupar por etiqueta');
  }

  function makeLoadMoreBtn(remaining, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'doc-hub-load-more tags-btn-outline';
    btn.textContent = 'Carregar mais (' + remaining + ')';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function collectFilteredModels(sourceFn, q, tagFilterIds) {
    const filterSet = tagFilterIds && tagFilterIds.length ? new Set(tagFilterIds) : null;
    const out = [];
    sourceFn().forEach(model => {
      const tag = resolveTagForModel(model);
      if (filterSet && !filterSet.has(tag.id)) return;
      if (!matchesSearch(model, tag.name, q)) return;
      out.push({ model, tag });
    });
    return out;
  }

  function renderGroupedModels(listEl, items, mode) {
    const tags = window.AutoDocsTags ? window.AutoDocsTags.getTags() : [];
    const prefs = loadPrefs();
    const collapsed = prefs.collapsedGroups || {};
    const byTag = new Map();
    tags.forEach(tag => byTag.set(tag.id, { tag, items: [] }));
    const untagged = { tag: { id: '__untagged__', name: 'Sem tag', accentColor: '#5c6b73' }, items: [] };

    items.forEach(entry => {
      const tagId = entry.tag && entry.tag.id ? entry.tag.id : '';
      if (tagId && byTag.has(tagId)) byTag.get(tagId).items.push(entry);
      else untagged.items.push(entry);
    });

    const sections = [...byTag.values()].filter(s => s.items.length > 0);
    if (untagged.items.length) sections.push(untagged);

    sections.forEach(section => {
      const groupId = (mode === 'arquivo' ? 'arq:' : '') + (section.tag.id || '__untagged__');
      const limit = pageState.groupLimits[groupId] || PAGE_GROUP;
      const isCollapsed = !!collapsed[groupId];
      const shown = section.items.slice(0, limit);
      const remaining = Math.max(0, section.items.length - shown.length);

      const group = document.createElement('section');
      group.className = 'doc-hub-group' + (isCollapsed ? ' is-collapsed' : '');
      group.style.setProperty('--tag-accent', section.tag.accentColor || section.tag.accent || SOFISA_ACCENT);

      const header = document.createElement('div');
      header.className = 'doc-hub-group-header';

      const collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className = 'doc-hub-group-collapse';
      collapseBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expandir agrupamento' : 'Recolher agrupamento');
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
        section.items.length +
        ')</span>';

      header.appendChild(collapseBtn);
      header.appendChild(title);
      group.appendChild(header);

      const body = document.createElement('div');
      body.className = 'doc-hub-group-body';
      body.hidden = isCollapsed;

      const grid = document.createElement('div');
      grid.className = 'doc-hub-grid designer-grid';
      shown.forEach(entry => grid.appendChild(createCard(entry.model, mode)));
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

  function renderFlatModels(listEl, items, mode, gridId) {
    const limit = pageState.flatLimit || PAGE_FLAT;
    const shown = items.slice(0, limit);
    const remaining = Math.max(0, items.length - shown.length);
    const grid = document.createElement('div');
    if (gridId) grid.id = gridId;
    grid.className = 'doc-hub-grid designer-grid';
    shown.forEach(entry => grid.appendChild(createCard(entry.model, mode)));
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

  function populateFigmaTagSelect() {
    const select = document.getElementById('designer-figma-tag');
    if (!select || !window.AutoDocsTags) return;
    const current = select.value;
    const tags = window.AutoDocsTags.getTags();
    select.innerHTML = '<option value="">— Selecione —</option>';
    tags.forEach(tag => {
      const opt = document.createElement('option');
      opt.value = tag.id;
      opt.textContent = tag.name;
      select.appendChild(opt);
    });
    if (current && tags.some(t => t.id === current)) {
      select.value = current;
    } else if (tags.length === 1) {
      select.value = tags[0].id;
    }
  }

  function populatePdfTagSelect() {
    const select = document.getElementById('designer-pdf-tag');
    if (!select || !window.AutoDocsTags) return;
    const current = select.value;
    const tags = window.AutoDocsTags.getTags();
    select.innerHTML = '<option value="">— Selecione —</option>';
    tags.forEach(tag => {
      const opt = document.createElement('option');
      opt.value = tag.id;
      opt.textContent = tag.name;
      select.appendChild(opt);
    });
    if (current && tags.some(t => t.id === current)) {
      select.value = current;
    } else if (tags.length === 1) {
      select.value = tags[0].id;
    }
  }

  function syncFigmaTagMode() {
    const modeEl = document.getElementById('designer-figma-tag-mode');
    const existingWrap = document.getElementById('designer-figma-tag-existing-wrap');
    const newWrap = document.getElementById('designer-figma-tag-new-wrap');
    const isNew = modeEl && modeEl.value === 'new';
    if (existingWrap) existingWrap.hidden = !!isNew;
    if (newWrap) newWrap.hidden = !isNew;
  }

  function syncPdfTagMode() {
    const modeEl = document.getElementById('designer-pdf-tag-mode');
    const existingWrap = document.getElementById('designer-pdf-tag-existing-wrap');
    const newWrap = document.getElementById('designer-pdf-tag-new-wrap');
    const isNew = modeEl && modeEl.value === 'new';
    if (existingWrap) existingWrap.hidden = !!isNew;
    if (newWrap) newWrap.hidden = !isNew;
  }

  function updateArquivoBadge() {
    const badge = document.getElementById('designer-arquivo-count');
    const btn = document.getElementById('designer-btn-arquivo');
    if (!window.AutoDocsDesignerModels) return;
    const n = window.AutoDocsDesignerModels.getArchivedModels().length;
    if (badge) {
      badge.textContent = String(n);
      badge.hidden = n === 0;
    }
    if (btn) btn.classList.toggle('is-active', viewMode === 'arquivo');
  }

  function setViewMode(mode) {
    viewMode = mode === 'arquivo' ? 'arquivo' : 'active';
    resetPageState();
    const active = document.getElementById('designer-view-active');
    const arquivo = document.getElementById('designer-view-arquivo');
    const btnArquivo = document.getElementById('designer-btn-arquivo');
    const toolbar = document.querySelector('.designer-toolbar');
    if (active) active.hidden = viewMode === 'arquivo';
    if (arquivo) arquivo.hidden = viewMode !== 'arquivo';
    if (toolbar) toolbar.hidden = viewMode === 'arquivo';
    if (btnArquivo) {
      btnArquivo.setAttribute('aria-pressed', viewMode === 'arquivo' ? 'true' : 'false');
      btnArquivo.classList.toggle('is-active', viewMode === 'arquivo');
    }
    render();
  }

  function createCard(model, mode) {
    const tag = resolveTagForModel(model);
    const href = buildCardHref(model);
    const tagStyle = tagBadgeInlineStyle(tag.accent) || tagBadgeInlineStyle(SOFISA_ACCENT);
    const wrap = document.createElement('div');
    wrap.className = 'doc-hub-card designer-card';
    wrap.dataset.modelId = model.id;

    const main = href && mode === 'active' ? document.createElement('a') : document.createElement('div');
    if (href && mode === 'active') {
      main.href = href;
      main.className = 'designer-card-link';
    }

    main.innerHTML =
      '<div class="doc-hub-card-preview doc-hub-card-preview--icon designer-card-preview">' +
      sourceBadgeHtml(model.source) +
      '<span class="material-symbols-rounded doc-hub-card-doc-icon" aria-hidden="true">description</span>' +
      '</div>' +
      '<div class="doc-hub-card-body">' +
      '<span class="doc-hub-card-title">' +
      escapeHtml(model.title) +
      '</span>' +
      (model.blurb ? '<p class="doc-hub-card-blurb designer-card-blurb">' + escapeHtml(model.blurb) + '</p>' : '') +
      '<span class="doc-hub-card-tag" style="' +
      tagStyle +
      '">' +
      escapeHtml(tag.name || '—') +
      '</span>' +
      '</div>';

    const actions = document.createElement('div');
    actions.className = 'designer-card-actions';
    actions.style.cssText = 'padding:0 12px 12px;box-sizing:border-box;';

    if (mode === 'active') {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'designer-card-action designer-card-action--icon';
      editBtn.title = 'Editar';
      editBtn.setAttribute('aria-label', 'Editar documentação');
      editBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">edit</span>';
      editBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        openEditModal(model);
      });
      actions.appendChild(editBtn);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'designer-card-action';
      archiveBtn.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">inventory_2</span>Arquivar';
      archiveBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.AutoDocsDesignerModels.archiveModel(model.id)) return;
        setFlash('“' + model.title + '” movida para o arquivo.', 'ok');
        render();
      });
      actions.appendChild(archiveBtn);
    } else {
      const restoreBtn = document.createElement('button');
      restoreBtn.type = 'button';
      restoreBtn.className = 'designer-card-action';
      restoreBtn.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">unarchive</span>Restaurar';
      restoreBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.AutoDocsDesignerModels.restoreModel(model.id)) return;
        setFlash('“' + model.title + '” restaurada.', 'ok');
        render();
      });
      actions.appendChild(restoreBtn);

      if (!model.isCatalog) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'designer-card-action designer-card-action--danger';
        delBtn.innerHTML =
          '<span class="material-symbols-rounded" aria-hidden="true">delete_forever</span>Excluir';
        delBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          openConfirmDelete(model);
        });
        actions.appendChild(delBtn);
      }
    }

    wrap.appendChild(main);
    wrap.appendChild(actions);
    return wrap;
  }

  function render() {
    if (!window.AutoDocsDesignerModels) return;

    const catalog = window.AUTODOCS_DOCS_CATALOG || [];
    if (window.AutoDocsTags) {
      window.AutoDocsTags.ensureDefaults(catalog.map(d => d.id));
    }

    const search = document.getElementById('designer-search');
    const q = search ? search.value : '';
    const prefs = loadPrefs();
    const groupByTag = !!prefs.groupByTag;
    syncGroupToggleUi(groupByTag);
    populateTagFilter();

    const filterKey = [viewMode, groupByTag ? '1' : '0', q, (prefs.tagFilterIds || []).join(',')].join('|');
    if (filterKey !== lastFilterKey) {
      lastFilterKey = filterKey;
      resetPageState();
    }

    if (viewMode === 'arquivo') {
      const listEl = document.getElementById('designer-arquivo-list');
      const empty = document.getElementById('designer-arquivo-empty');
      if (!listEl) return;
      const items = collectFilteredModels(
        () => window.AutoDocsDesignerModels.getArchivedModels(),
        q,
        prefs.tagFilterIds
      );
      listEl.innerHTML = '';
      if (groupByTag) renderGroupedModels(listEl, items, 'arquivo');
      else renderFlatModels(listEl, items, 'arquivo', 'designer-arquivo-grid');
      if (empty) empty.hidden = items.length > 0;
    } else {
      const listEl = document.getElementById('designer-list');
      const empty = document.getElementById('designer-empty');
      if (!listEl) return;
      const items = collectFilteredModels(
        () => window.AutoDocsDesignerModels.getAllModels(),
        q,
        prefs.tagFilterIds
      );
      listEl.innerHTML = '';
      if (groupByTag) renderGroupedModels(listEl, items, 'active');
      else renderFlatModels(listEl, items, 'active', 'designer-grid');
      if (empty) empty.hidden = items.length > 0;
    }

    updateArquivoBadge();
  }

  function openConfirmDelete(model) {
    confirmState = { model };
    const bg = document.getElementById('designer-confirm-bg');
    const title = document.getElementById('designer-confirm-title');
    const text = document.getElementById('designer-confirm-text');
    if (title) title.textContent = 'Eliminar definitivamente';
    if (text) {
      const extra = window.AutoDocsDesignerModels.isImportedHref(model.href)
        ? ' Os ficheiros em disco também serão removidos.'
        : '';
      text.textContent =
        'Tem a certeza de que deseja eliminar “' +
        model.title +
        '”? Esta ação não pode ser desfeita.' +
        extra;
    }
    if (bg) {
      bg.classList.add('is-open');
      bg.setAttribute('aria-hidden', 'false');
    }
  }

  function closeConfirm() {
    confirmState = null;
    const bg = document.getElementById('designer-confirm-bg');
    if (bg) {
      bg.classList.remove('is-open');
      bg.setAttribute('aria-hidden', 'true');
    }
  }

  function populateEditTagSelect(selectedId) {
    const select = document.getElementById('designer-edit-tag');
    if (!select || !window.AutoDocsTags) return;
    const tags = window.AutoDocsTags.getTags();
    select.innerHTML = '<option value="">— Selecione —</option>';
    tags.forEach(tag => {
      const opt = document.createElement('option');
      opt.value = tag.id;
      opt.textContent = tag.name;
      select.appendChild(opt);
    });
    if (selectedId && tags.some(t => t.id === selectedId)) {
      select.value = selectedId;
    } else if (!selectedId && tags.length === 1) {
      select.value = tags[0].id;
    }
  }

  function openEditModal(model) {
    const bg = document.getElementById('designer-edit-bg');
    const idEl = document.getElementById('designer-edit-id');
    const nameEl = document.getElementById('designer-edit-name');
    const blurbEl = document.getElementById('designer-edit-blurb');
    const err = document.getElementById('designer-edit-error');
    if (!bg || !idEl || !nameEl || !blurbEl) return;

    const tag = resolveTagForModel(model);
    idEl.value = model.id;
    nameEl.value = model.title || '';
    blurbEl.value = model.blurb || '';
    populateEditTagSelect(tag.id || '');
    if (err) {
      err.hidden = true;
      err.textContent = '';
    }
    bg.classList.add('is-open');
    bg.setAttribute('aria-hidden', 'false');
    setTimeout(() => nameEl.focus(), 40);
  }

  function closeEditModal() {
    const bg = document.getElementById('designer-edit-bg');
    if (!bg) return;
    bg.classList.remove('is-open');
    bg.setAttribute('aria-hidden', 'true');
  }

  async function saveEditModal(e) {
    if (e) e.preventDefault();
    const idEl = document.getElementById('designer-edit-id');
    const nameEl = document.getElementById('designer-edit-name');
    const blurbEl = document.getElementById('designer-edit-blurb');
    const tagEl = document.getElementById('designer-edit-tag');
    const err = document.getElementById('designer-edit-error');
    const submit = document.getElementById('designer-edit-submit');
    if (!idEl || !nameEl || !window.AutoDocsDesignerModels) return;

    const modelId = idEl.value;
    const title = nameEl.value.trim();
    const blurb = blurbEl ? blurbEl.value.trim() : '';
    const tagId = tagEl && tagEl.value ? tagEl.value : '';

    if (err) {
      err.hidden = true;
      err.textContent = '';
    }

    if (!title) {
      if (err) {
        err.textContent = 'Informe o nome da documentação.';
        err.hidden = false;
      }
      return;
    }
    if (!tagId) {
      if (err) {
        err.textContent = 'Selecione uma tag.';
        err.hidden = false;
      }
      return;
    }

    if (submit) submit.disabled = true;
    try {
      const result = window.AutoDocsDesignerModels.updateModelMeta(modelId, {
        title,
        blurb,
        tagId,
      });
      if (!result || !result.ok) {
        if (err) {
          err.textContent = (result && result.error) || 'Não foi possível guardar.';
          err.hidden = false;
        }
        return;
      }
      if (result.catalog && window.AutoDocsTags && typeof window.AutoDocsTags.saveToServer === 'function') {
        await window.AutoDocsTags.saveToServer(getBasePath());
      }
      closeEditModal();
      setFlash('Documentação atualizada.', 'ok');
      populateTagFilter();
      render();
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async function confirmPermanentDelete() {
    if (!confirmState || !confirmState.model) {
      closeConfirm();
      return;
    }
    const model = confirmState.model;
    const result = window.AutoDocsDesignerModels.permanentlyDelete(model.id);
    if (!result || !result.ok) {
      setFlash((result && result.error) || 'Não foi possível eliminar.', 'error');
      closeConfirm();
      render();
      return;
    }

    if (window.AutoDocsDesignerModels.isImportedHref(model.href)) {
      try {
        const res = await fetch(getBasePath() + 'api/autodocs-designer-delete.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ href: model.href }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setFlash(
            (data && data.error) ||
              'Removida do arquivo, mas falhou a eliminação dos ficheiros.',
            'error'
          );
          closeConfirm();
          render();
          return;
        }
      } catch (_) {
        setFlash('Removida do arquivo, mas falhou a eliminação dos ficheiros (rede).', 'error');
        closeConfirm();
        render();
        return;
      }
    }

    setFlash('“' + model.title + '” eliminada definitivamente.', 'ok');
    closeConfirm();
    render();
  }

  function setModalStep(step) {
    modalStep = step;
    const track = document.getElementById('designer-modal-track');
    if (track) {
      track.setAttribute('data-step', step);

      // O CSS desliza o carrossel a partir da posição do painel no DOM, por
      // isso acrescentar um passo não exige tocar nas folhas de estilo.
      const paineis = [...track.querySelectorAll('.designer-modal-panel')];
      const indice = paineis.findIndex(p => p.getAttribute('data-panel') === step);
      track.style.setProperty('--paineis', String(paineis.length));
      track.style.setProperty('--painel', String(indice < 0 ? 0 : indice));
    }
    const loadingText = document.getElementById('designer-loading-text');
    const loadingHint = document.getElementById('designer-loading-hint');
    if (loadingText && step === 'loading') {
      if (loadingText.dataset.mode === 'pdf') {
        loadingText.textContent = 'A importar PDF…';
        if (loadingHint) {
          loadingHint.textContent = 'A extrair texto, mapear placeholders e montar o modelo nativo.';
        }
      } else {
        loadingText.textContent = 'A importar pacote Figma…';
        if (loadingHint) {
          loadingHint.textContent = 'A extrair o ZIP, ler o .fig e montar o documento.';
        }
      }
    }
  }

  function resetModalForms() {
    const figmaForm = document.getElementById('designer-figma-form');
    const pdfForm = document.getElementById('designer-pdf-form');
    const nativeForm = document.getElementById('designer-native-form');
    const err = document.getElementById('designer-figma-error');
    const pdfErr = document.getElementById('designer-pdf-error');
    const tagMode = document.getElementById('designer-figma-tag-mode');
    const pdfTagMode = document.getElementById('designer-pdf-tag-mode');
    if (figmaForm) figmaForm.reset();
    if (pdfForm) pdfForm.reset();
    if (nativeForm) nativeForm.reset();
    if (tagMode) tagMode.value = 'existing';
    if (pdfTagMode) pdfTagMode.value = 'existing';
    const lastColor = document.getElementById('designer-pdf-last-color');
    if (lastColor) lastColor.value = '#ffffff';
    syncFigmaTagMode();
    syncPdfTagMode();
    populateFigmaTagSelect();
    populatePdfTagSelect();
    if (err) {
      err.hidden = true;
      err.textContent = '';
    }
    if (pdfErr) {
      pdfErr.hidden = true;
      pdfErr.textContent = '';
    }
  }

  function openModal() {
    const bg = document.getElementById('designer-modal-bg');
    if (!bg) return;
    resetModalForms();
    setModalStep('choose');
    bg.classList.add('is-open');
    bg.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    const bg = document.getElementById('designer-modal-bg');
    if (!bg) return;
    bg.classList.remove('is-open');
    bg.setAttribute('aria-hidden', 'true');
    setModalStep('choose');
    resetModalForms();
  }

  function getSelectedTagId() {
    const tagFilter = document.getElementById('designer-tag-filter');
    return tagFilter && tagFilter.value ? tagFilter.value : '';
  }

  async function resolveFigmaTagForImport() {
    const modeEl = document.getElementById('designer-figma-tag-mode');
    const isNew = modeEl && modeEl.value === 'new';
    if (isNew) {
      const nameEl = document.getElementById('designer-figma-tag-new-name');
      const colorEl = document.getElementById('designer-figma-tag-new-color');
      const newName = nameEl ? nameEl.value.trim() : '';
      if (!newName) {
        return { error: 'Informe o nome da nova tag.' };
      }
      if (window.AutoDocsTags) {
        const existing = window.AutoDocsTags.getTags().find(
          t => t.name.toLowerCase() === newName.toLowerCase()
        );
        if (existing) {
          return { tagId: existing.id };
        }
        const created = window.AutoDocsTags.createTag(
          newName,
          colorEl ? colorEl.value : ''
        );
        if (created) {
          if (typeof window.AutoDocsTags.saveToServer === 'function') {
            await window.AutoDocsTags.saveToServer(getBasePath());
          }
          populateTagFilter();
          return { tagId: created };
        }
      }
      return {
        newTagName: newName,
        newTagColor: colorEl ? colorEl.value : '#5c6b73',
      };
    }
    const tagEl = document.getElementById('designer-figma-tag');
    const tagId = tagEl && tagEl.value ? tagEl.value : '';
    if (!tagId) {
      return { error: 'Selecione uma tag ou crie uma nova.' };
    }
    return { tagId };
  }

  async function resolvePdfTagForImport() {
    const modeEl = document.getElementById('designer-pdf-tag-mode');
    const isNew = modeEl && modeEl.value === 'new';
    if (isNew) {
      const nameEl = document.getElementById('designer-pdf-tag-new-name');
      const colorEl = document.getElementById('designer-pdf-tag-new-color');
      const newName = nameEl ? nameEl.value.trim() : '';
      if (!newName) {
        return { error: 'Informe o nome da nova tag.' };
      }
      if (window.AutoDocsTags) {
        const existing = window.AutoDocsTags.getTags().find(
          t => t.name.toLowerCase() === newName.toLowerCase()
        );
        if (existing) {
          return { tagId: existing.id };
        }
        const created = window.AutoDocsTags.createTag(
          newName,
          colorEl ? colorEl.value : ''
        );
        if (created) {
          if (typeof window.AutoDocsTags.saveToServer === 'function') {
            await window.AutoDocsTags.saveToServer(getBasePath());
          }
          populateTagFilter();
          return { tagId: created };
        }
      }
      return {
        newTagName: newName,
        newTagColor: colorEl ? colorEl.value : '#5c6b73',
      };
    }
    const tagEl = document.getElementById('designer-pdf-tag');
    const tagId = tagEl && tagEl.value ? tagEl.value : '';
    if (!tagId) {
      return { error: 'Selecione uma tag ou crie uma nova.' };
    }
    return { tagId };
  }

  async function importPdfNative() {
    const submit = document.getElementById('designer-pdf-submit');
    const err = document.getElementById('designer-pdf-error');
    const titleEl = document.getElementById('designer-pdf-title');
    const pdfEl = document.getElementById('designer-pdf-file');
    const capaEl = document.getElementById('designer-pdf-capa');
    const mdaEl = document.getElementById('designer-pdf-mda');
    const colorEl = document.getElementById('designer-pdf-last-color');
    const loadingText = document.getElementById('designer-loading-text');
    const title = titleEl ? titleEl.value.trim() : '';
    const pdfFile = pdfEl && pdfEl.files && pdfEl.files[0] ? pdfEl.files[0] : null;

    if (!title) {
      if (err) {
        err.textContent = 'Informe o nome da documentação.';
        err.hidden = false;
      }
      return;
    }
    if (!pdfFile) {
      if (err) {
        err.textContent = 'Selecione o ficheiro PDF.';
        err.hidden = false;
      }
      return;
    }

    const tagResolved = await resolvePdfTagForImport();
    if (tagResolved.error) {
      if (err) {
        err.textContent = tagResolved.error;
        err.hidden = false;
      }
      return;
    }

    if (err) {
      err.hidden = true;
      err.textContent = '';
    }
    if (loadingText) loadingText.dataset.mode = 'pdf';
    setModalStep('loading');
    if (submit) submit.disabled = true;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('pdf', pdfFile);
    formData.append('lastPageColor', colorEl && colorEl.value ? colorEl.value : '#ffffff');
    if (capaEl && capaEl.files && capaEl.files[0]) formData.append('capa', capaEl.files[0]);
    if (mdaEl && mdaEl.files && mdaEl.files[0]) formData.append('mda', mdaEl.files[0]);
    if (tagResolved.tagId) formData.append('tagId', tagResolved.tagId);
    if (tagResolved.newTagName) {
      formData.append('newTagName', tagResolved.newTagName);
      formData.append('newTagColor', tagResolved.newTagColor || '#5c6b73');
    }

    try {
      const res = await fetch(getBasePath() + 'api/autodocs-pdf-native-import.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (err) {
          err.textContent = (data && data.error) || 'Não foi possível importar o PDF.';
          err.hidden = false;
        }
        setModalStep('pdf');
        return;
      }
      if (data.model && window.AutoDocsDesignerModels) {
        window.AutoDocsDesignerModels.upsertModel(data.model);
      }
      if (data.model && data.model.tagId && window.AutoDocsTags && typeof window.AutoDocsTags.setDocTag === 'function') {
        const docId = 'importado:' + (data.slug || '');
        try {
          window.AutoDocsTags.setDocTag(docId, data.model.tagId);
          if (typeof window.AutoDocsTags.saveToServer === 'function') {
            await window.AutoDocsTags.saveToServer(getBasePath());
          }
        } catch (_) {
          /* ignore */
        }
      }
      closeModal();
      setViewMode('active');
      const pagesN = data.pagesCount != null ? data.pagesCount : 0;
      const fieldsN = data.fieldsCount != null ? data.fieldsCount : 0;
      let flash = 'PDF importado: ' + pagesN + ' página(s), ' + fieldsN + ' campo(s).';
      if (Array.isArray(data.warnings) && data.warnings.length) {
        flash += ' Aviso: ' + data.warnings[0];
      }
      setFlash(flash, 'ok');
      if (data.href) {
        const href = buildCardHref({ href: data.href });
        if (href) {
          location.href = href;
        }
      }
    } catch (_) {
      if (err) {
        err.textContent = 'Falha de rede ao importar o PDF.';
        err.hidden = false;
      }
      setModalStep('pdf');
    } finally {
      if (submit) submit.disabled = false;
      if (loadingText) delete loadingText.dataset.mode;
    }
  }

  async function importFigmaPackage() {
    const loadingText = document.getElementById('designer-loading-text');
    if (loadingText) loadingText.dataset.mode = 'figma';
    const submit = document.getElementById('designer-figma-submit');
    const err = document.getElementById('designer-figma-error');
    const titleEl = document.getElementById('designer-figma-title');
    const zipEl = document.getElementById('designer-figma-zip');
    const title = titleEl ? titleEl.value.trim() : '';
    const zipFile = zipEl && zipEl.files && zipEl.files[0] ? zipEl.files[0] : null;

    if (!title) {
      if (err) {
        err.textContent = 'Informe o nome da documentação.';
        err.hidden = false;
      }
      return;
    }
    if (!zipFile) {
      if (err) {
        err.textContent = 'Selecione o ficheiro ZIP.';
        err.hidden = false;
      }
      return;
    }

    const tagResolved = await resolveFigmaTagForImport();
    if (tagResolved.error) {
      if (err) {
        err.textContent = tagResolved.error;
        err.hidden = false;
      }
      return;
    }

    if (err) {
      err.hidden = true;
      err.textContent = '';
    }
    setModalStep('loading');
    if (submit) submit.disabled = true;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('package', zipFile);
    if (tagResolved.tagId) formData.append('tagId', tagResolved.tagId);
    if (tagResolved.newTagName) {
      formData.append('newTagName', tagResolved.newTagName);
      formData.append('newTagColor', tagResolved.newTagColor || '#5c6b73');
    }

    try {
      const res = await fetch(getBasePath() + 'api/autodocs-figma-package-import.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (err) {
          err.textContent = (data && data.error) || 'Não foi possível importar o pacote.';
          err.hidden = false;
        }
        setModalStep('figma');
        return;
      }
      if (data.model && window.AutoDocsDesignerModels) {
        window.AutoDocsDesignerModels.upsertModel(data.model);
      }
      closeModal();
      setViewMode('active');
      const pagesN = data.pagesCount != null ? data.pagesCount : 0;
      const fieldsN = data.fieldsCount != null ? data.fieldsCount : 0;
      let flash = 'Importado: ' + pagesN + ' página(s), ' + fieldsN + ' campo(s).';
      if (Array.isArray(data.warnings) && data.warnings.length) {
        flash += ' Aviso: ' + data.warnings[0];
      }
      setFlash(flash, 'ok');
      if (data.href) {
        const href = buildCardHref({ href: data.href });
        if (href && window.confirm('Abrir o documento importado agora?')) {
          location.href = href;
        }
      }
    } catch (_) {
      if (err) {
        err.textContent = 'Falha de rede ao importar o pacote.';
        err.hidden = false;
      }
      setModalStep('figma');
    } finally {
      if (submit) submit.disabled = false;
      if (loadingText) delete loadingText.dataset.mode;
    }
  }

  function handleNativeCreate(title) {
    const tagId = getSelectedTagId();
    window.AutoDocsDesignerModels.addModel({
      title: title.trim(),
      blurb: 'Modelo nativo — editor em breve.',
      source: 'native',
      tagId,
    });
    closeModal();
    setViewMode('active');
    setFlash('Modelo nativo criado.', 'ok');
  }

  function bindEvents() {
    const search = document.getElementById('designer-search');
    const groupBtn = document.getElementById('designer-group-toggle');
    const btnNova = document.getElementById('designer-btn-nova');
    const btnArquivo = document.getElementById('designer-btn-arquivo');
    const modalBg = document.getElementById('designer-modal-bg');
    const confirmBg = document.getElementById('designer-confirm-bg');
    const confirmOk = document.getElementById('designer-confirm-ok');
    const confirmCancel = document.getElementById('designer-confirm-cancel');
    const editBg = document.getElementById('designer-edit-bg');
    const editForm = document.getElementById('designer-edit-form');
    const editCancel = document.getElementById('designer-edit-cancel');
    const figmaForm = document.getElementById('designer-figma-form');
    const pdfForm = document.getElementById('designer-pdf-form');
    const nativeForm = document.getElementById('designer-native-form');
    const tagMode = document.getElementById('designer-figma-tag-mode');
    const pdfTagMode = document.getElementById('designer-pdf-tag-mode');

    if (search && !search.dataset.designerBound) {
      search.dataset.designerBound = '1';
      search.addEventListener('input', () => {
        resetPageState();
        render();
      });
    }
    if (groupBtn && !groupBtn.dataset.designerBound) {
      groupBtn.dataset.designerBound = '1';
      groupBtn.addEventListener('click', () => {
        const prefs = loadPrefs();
        savePrefs({ groupByTag: !prefs.groupByTag });
        resetPageState();
        render();
      });
    }
    if (btnNova && !btnNova.dataset.designerBound) {
      btnNova.dataset.designerBound = '1';
      btnNova.addEventListener('click', openModal);
    }
    if (btnArquivo && !btnArquivo.dataset.designerBound) {
      btnArquivo.dataset.designerBound = '1';
      btnArquivo.addEventListener('click', () => {
        setViewMode(viewMode === 'arquivo' ? 'active' : 'arquivo');
      });
    }
    const btnArquivoVoltar = document.getElementById('designer-btn-arquivo-voltar');
    if (btnArquivoVoltar && !btnArquivoVoltar.dataset.designerBound) {
      btnArquivoVoltar.dataset.designerBound = '1';
      btnArquivoVoltar.addEventListener('click', e => {
        e.preventDefault();
        setViewMode('active');
      });
    }
    if (confirmOk && !confirmOk.dataset.designerBound) {
      confirmOk.dataset.designerBound = '1';
      confirmOk.addEventListener('click', () => confirmPermanentDelete());
    }
    if (confirmCancel && !confirmCancel.dataset.designerBound) {
      confirmCancel.dataset.designerBound = '1';
      confirmCancel.addEventListener('click', closeConfirm);
    }
    if (confirmBg && !confirmBg.dataset.designerBound) {
      confirmBg.dataset.designerBound = '1';
      confirmBg.addEventListener('click', e => {
        if (e.target === confirmBg) closeConfirm();
      });
    }
    if (editForm && !editForm.dataset.designerBound) {
      editForm.dataset.designerBound = '1';
      editForm.addEventListener('submit', saveEditModal);
    }
    if (editCancel && !editCancel.dataset.designerBound) {
      editCancel.dataset.designerBound = '1';
      editCancel.addEventListener('click', closeEditModal);
    }
    if (editBg && !editBg.dataset.designerBound) {
      editBg.dataset.designerBound = '1';
      editBg.addEventListener('click', e => {
        if (e.target === editBg) closeEditModal();
      });
    }
    if (modalBg && !modalBg.dataset.designerBound) {
      modalBg.dataset.designerBound = '1';
      modalBg.addEventListener('click', e => {
        if (e.target === modalBg && modalStep !== 'loading') closeModal();
      });
      modalBg.querySelectorAll('[data-goto]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (modalStep === 'loading') return;
          setModalStep(btn.getAttribute('data-goto') || 'choose');
        });
      });
      modalBg.querySelectorAll('.designer-modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
          if (modalStep !== 'loading') closeModal();
        });
      });
    }
    if (tagMode && !tagMode.dataset.designerBound) {
      tagMode.dataset.designerBound = '1';
      tagMode.addEventListener('change', syncFigmaTagMode);
    }
    if (pdfTagMode && !pdfTagMode.dataset.designerBound) {
      pdfTagMode.dataset.designerBound = '1';
      pdfTagMode.addEventListener('change', syncPdfTagMode);
    }
    if (pdfForm && !pdfForm.dataset.designerBound) {
      pdfForm.dataset.designerBound = '1';
      pdfForm.addEventListener('submit', e => {
        e.preventDefault();
        importPdfNative();
      });
    }
    if (figmaForm && !figmaForm.dataset.designerBound) {
      figmaForm.dataset.designerBound = '1';
      figmaForm.addEventListener('submit', e => {
        e.preventDefault();
        importFigmaPackage();
      });
    }
    if (nativeForm && !nativeForm.dataset.designerBound) {
      nativeForm.dataset.designerBound = '1';
      nativeForm.addEventListener('submit', e => {
        e.preventDefault();
        const titleEl = document.getElementById('designer-native-title');
        const title = titleEl ? titleEl.value : '';
        if (!title || !title.trim()) return;
        handleNativeCreate(title);
      });
    }
  }

  async function start() {
    const grid = document.getElementById('designer-grid');
    if (!grid) return;
    const firstInit = grid.dataset.pageInited !== '1';
    if (firstInit) {
      grid.dataset.pageInited = '1';
      if (window.AutoDocsTags && typeof window.AutoDocsTags.syncFromServer === 'function') {
        try {
          await window.AutoDocsTags.syncFromServer(getBasePath());
        } catch (_) {
          /* usa localStorage */
        }
      }
    }
    populateTagFilter();
    bindEvents();
    render();
  }

  function tryStart() {
    if (document.getElementById('designer-grid')) start();
  }

  if (!window.__autodocsDesignerVoltarBound) {
    window.__autodocsDesignerVoltarBound = true;
    document.addEventListener('click', e => {
      if (!e.target.closest('#designer-btn-arquivo-voltar')) return;
      if (!document.getElementById('designer-grid')) return;
      e.preventDefault();
      setViewMode('active');
    });
  }

  document.addEventListener('autodocs-page-ready', e => {
    if (!document.getElementById('designer-grid')) return;
    setViewMode('active');
    tryStart();
  });

  document.addEventListener('autodocs-tags-synced', () => {
    if (!document.getElementById('designer-grid')) return;
    populateTagFilter();
    render();
  });

  if (window.__autodocsAuth !== undefined) {
    tryStart();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryStart);
  } else {
    tryStart();
  }
  document.addEventListener('autodocs-auth-ready', tryStart);
})();
