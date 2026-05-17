(function () {
  const SOFISA_ACCENT = '#006157';
  const USO_GERAL_TAG_ID = 'tag-uso-geral';

  let vincularModal = { tagId: '', tagName: '', search: '', view: 'cards' };

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

  function normalizePickerHex(hex) {
    if (!hex || typeof hex !== 'string') return SOFISA_ACCENT;
    const t = hex.trim();
    if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
      const r = t[1];
      const g = t[2];
      const b = t[3];
      return '#' + r + r + g + g + b + b;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    return SOFISA_ACCENT;
  }

  function setFlash(message, type) {
    const el = document.getElementById('tags-flash');
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
    el.className = 'tags-flash' + (type === 'error' ? ' tags-flash--error' : type === 'ok' ? ' tags-flash--ok' : '');
  }

  async function persistToServer(successMessage) {
    if (!window.AutoDocsTags || typeof window.AutoDocsTags.saveToServer !== 'function') {
      setFlash('Serviço de tags indisponível.', 'error');
      return false;
    }
    window.AutoDocsTags.clearLastPushError && window.AutoDocsTags.clearLastPushError();
    const result = await window.AutoDocsTags.saveToServer(getBasePath());
    if (result && result.ok) {
      setFlash(successMessage || 'Alterações gravadas no servidor.', 'ok');
      return true;
    }
    const msg =
      (result && result.error) ||
      (window.AutoDocsTags.getLastPushError && window.AutoDocsTags.getLastPushError()) ||
      'Não foi possível gravar no servidor.';
    setFlash(msg, 'error');
    return false;
  }

  function updatePreview() {
    const nome = document.getElementById('tags-modal-nome');
    const textCor = document.getElementById('tags-modal-cor-text');
    const picker = document.getElementById('tags-modal-cor');
    const swatch = document.getElementById('tags-preview-swatch');
    const label = document.getElementById('tags-preview-label');
    const hex = normalizePickerHex(textCor ? textCor.value : picker ? picker.value : SOFISA_ACCENT);
    if (swatch) swatch.style.backgroundColor = hex;
    if (label) label.textContent = (nome && nome.value.trim()) || 'Pré-visualização';
    if (label) label.style.color = hex;
  }

  function openEditModal(mode, tag) {
    const bg = document.getElementById('tags-modal-bg');
    const title = document.getElementById('tags-modal-title');
    const idEl = document.getElementById('tags-edit-id');
    const nome = document.getElementById('tags-modal-nome');
    const picker = document.getElementById('tags-modal-cor');
    const textCor = document.getElementById('tags-modal-cor-text');
    const isEdit = mode === 'edit' && tag;
    if (title) title.textContent = isEdit ? 'Editar tag' : 'Nova tag';
    if (idEl) idEl.value = isEdit ? tag.id : '';
    if (nome) nome.value = isEdit ? tag.name : '';
    const accent = normalizePickerHex(isEdit ? tag.accentColor : SOFISA_ACCENT);
    if (picker) picker.value = accent;
    if (textCor) textCor.value = accent;
    updatePreview();
    if (bg) {
      bg.classList.add('is-open');
      bg.setAttribute('aria-hidden', 'false');
    }
    if (nome) nome.focus();
  }

  function closeEditModal() {
    const bg = document.getElementById('tags-modal-bg');
    if (bg) {
      bg.classList.remove('is-open');
      bg.setAttribute('aria-hidden', 'true');
    }
  }

  function closeVincularModal() {
    const bg = document.getElementById('tags-vincular-modal-bg');
    if (bg) {
      bg.classList.remove('is-open');
      bg.setAttribute('aria-hidden', 'true');
    }
    vincularModal.tagId = '';
  }

  function openVincularModal(tag) {
    if (!tag || !window.AUTODOCS_DOCS_CATALOG) return;
    vincularModal = {
      tagId: tag.id,
      tagName: tag.name,
      search: '',
      view: vincularModal.view || 'cards',
    };
    const sub = document.getElementById('tags-vincular-modal-sub');
    const title = document.getElementById('tags-vincular-modal-title');
    if (title) title.textContent = 'Documentações da tag';
    if (sub) {
      sub.textContent =
        tag.name + ' — vincule cada documentação a esta tag (desvincular envia para Uso Geral).';
    }
    const searchEl = document.getElementById('tags-vincular-search');
    if (searchEl) searchEl.value = '';
    const bg = document.getElementById('tags-vincular-modal-bg');
    if (bg) {
      bg.classList.add('is-open');
      bg.setAttribute('aria-hidden', 'false');
    }
    renderVincularDocs();
  }

  function renderVincularDocs() {
    const container = document.getElementById('tags-vincular-container');
    if (!container || !window.AutoDocsTags || !window.AUTODOCS_DOCS_CATALOG) return;
    const tagId = vincularModal.tagId;
    const links = window.AutoDocsTags.getLinks();
    const q = (vincularModal.search || '').trim().toLowerCase();
    const catalog = window.AUTODOCS_DOCS_CATALOG.filter(doc => {
      if (!q) return true;
      return (
        String(doc.title).toLowerCase().includes(q) ||
        String(doc.id).toLowerCase().includes(q) ||
        String(doc.blurb || '').toLowerCase().includes(q)
      );
    });
    container.className =
      vincularModal.view === 'list' ? 'usuarios-docs-list' : 'usuarios-docs-grid';
    container.innerHTML = '';

    catalog.forEach(doc => {
      const linked = links[doc.id] === tagId;
      const item = document.createElement('div');
      item.className = 'usuarios-doc-item' + (linked ? ' is-linked' : '');
      item.innerHTML =
        '<div class="usuarios-doc-item-main">' +
        '<p class="usuarios-doc-item-title">' +
        escapeHtml(doc.title) +
        '</p>' +
        (doc.blurb
          ? '<p class="usuarios-doc-item-blurb">' + escapeHtml(doc.blurb) + '</p>'
          : '') +
        '</div>' +
        '<div class="usuarios-doc-item-controls">' +
        '<button type="button" class="usuarios-doc-link-btn ' +
        (linked ? 'usuarios-doc-link-btn--linked' : 'usuarios-doc-link-btn--unlinked') +
        '" data-doc-id="' +
        escapeHtml(doc.id) +
        '" aria-label="' +
        (linked ? 'Desvincular desta tag' : 'Vincular a esta tag') +
        '" title="' +
        (linked ? 'Desvincular' : 'Vincular') +
        '">' +
        '<span class="material-symbols-rounded" aria-hidden="true">' +
        (linked ? 'link_off' : 'link') +
        '</span></button>' +
        '</div>';
      container.appendChild(item);
    });

    container.querySelectorAll('.usuarios-doc-link-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const docId = btn.getAttribute('data-doc-id');
        const linked = window.AutoDocsTags.getLinks()[docId] === tagId;
        const usoGeral =
          (window.AutoDocsTags.usoGeralTagId && window.AutoDocsTags.usoGeralTagId()) ||
          USO_GERAL_TAG_ID;
        const nextTag = linked ? usoGeral : tagId;
        if (!window.AutoDocsTags.setDocTag(docId, nextTag)) {
          setFlash('Não foi possível alterar o vínculo.', 'error');
          return;
        }
        btn.disabled = true;
        const ok = await persistToServer();
        btn.disabled = false;
        if (ok) {
          renderVincularDocs();
          renderGrid();
        }
      });
    });
  }

  function setVincularView(view) {
    vincularModal.view = view;
    document.querySelectorAll('[data-tags-view]').forEach(btn => {
      const active = btn.getAttribute('data-tags-view') === view;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderVincularDocs();
  }

  function tagMatchesSearch(tag, q) {
    if (!q || !String(q).trim()) return true;
    const n = String(q).trim().toLowerCase();
    return String(tag.name).toLowerCase().includes(n) || String(tag.id).toLowerCase().includes(n);
  }

  function docCountForTag(tagId) {
    if (!window.AutoDocsTags || !window.AUTODOCS_DOCS_CATALOG) return 0;
    const ids = window.AUTODOCS_DOCS_CATALOG.map(d => d.id);
    return window.AutoDocsTags.countDocsForTag(tagId, ids);
  }

  function renderGrid() {
    const grid = document.getElementById('tags-grid');
    const empty = document.getElementById('tags-empty');
    const searchEl = document.getElementById('tags-search');
    if (!grid || !window.AutoDocsTags) return;
    const q = searchEl ? searchEl.value : '';
    const tags = window.AutoDocsTags.getTags().filter(t => tagMatchesSearch(t, q));
    grid.innerHTML = '';
    if (empty) empty.hidden = tags.length > 0;
    tags.forEach(tag => {
      const accent = normalizePickerHex(tag.accentColor || SOFISA_ACCENT);
      const nDocs = docCountForTag(tag.id);
      const card = document.createElement('article');
      card.className = 'tags-admin-card';
      card.setAttribute('role', 'listitem');
      card.innerHTML =
        '<div class="tags-admin-card-swatch" style="background-color:' +
        escapeHtml(accent) +
        '" aria-hidden="true"></div>' +
        '<div class="tags-admin-card-body">' +
        '<h3 class="tags-admin-card-title" style="color:' +
        escapeHtml(accent) +
        '">' +
        escapeHtml(tag.name) +
        '</h3>' +
        '<p class="tags-admin-card-id tags-admin-card-meta">' +
        nDocs +
        ' documentação' +
        (nDocs === 1 ? '' : 'ões') +
        '</p>' +
        '</div>' +
        '<div class="tags-admin-card-actions">' +
        '<button type="button" class="tags-btn-outline" data-act="vincular" data-id="' +
        escapeHtml(tag.id) +
        '">Vincular docs</button>' +
        '<button type="button" class="tags-btn-outline" data-act="edit" data-id="' +
        escapeHtml(tag.id) +
        '">Editar</button>' +
        '<button type="button" class="tags-btn-outline tags-btn-outline--danger" data-act="del" data-id="' +
        escapeHtml(tag.id) +
        '"' +
        (tag.id === USO_GERAL_TAG_ID ? ' disabled title="Tag do sistema"' : '') +
        '>Excluir</button>' +
        '</div>';
      grid.appendChild(card);
    });

    grid.querySelectorAll('[data-act="vincular"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const tag = window.AutoDocsTags.getTags().find(t => t.id === id);
        if (tag) openVincularModal(tag);
      });
    });
    grid.querySelectorAll('[data-act="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const tag = window.AutoDocsTags.getTags().find(t => t.id === id);
        if (tag) openEditModal('edit', tag);
      });
    });
    grid.querySelectorAll('[data-act="del"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id === USO_GERAL_TAG_ID) return;
        const tags = window.AutoDocsTags.getTags();
        if (tags.length <= 1) {
          alert('É necessário manter pelo menos uma tag.');
          return;
        }
        if (!confirm('Excluir esta tag? As documentações passarão para Uso Geral.')) return;
        if (!window.AutoDocsTags.deleteTag(id)) return;
        const ok = await persistToServer('Tag excluída.');
        if (ok) renderGrid();
      });
    });
  }

  function bindModals() {
    const picker = document.getElementById('tags-modal-cor');
    const textCor = document.getElementById('tags-modal-cor-text');
    const nome = document.getElementById('tags-modal-nome');
    if (picker && textCor) {
      picker.addEventListener('input', () => {
        textCor.value = picker.value;
        updatePreview();
      });
      textCor.addEventListener('input', () => {
        const v = textCor.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/i.test(v)) picker.value = normalizePickerHex(v);
        updatePreview();
      });
    }
    if (nome) nome.addEventListener('input', updatePreview);

    document.getElementById('tags-modal-cancel')?.addEventListener('click', closeEditModal);
    document.getElementById('tags-modal-bg')?.addEventListener('click', e => {
      if (e.target.id === 'tags-modal-bg') closeEditModal();
    });

    document.getElementById('tags-vincular-close')?.addEventListener('click', closeVincularModal);
    document.getElementById('tags-vincular-close-top')?.addEventListener('click', closeVincularModal);
    document.getElementById('tags-vincular-modal-bg')?.addEventListener('click', e => {
      if (e.target.id === 'tags-vincular-modal-bg') closeVincularModal();
    });
    document.getElementById('tags-vincular-search')?.addEventListener('input', e => {
      vincularModal.search = e.target.value;
      renderVincularDocs();
    });
    document.querySelectorAll('[data-tags-view]').forEach(btn => {
      btn.addEventListener('click', () => setVincularView(btn.getAttribute('data-tags-view')));
    });

    document.getElementById('tags-modal-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const idEl = document.getElementById('tags-edit-id');
      const editId = idEl && idEl.value ? idEl.value : '';
      const name = (document.getElementById('tags-modal-nome') || {}).value || '';
      const cor = textCor ? textCor.value.trim() : picker ? picker.value : SOFISA_ACCENT;
      if (!window.AutoDocsTags) return;
      if (editId) {
        if (!window.AutoDocsTags.renameTag(editId, name)) {
          setFlash('Nome inválido ou já existente.', 'error');
          return;
        }
        if (!window.AutoDocsTags.setTagAccent(editId, cor)) {
          setFlash('Cor inválida.', 'error');
          return;
        }
      } else {
        const id = window.AutoDocsTags.createTag(name, cor);
        if (!id) {
          setFlash('Nome inválido ou tag já existente.', 'error');
          return;
        }
      }
      const ok = await persistToServer(editId ? 'Tag atualizada.' : 'Tag criada.');
      if (!ok) return;
      closeEditModal();
      renderGrid();
    });
  }

  function startTagsPage() {
    if (!window.AutoDocsTags) return;
    if (window.AUTODOCS_DOCS_CATALOG) {
      window.AutoDocsTags.ensureDefaults(window.AUTODOCS_DOCS_CATALOG.map(d => d.id));
    }
    bindModals();
    renderGrid();
    document.getElementById('tags-search')?.addEventListener('input', renderGrid);
    document.getElementById('tags-btn-nova')?.addEventListener('click', () => openEditModal('new', null));
    document.addEventListener('autodocs-tags-push-error', e => {
      const msg = e && e.detail && e.detail.message;
      if (msg) setFlash(msg, 'error');
    });
    const pending = window.AutoDocsTags.getLastPushError && window.AutoDocsTags.getLastPushError();
    if (pending) setFlash(pending, 'error');
  }

  if (window.__autodocsAuth !== undefined) {
    startTagsPage();
  } else {
    document.addEventListener('autodocs-auth-ready', startTagsPage, { once: true });
  }
})();
