(function () {
  const USO_GERAL_TAG_ID = 'tag-uso-geral';

  function getBasePath() {
    return typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function apiPost(path, body) {
    return fetch(getBasePath() + path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  }

  let state = { users: [] };
  let tagsModal = {
    userId: 0,
    email: '',
    tagIds: [],
    tags: [],
    docLinks: {},
    docsByTag: {},
    view: 'cards',
    search: '',
  };

  function setMsg(t) {
    const el = document.getElementById('usuarios-msg');
    if (el) el.textContent = t || '';
  }

  function setModalMsg(t, type) {
    let el = document.getElementById('usuarios-docs-modal-msg');
    if (!el) {
      const body = document.querySelector('.usuarios-docs-body');
      if (body && body.parentNode) {
        el = document.createElement('p');
        el.id = 'usuarios-docs-modal-msg';
        el.className = 'usuarios-docs-modal-msg';
        el.setAttribute('role', 'alert');
        el.hidden = true;
        body.parentNode.insertBefore(el, body);
      }
    }
    if (!el) return;
    el.textContent = t || '';
    el.hidden = !t;
    el.className =
      'usuarios-docs-modal-msg' + (type === 'info' ? ' usuarios-docs-modal-msg--info' : '');
  }

  function normalizeTagIds(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(id => String(id)).filter(Boolean);
  }

  function resolveTagsFromPayload(data) {
    if (Array.isArray(data.tags) && data.tags.length) return data.tags;
    if (window.AutoDocsTags) {
      const local = window.AutoDocsTags.getTags();
      if (local.length) return local;
    }
    return [];
  }

  function buildDocsByTag(docLinks, docsByTag) {
    if (docsByTag && typeof docsByTag === 'object' && Object.keys(docsByTag).length) {
      return docsByTag;
    }
    const grouped = {};
    const links = docLinks && typeof docLinks === 'object' ? docLinks : {};
    Object.keys(links).forEach(docId => {
      const tagId = links[docId];
      if (!tagId) return;
      if (!grouped[tagId]) grouped[tagId] = [];
      grouped[tagId].push(docId);
    });
    return grouped;
  }

  function closeModal() {
    const bg = document.getElementById('usuarios-modal-bg');
    if (bg) {
      bg.classList.remove('is-open');
      bg.setAttribute('aria-hidden', 'true');
    }
  }

  function openModal(title, user) {
    const bg = document.getElementById('usuarios-modal-bg');
    const t = document.getElementById('usuarios-modal-title');
    const idEl = document.getElementById('usuarios-edit-id');
    const email = document.getElementById('usuarios-f-email');
    const role = document.getElementById('usuarios-f-role');
    const regenBtn = document.getElementById('usuarios-btn-regen-pin');
    const hint = document.getElementById('usuarios-pin-hint');
    if (t) t.textContent = title;
    if (idEl) idEl.value = user ? String(user.id) : '';
    if (email) email.value = user ? user.email : '';
    if (role) role.value = user && user.role === 'admin' ? 'admin' : 'user';
    if (regenBtn) regenBtn.style.display = user ? '' : 'none';
    if (hint) {
      hint.textContent = user
        ? user.hasPin
          ? 'PIN definido. Use «Regenerar PIN» para criar um novo (o anterior deixa de funcionar).'
          : 'Este utilizador ainda não tem PIN. Use «Regenerar PIN».'
        : 'Um PIN de 6 dígitos será gerado automaticamente ao criar o utilizador. Guarde-o — só é mostrado uma vez.';
    }
    if (bg) {
      bg.classList.add('is-open');
      bg.setAttribute('aria-hidden', 'false');
    }
  }

  function showPinOnce(email, pin) {
    const text =
      'PIN de ' +
      email +
      ': ' +
      pin +
      '\n\nGuarde agora — não será mostrado novamente.';
    window.alert(text);
    setMsg('PIN gerado para ' + email + '. Anote-o com segurança.');
  }

  function closeTagsModal() {
    const bg = document.getElementById('usuarios-docs-modal-bg');
    if (bg) {
      bg.classList.remove('is-open');
      bg.setAttribute('aria-hidden', 'true');
    }
    tagsModal.userId = 0;
  }

  function docCountForTag(tagId) {
    const list = tagsModal.docsByTag[tagId];
    if (Array.isArray(list)) return list.length;
    if (!window.AutoDocsTags || !window.AUTODOCS_DOCS_CATALOG) return 0;
    return window.AutoDocsTags.countDocsForTag(
      tagId,
      window.AUTODOCS_DOCS_CATALOG.map(d => d.id)
    );
  }

  function sortTagsForModal(tags) {
    return tags.slice().sort((a, b) => {
      if (a.id === USO_GERAL_TAG_ID) return -1;
      if (b.id === USO_GERAL_TAG_ID) return 1;
      return String(a.name).localeCompare(String(b.name), 'pt');
    });
  }

  function renderTagsModal() {
    const container = document.getElementById('usuarios-docs-container');
    if (!container) return;
    const q = (tagsModal.search || '').trim().toLowerCase();
    const allTags = sortTagsForModal(tagsModal.tags);
    const tags = allTags.filter(tag => {
      if (!q) return true;
      return (
        String(tag.name).toLowerCase().includes(q) ||
        String(tag.id).toLowerCase().includes(q)
      );
    });
    container.className =
      tagsModal.view === 'list' ? 'usuarios-docs-list' : 'usuarios-docs-grid';
    container.innerHTML = '';

    if (!allTags.length) {
      setModalMsg(
        'Nenhuma etiqueta cadastrada. Crie etiquetas na página Etiqueta antes de vincular utilizadores.',
        'info'
      );
      container.innerHTML =
        '<p class="usuarios-docs-empty">Sem etiquetas disponíveis.</p>';
      return;
    }
    setModalMsg('');

    if (!tags.length) {
      container.innerHTML =
        '<p class="usuarios-docs-empty">Nenhuma etiqueta corresponde à pesquisa.</p>';
      return;
    }

    tags.forEach(tag => {
      const linked = tagsModal.tagIds.includes(tag.id);
      const accent = tag.accentColor || '#006157';
      const nDocs = docCountForTag(tag.id);
      const isUsoGeral = tag.id === USO_GERAL_TAG_ID;
      const item = document.createElement('div');
      item.className = 'usuarios-doc-item' + (linked ? ' is-linked' : '');
      item.innerHTML =
        '<div class="usuarios-doc-item-main" style="--tag-accent:' +
        escapeHtml(accent) +
        '">' +
        '<p class="usuarios-doc-item-title">' +
        escapeHtml(tag.name) +
        (isUsoGeral ? ' <span class="usuarios-tag-badge">Uso Geral</span>' : '') +
        '</p>' +
        '<p class="usuarios-doc-item-blurb">' +
        (isUsoGeral
          ? 'Acesso a todas as documentações vinculadas a esta tag.'
          : 'Grupo com ' + nDocs + ' documentação' + (nDocs === 1 ? '' : 'ões') + '.') +
        '</p>' +
        '<span class="usuarios-doc-item-tag">' +
        nDocs +
        ' doc.</span>' +
        '</div>' +
        '<div class="usuarios-doc-item-controls">' +
        '<button type="button" class="usuarios-doc-link-btn ' +
        (linked ? 'usuarios-doc-link-btn--linked' : 'usuarios-doc-link-btn--unlinked') +
        '" data-tag-id="' +
        escapeHtml(tag.id) +
        '" aria-label="' +
        (linked ? 'Remover acesso à etiqueta' : 'Dar acesso à etiqueta') +
        '" title="' +
        (linked ? 'Desvincular etiqueta' : 'Vincular etiqueta') +
        '">' +
        '<span class="material-symbols-rounded" aria-hidden="true">' +
        (linked ? 'link_off' : 'link') +
        '</span></button>' +
        '</div>';
      container.appendChild(item);
    });

    container.querySelectorAll('.usuarios-doc-link-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tagId = btn.getAttribute('data-tag-id');
        const linked = tagsModal.tagIds.includes(tagId);
        await saveUserTag(tagId, !linked);
      });
    });
  }

  async function saveUserTag(tagId, link) {
    setMsg('');
    const body = link
      ? { action: 'linkTag', userId: tagsModal.userId, tagId }
      : { action: 'unlinkTag', userId: tagsModal.userId, tagId };
    const res = await apiPost('api/admin-user-doc-links.php', body);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || 'Erro ao gravar vínculo.');
      return;
    }
    tagsModal.tagIds = normalizeTagIds(data.tagIds);
    await loadList();
    renderTagsModal();
  }

  async function openTagsModal(user) {
    setMsg('');
    setModalMsg('');
    const res = await apiPost('api/admin-user-doc-links.php', {
      action: 'get',
      userId: user.id,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data.error || 'Erro ao carregar etiquetas.';
      setMsg(err);
      setModalMsg(err);
      const bg = document.getElementById('usuarios-docs-modal-bg');
      if (bg) {
        bg.classList.add('is-open');
        bg.setAttribute('aria-hidden', 'false');
      }
      const container = document.getElementById('usuarios-docs-container');
      if (container) {
        container.innerHTML =
          '<p class="usuarios-docs-empty">Não foi possível carregar as etiquetas.</p>';
      }
      return;
    }
    const tags = resolveTagsFromPayload(data);
    const docLinks = data.docLinks || {};
    if (window.AutoDocsTags) {
      if (tags.length) window.AutoDocsTags.setTagsLocal(tags);
      window.AutoDocsTags.setLinksLocal(docLinks);
    }
    tagsModal = {
      userId: user.id,
      email: data.email || user.email,
      tagIds: normalizeTagIds(data.tagIds),
      tags: tags,
      docLinks: docLinks,
      docsByTag: buildDocsByTag(docLinks, data.docsByTag),
      view: tagsModal.view || 'cards',
      search: '',
    };
    const sub = document.getElementById('usuarios-docs-modal-sub');
    const title = document.getElementById('usuarios-docs-modal-title');
    if (title) title.textContent = 'Vincular etiquetas ao utilizador';
    if (sub) {
      sub.textContent =
        tagsModal.email +
        ' — cada etiqueta dá acesso a todas as documentações desse grupo (ex.: Uso Geral).';
    }
    const searchEl = document.getElementById('usuarios-docs-search');
    if (searchEl) {
      searchEl.value = '';
      searchEl.placeholder = 'Pesquisar etiqueta…';
    }
    const bg = document.getElementById('usuarios-docs-modal-bg');
    if (bg) {
      bg.classList.add('is-open');
      bg.setAttribute('aria-hidden', 'false');
    }
    renderTagsModal();
  }

  function setTagsView(view) {
    tagsModal.view = view;
    document.querySelectorAll('.usuarios-docs-view-btn').forEach(btn => {
      const active = btn.getAttribute('data-view') === view;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderTagsModal();
  }

  function userMatchesSearch(u, q) {
    if (!q || !String(q).trim()) return true;
    const n = String(q).trim().toLowerCase();
    const activeStr = u.active ? 'sim' : 'não';
    const tagsText = formatTagLabels(u).toLowerCase();
    return (
      String(u.email).toLowerCase().includes(n) ||
      String(u.role).toLowerCase().includes(n) ||
      activeStr.includes(n) ||
      tagsText.includes(n)
    );
  }

  function formatTagLabels(u) {
    if (Array.isArray(u.tagLabels) && u.tagLabels.length) {
      return u.tagLabels.join(', ');
    }
    const count =
      typeof u.tagLinkCount === 'number'
        ? u.tagLinkCount
        : Array.isArray(u.tagIds)
          ? u.tagIds.length
          : 0;
    return count > 0 ? String(count) + ' etiqueta(s)' : '';
  }

  function renderTagsCell(u) {
    const labels = formatTagLabels(u);
    const count =
      typeof u.tagLinkCount === 'number'
        ? u.tagLinkCount
        : Array.isArray(u.tagIds)
          ? u.tagIds.length
          : 0;
    const legacy =
      u.hasLegacyBatches && count === 0
        ? '<span class="usuarios-legacy-badge" title="Acesso antigo por lotes — já não vale no login. Reatribua etiquetas.">Acesso legado — reatribuir etiquetas</span>'
        : '';
    if (!labels && !legacy) {
      return '—';
    }
    const main = labels
      ? '<span class="usuarios-tags-labels" title="' +
        escapeHtml(labels) +
        ' (' +
        count +
        ')">' +
        escapeHtml(labels) +
        '</span>'
      : '';
    return main + legacy;
  }

  async function loadList() {
    setMsg('');
    const res = await apiPost('api/admin-users.php', { action: 'list' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || 'Sem permissão ou erro ao carregar.');
      return;
    }
    state.users = data.users || [];
    renderTable();
  }

  function renderTable() {
    const tb = document.getElementById('usuarios-tbody');
    const searchEl = document.getElementById('usuarios-search');
    if (!tb) return;
    const q = searchEl ? searchEl.value : '';
    tb.innerHTML = '';
    state.users.filter(u => userMatchesSearch(u, q)).forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td><span class="usuarios-email-cell"><span class="material-symbols-rounded" aria-hidden="true">person</span>' +
        escapeHtml(u.email) +
        '</span></td>' +
        '<td>' +
        escapeHtml(u.role) +
        '</td>' +
        '<td>' +
        (u.active ? 'Sim' : 'Não') +
        '</td>' +
        '<td>' +
        (u.hasPin ? 'Definido' : 'Sem PIN') +
        '</td>' +
        '<td class="usuarios-tags-cell">' +
        renderTagsCell(u) +
        '</td>' +
        '<td><div class="usuarios-actions">' +
        '<button type="button" class="tags-btn-outline" data-act="docs" data-id="' +
        u.id +
        '">Vincular Docs</button>' +
        '<button type="button" class="tags-btn-outline" data-act="edit" data-id="' +
        u.id +
        '">Editar</button>' +
        '<button type="button" class="tags-btn-outline" data-act="pin" data-id="' +
        u.id +
        '">' +
        (u.hasPin ? 'Regenerar PIN' : 'Gerar PIN') +
        '</button>' +
        '<button type="button" class="tags-btn-outline tags-btn-outline--danger" data-act="del" data-id="' +
        u.id +
        '">Eliminar</button>' +
        '</div></td>';
      tb.appendChild(tr);
    });

    tb.querySelectorAll('[data-act="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const user = state.users.find(x => x.id === id);
        if (user) openModal('Editar utilizador', user);
      });
    });
    tb.querySelectorAll('[data-act="docs"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const user = state.users.find(x => x.id === id);
        if (user) openTagsModal(user);
      });
    });
    tb.querySelectorAll('[data-act="pin"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const user = state.users.find(x => x.id === id);
        if (!user) return;
        const label = user.hasPin ? 'Regenerar' : 'Gerar';
        if (!confirm(label + ' PIN de ' + user.email + '? O PIN anterior deixa de funcionar.')) return;
        const res = await apiPost('api/admin-users.php', { action: 'regeneratePin', id });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg(data.error || 'Erro ao gerar PIN.');
          return;
        }
        showPinOnce(data.email || user.email, data.pin);
        loadList();
      });
    });
    tb.querySelectorAll('[data-act="del"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        if (!confirm('Eliminar este utilizador?')) return;
        const res = await apiPost('api/admin-users.php', { action: 'delete', id });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg(data.error || 'Erro ao eliminar.');
          return;
        }
        loadList();
      });
    });
  }

  function init() {
    const auth = window.__autodocsAuth;
    if (
      !auth ||
      !auth.user ||
      String(auth.user.role || '').toLowerCase() !== 'admin'
    ) {
      return;
    }

    const marker = document.getElementById('usuarios-search') || document.getElementById('usuarios-form');
    if (!marker) return;
    if (marker.dataset.pageInited === '1') {
      loadList();
      return;
    }
    marker.dataset.pageInited = '1';

    if (window.AutoDocsTags) {
      window.AutoDocsTags.syncFromServer(getBasePath());
    }

    loadList();

    document.getElementById('usuarios-search')?.addEventListener('input', renderTable);
    document.getElementById('usuarios-btn-novo')?.addEventListener('click', () => {
      openModal('Novo utilizador', null);
    });
    document.getElementById('usuarios-modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('usuarios-modal-bg')?.addEventListener('click', e => {
      if (e.target.id === 'usuarios-modal-bg') closeModal();
    });

    document.getElementById('usuarios-docs-close')?.addEventListener('click', closeTagsModal);
    document.getElementById('usuarios-docs-close-top')?.addEventListener('click', closeTagsModal);
    document.getElementById('usuarios-docs-modal-bg')?.addEventListener('click', e => {
      if (e.target.id === 'usuarios-docs-modal-bg') closeTagsModal();
    });
    document.getElementById('usuarios-docs-search')?.addEventListener('input', e => {
      tagsModal.search = e.target.value;
      renderTagsModal();
    });
    document.querySelectorAll('.usuarios-docs-view-btn').forEach(btn => {
      btn.addEventListener('click', () => setTagsView(btn.getAttribute('data-view')));
    });

    document.getElementById('usuarios-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      setMsg('');
      const idEl = document.getElementById('usuarios-edit-id');
      const editId = idEl && idEl.value ? parseInt(idEl.value, 10) : 0;
      const email = (document.getElementById('usuarios-f-email') || {}).value || '';
      const role = (document.getElementById('usuarios-f-role') || {}).value || 'user';

      let res;
      if (editId) {
        res = await apiPost('api/admin-users.php', {
          action: 'update',
          id: editId,
          email: email.trim(),
          role,
        });
      } else {
        res = await apiPost('api/admin-users.php', {
          action: 'create',
          email: email.trim(),
          role,
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || 'Erro ao guardar.');
        return;
      }
      closeModal();
      if (data.pin) {
        showPinOnce(email.trim(), data.pin);
      }
      loadList();
    });

    document.getElementById('usuarios-btn-regen-pin')?.addEventListener('click', async () => {
      const idEl = document.getElementById('usuarios-edit-id');
      const editId = idEl && idEl.value ? parseInt(idEl.value, 10) : 0;
      if (!editId) return;
      const user = state.users.find(x => x.id === editId);
      if (!confirm('Regenerar PIN' + (user ? ' de ' + user.email : '') + '? O anterior deixa de funcionar.')) {
        return;
      }
      const res = await apiPost('api/admin-users.php', { action: 'regeneratePin', id: editId });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || 'Erro ao gerar PIN.');
        return;
      }
      showPinOnce(data.email || (user && user.email) || '', data.pin);
      loadList();
    });
  }

  function boot() {
    init();
  }

  if (
    window.__autodocsAuth &&
    window.__autodocsAuth.user &&
    String(window.__autodocsAuth.user.role || '').toLowerCase() === 'admin'
  ) {
    boot();
  }
  document.addEventListener('autodocs-auth-ready', boot);
  document.addEventListener('autodocs-page-ready', boot);
})();
