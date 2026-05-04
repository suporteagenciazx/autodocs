(function () {
  function getBasePath() {
    return typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
  }

  function apiPost(basePath, body) {
    return fetch(basePath + 'api/admin-users.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  }

  let state = { users: [], batches: [] };

  function setMsg(t) {
    const el = document.getElementById('usuarios-msg');
    if (el) el.textContent = t || '';
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
    const pass = document.getElementById('usuarios-f-password');
    const role = document.getElementById('usuarios-f-role');
    const batchWrap = document.getElementById('usuarios-f-batches');
    if (t) t.textContent = title;
    if (idEl) idEl.value = user ? String(user.id) : '';
    if (email) email.value = user ? user.email : '';
    if (pass) pass.value = '';
    if (role) role.value = user && user.role === 'admin' ? 'admin' : 'user';
    if (batchWrap) {
      batchWrap.innerHTML = '';
      state.batches.forEach(b => {
        const id = 'batch-cb-' + b.id;
        const checked = user && user.batchIds && user.batchIds.indexOf(b.id) !== -1;
        const docs = (b.catalogDocIds || []).join(', ');
        const lab = document.createElement('label');
        lab.innerHTML =
          '<input type="checkbox" name="batch" value="' +
          b.id +
          '" id="' +
          id +
          '"' +
          (checked ? ' checked' : '') +
          '> ' +
          '<span><strong>' +
          escapeHtml(b.name) +
          '</strong> <span style="color:#666">(' +
          escapeHtml(b.slug) +
          ')</span><br><span style="color:#888;font-size:11px">' +
          escapeHtml(docs) +
          '</span></span>';
        batchWrap.appendChild(lab);
      });
    }
    if (bg) {
      bg.classList.add('is-open');
      bg.setAttribute('aria-hidden', 'false');
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function selectedBatchIds() {
    const boxes = document.querySelectorAll('#usuarios-f-batches input[name="batch"]:checked');
    return Array.prototype.map.call(boxes, cb => parseInt(cb.value, 10)).filter(n => !isNaN(n));
  }

  function batchLabelsForUser(u) {
    return u.batchIds
      .map(id => {
        const b = state.batches.find(x => x.id === id);
        return b ? b.slug : String(id);
      })
      .join(', ');
  }

  function userMatchesSearch(u, q) {
    if (!q || !String(q).trim()) return true;
    const n = String(q).trim().toLowerCase();
    const batches = batchLabelsForUser(u).toLowerCase();
    const activeStr = u.active ? 'sim' : 'não';
    return (
      String(u.email).toLowerCase().includes(n) ||
      String(u.role).toLowerCase().includes(n) ||
      activeStr.includes(n) ||
      batches.includes(n)
    );
  }

  async function loadList() {
    const basePath = getBasePath();
    setMsg('');
    const res = await apiPost(basePath, { action: 'list' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || 'Sem permissão ou erro ao carregar.');
      return;
    }
    state.users = data.users || [];
    state.batches = data.batches || [];
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
      const batchLabels = batchLabelsForUser(u);
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
        escapeHtml(batchLabels || '—') +
        '</td>' +
        '<td><div class="usuarios-actions">' +
        '<button type="button" data-act="edit" data-id="' +
        u.id +
        '" style="box-sizing:border-box;padding:14px 22px;border-radius:22px;border:1px solid #e8e8e8;cursor:pointer;background:#fff;color:var(--cor-accent);font-family:\'Inter\',sans-serif;font-size:13px;font-weight:600;">Editar</button>' +
        '<button type="button" data-act="del" data-id="' +
        u.id +
        '" style="box-sizing:border-box;padding:14px 22px;border-radius:22px;border:1px solid #ffcdd2;cursor:pointer;background:#fff;color:#c62828;font-family:\'Inter\',sans-serif;font-size:13px;font-weight:600;">Eliminar</button>' +
        '</div></td>';
      tb.appendChild(tr);
    });

    tb.querySelectorAll('button[data-act="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const user = state.users.find(x => x.id === id);
        if (user) openModal('Editar utilizador', user);
      });
    });
    tb.querySelectorAll('button[data-act="del"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        if (!confirm('Eliminar este utilizador?')) return;
        const basePath = getBasePath();
        const res = await apiPost(basePath, { action: 'delete', id });
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

    loadList();

    document.getElementById('usuarios-search')?.addEventListener('input', () => {
      renderTable();
    });

    document.getElementById('usuarios-btn-novo')?.addEventListener('click', () => {
      openModal('Novo utilizador', null);
    });
    document.getElementById('usuarios-modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('usuarios-modal-bg')?.addEventListener('click', e => {
      if (e.target.id === 'usuarios-modal-bg') closeModal();
    });

    document.getElementById('usuarios-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      setMsg('');
      const basePath = getBasePath();
      const idEl = document.getElementById('usuarios-edit-id');
      const editId = idEl && idEl.value ? parseInt(idEl.value, 10) : 0;
      const email = (document.getElementById('usuarios-f-email') || {}).value || '';
      const password = (document.getElementById('usuarios-f-password') || {}).value || '';
      const role = (document.getElementById('usuarios-f-role') || {}).value || 'user';
      const batchIds = selectedBatchIds();

      let res;
      if (editId) {
        const body = { action: 'update', id: editId, email: email.trim(), role, batchIds };
        if (password) body.password = password;
        res = await apiPost(basePath, body);
      } else {
        if (!password) {
          setMsg('Indique uma palavra-passe para o novo utilizador.');
          return;
        }
        res = await apiPost(basePath, {
          action: 'create',
          email: email.trim(),
          password,
          role,
          batchIds,
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || 'Erro ao guardar.');
        return;
      }
      closeModal();
      loadList();
    });
  }

  document.addEventListener('autodocs-auth-ready', () => init(), { once: true });
})();
