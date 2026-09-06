document.addEventListener('DOMContentLoaded', () => {
  const MAX_CARDS = 4;

  const STATUS_META = {
    pago: { label: 'Pago', icon: 'request_quote' },
    pendente: { label: 'Pendente', icon: 'pending_actions' },
    analise: { label: 'Em análise', icon: 'hourglass_top' },
    negado: { label: 'Negado', icon: 'cancel' },
  };

  function paintSimple() {
    const map = [
      { id: 'i-razao', target: 'razao-social', empty: '[RAZAO-SOCIAL]' },
      { id: 'i-cnpj', target: 'cnpj', empty: '[CNPJ]' },
      { id: 'i-porte', target: 'porte', empty: '[PORTE]' },
      { id: 'i-banco', target: 'banco-nome', empty: '[EMPRESA]' },
    ];
    map.forEach(cfg => {
      const input = document.getElementById(cfg.id);
      const target = document.getElementById(cfg.target);
      if (!input || !target) return;
      const v = input.value.trim();
      target.textContent = v || cfg.empty;
    });
  }

  function getBlocks() {
    return Array.from(document.querySelectorAll('#af-cards-lista .af-servico-bloco'));
  }

  function statusIcon(status) {
    return (STATUS_META[status] && STATUS_META[status].icon) || 'description';
  }

  function statusLabel(status) {
    return (STATUS_META[status] && STATUS_META[status].label) || 'Pendente';
  }

  function renderCards() {
    const host = document.getElementById('af-cards-doc');
    if (!host) return;
    host.innerHTML = '';
    getBlocks().forEach(block => {
      const status = (block.querySelector('[data-field="status"]') || {}).value || 'pago';
      const doc = ((block.querySelector('[data-field="doc"]') || {}).value || '').trim() || '[DOCUMENTACAO]';
      const valor = ((block.querySelector('[data-field="valor"]') || {}).value || '').trim() || 'R$ 0,00';

      const card = document.createElement('div');
      card.className = 'af-card';
      card.setAttribute('data-status', status);
      card.innerHTML =
        '<span class="af-card-info" aria-hidden="true">i</span>' +
        '<div class="af-card-icon"><span class="material-symbols-rounded">' +
        statusIcon(status) +
        '</span></div>' +
        '<p class="af-card-status">' +
        statusLabel(status) +
        ':</p>' +
        '<p class="af-card-doc"></p>' +
        '<p class="af-card-valor"></p>';
      card.querySelector('.af-card-doc').textContent = doc;
      card.querySelector('.af-card-valor').textContent = valor;
      host.appendChild(card);
    });
    updateAddButton();
  }

  function updateAddButton() {
    const btn = document.getElementById('af-add-card');
    if (!btn) return;
    const count = getBlocks().length;
    btn.disabled = count >= MAX_CARDS;
    btn.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">add</span> ' +
      (count >= MAX_CARDS ? 'Máximo de 4 cards' : 'Adicionar card (' + count + '/4)');
  }

  function renumber() {
    getBlocks().forEach((block, idx) => {
      const title = block.querySelector('.af-servico-titulo');
      if (title) title.textContent = 'Card ' + (idx + 1);
      const rem = block.querySelector('.af-servico-remover');
      if (rem) rem.disabled = getBlocks().length <= 1;
    });
  }

  function bindBlock(block) {
    block.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', renderCards);
      el.addEventListener('change', renderCards);
    });
    const rem = block.querySelector('.af-servico-remover');
    if (rem) {
      rem.addEventListener('click', () => {
        if (getBlocks().length <= 1) return;
        block.remove();
        renumber();
        renderCards();
      });
    }
  }

  function createBlock(defaults) {
    const d = defaults || {};
    const wrap = document.createElement('div');
    wrap.className = 'af-servico-bloco';
    wrap.innerHTML =
      '<div class="af-servico-topo">' +
      '<h3 class="af-servico-titulo">Card</h3>' +
      '<button type="button" class="af-servico-remover">Remover</button>' +
      '</div>' +
      '<div class="base-boxcampos">' +
      '<div class="campo"><div class="label"><label class="label-campo">Status</label></div>' +
      '<select data-field="status">' +
      '<option value="pago">Pago</option>' +
      '<option value="pendente">Pendente</option>' +
      '<option value="analise">Em análise</option>' +
      '<option value="negado">Negado</option>' +
      '</select></div>' +
      '<div class="campo"><div class="label"><label class="label-campo">Documentação / serviço</label></div>' +
      '<input class="input" data-field="doc" type="text" value="' +
      (d.doc || '') +
      '"></div>' +
      '<div class="campo"><div class="label"><label class="label-campo">Valor</label></div>' +
      '<input class="input" data-field="valor" type="text" value="' +
      (d.valor || 'R$ 0,00') +
      '" data-aleatorio data-aleatorio-variacao="0.2" data-aleatorio-min="100"></div>' +
      '</div>';
    const sel = wrap.querySelector('[data-field="status"]');
    if (sel) sel.value = d.status || 'pago';
    return wrap;
  }

  function addCard(defaults) {
    const lista = document.getElementById('af-cards-lista');
    if (!lista || getBlocks().length >= MAX_CARDS) return;
    const block = createBlock(defaults);
    lista.appendChild(block);
    bindBlock(block);
    renumber();
    renderCards();
  }

  ['i-razao', 'i-cnpj', 'i-porte', 'i-banco'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', paintSimple);
    el.addEventListener('change', paintSimple);
  });

  const addBtn = document.getElementById('af-add-card');
  if (addBtn) addBtn.addEventListener('click', () => addCard());

  paintSimple();
  addCard({ status: 'pago', doc: 'TJC', valor: 'R$ 1.500,00' });
});
