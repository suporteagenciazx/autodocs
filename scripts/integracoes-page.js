(function () {
  const LS_KEY = 'autodocs.integrations';

  const INTEGRATIONS = [
    {
      id: 'opencnpj',
      name: 'OpenCNPJ',
      icon: 'domain',
      summary:
        'Consulta pública de CNPJ. Ao digitar um CNPJ válido nos documentos, preenche automaticamente razão social, nome fantasia, endereço e demais campos disponíveis.',
      defaultEnabled: true,
      details: {
        description:
          'Serviço público de consulta cadastral de empresas brasileiras. O AutoDocs utiliza a API OpenCNPJ para enriquecer formulários de documentos que solicitam CNPJ e dados da empresa.',
        endpoint: 'GET https://api.opencnpj.org/{CNPJ}',
        fields: [
          'Razão social → i-razao',
          'Nome fantasia → i-nome / i-fantasia',
          'Data de abertura → i-abertura',
          'Endereço, CEP, UF, município (quando existirem no formulário)',
        ],
        docsUrl: 'https://opencnpj.org/',
        docsLabel: 'Documentação OpenCNPJ',
        notes:
          'Não requer configuração adicional. A consulta é disparada automaticamente ao completar 14 dígitos do CNPJ nos documentos compatíveis.',
      },
    },
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getIntegration(id) {
    return INTEGRATIONS.find(i => i.id === id) || null;
  }

  function getState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (_) {
      /* ignore */
    }
  }

  function isEnabled(id, defaultEnabled) {
    const state = getState();
    if (Object.prototype.hasOwnProperty.call(state, id)) {
      return !!state[id];
    }
    return defaultEnabled !== false;
  }

  function setEnabled(id, on) {
    const state = getState();
    state[id] = !!on;
    saveState(state);
    document.dispatchEvent(
      new CustomEvent('autodocs-integration-changed', { detail: { id, enabled: !!on } })
    );
  }

  window.AutoDocsIntegrations = { isEnabled, setEnabled, getState };

  function closeModal() {
    const bg = document.getElementById('integracao-modal-bg');
    if (!bg) return;
    bg.classList.remove('is-open');
    bg.setAttribute('aria-hidden', 'true');
  }

  function openDetails(id) {
    const item = getIntegration(id);
    if (!item || !item.details) return;
    const bg = document.getElementById('integracao-modal-bg');
    const title = document.getElementById('integracao-modal-title');
    const body = document.getElementById('integracao-modal-body');
    if (!bg || !title || !body) return;

    const d = item.details;
    const fieldsHtml = (d.fields || [])
      .map(f => '<li>' + escapeHtml(f) + '</li>')
      .join('');

    let html =
      '<p class="integracao-modal-desc campo-texto">' + escapeHtml(d.description || '') + '</p>';

    if (d.endpoint) {
      html +=
        '<div class="integracao-modal-section">' +
        '<span class="integracao-modal-label">Endpoint</span>' +
        '<code class="integracao-modal-code">' +
        escapeHtml(d.endpoint) +
        '</code></div>';
    }

    if (fieldsHtml) {
      html +=
        '<div class="integracao-modal-section">' +
        '<span class="integracao-modal-label">Campos preenchidos</span>' +
        '<ul class="integracao-modal-fields">' +
        fieldsHtml +
        '</ul></div>';
    }

    if (d.notes) {
      html +=
        '<div class="integracao-modal-section">' +
        '<span class="integracao-modal-label">Observações</span>' +
        '<p class="integracao-modal-notes campo-texto">' +
        escapeHtml(d.notes) +
        '</p></div>';
    }

    if (d.docsUrl) {
      html +=
        '<a class="integracao-modal-link" href="' +
        escapeHtml(d.docsUrl) +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(d.docsLabel || 'Documentação') +
        '</a>';
    }

    title.textContent = item.name;
    body.innerHTML = html;
    bg.classList.add('is-open');
    bg.setAttribute('aria-hidden', 'false');
  }

  function render() {
    const grid = document.getElementById('integracoes-grid');
    if (!grid) return;
    grid.innerHTML = '';
    INTEGRATIONS.forEach(item => {
      const enabled = isEnabled(item.id, item.defaultEnabled);
      const card = document.createElement('article');
      card.className = 'integracao-card' + (enabled ? '' : ' integracao-card--off');
      card.innerHTML =
        '<div class="integracao-card-head">' +
        '<span class="integracao-card-icon" aria-hidden="true">' +
        '<span class="material-symbols-rounded">' +
        escapeHtml(item.icon) +
        '</span></span>' +
        '<h2 class="integracao-card-title">' +
        escapeHtml(item.name) +
        '</h2></div>' +
        '<p class="integracao-card-summary campo-texto">' +
        escapeHtml(item.summary) +
        '</p>' +
        '<div class="integracao-card-footer">' +
        '<button type="button" class="integracao-btn-edit tags-btn-outline" data-integration-id="' +
        escapeHtml(item.id) +
        '">' +
        '<span class="material-symbols-rounded" aria-hidden="true">edit</span>' +
        'Editar' +
        '</button>' +
        '<label class="integracao-switch" title="Ativar ou desativar integração">' +
        '<input type="checkbox" class="integracao-switch-input" data-integration-id="' +
        escapeHtml(item.id) +
        '"' +
        (enabled ? ' checked' : '') +
        ' aria-label="Ativar integração ' +
        escapeHtml(item.name) +
        '">' +
        '<span class="integracao-switch-track" aria-hidden="true"><span class="integracao-switch-thumb"></span></span>' +
        '</label></div>';
      grid.appendChild(card);
    });
  }

  function bindEvents() {
    const grid = document.getElementById('integracoes-grid');
    if (grid && !grid.dataset.bound) {
      grid.dataset.bound = '1';
      grid.addEventListener('change', e => {
        const input = e.target.closest('.integracao-switch-input');
        if (!input) return;
        const id = input.getAttribute('data-integration-id');
        if (!id) return;
        setEnabled(id, input.checked);
        const card = input.closest('.integracao-card');
        if (card) card.classList.toggle('integracao-card--off', !input.checked);
        if (window.AutoDocsToast) {
          const name = getIntegration(id);
          window.AutoDocsToast.ok(
            input.checked
              ? (name ? name.name : 'Integração') + ' ativada.'
              : (name ? name.name : 'Integração') + ' desativada.',
            3200
          );
        }
      });
      grid.addEventListener('click', e => {
        const btn = e.target.closest('.integracao-btn-edit');
        if (!btn) return;
        const id = btn.getAttribute('data-integration-id');
        if (id) openDetails(id);
      });
    }

    const btnNova = document.getElementById('integracoes-btn-nova');
    if (btnNova && !btnNova.dataset.bound) {
      btnNova.dataset.bound = '1';
      btnNova.addEventListener('click', () => {
        if (window.AutoDocsToast) {
          window.AutoDocsToast.info('Novas integrações estarão disponíveis em breve.', 4000);
        }
      });
    }

    const modalBg = document.getElementById('integracao-modal-bg');
    if (modalBg && !modalBg.dataset.bound) {
      modalBg.dataset.bound = '1';
      modalBg.addEventListener('click', e => {
        if (e.target === modalBg) closeModal();
      });
    }

    const modalClose = document.getElementById('integracao-modal-close');
    if (modalClose && !modalClose.dataset.bound) {
      modalClose.dataset.bound = '1';
      modalClose.addEventListener('click', closeModal);
    }
  }

  function tryStart() {
    if (!document.getElementById('integracoes-grid')) return;
    render();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryStart);
  } else {
    tryStart();
  }
  document.addEventListener('autodocs-page-ready', tryStart);
})();
