document.addEventListener('DOMContentLoaded', () => {
  const MAX_SERVICOS = 4;

  const simpleMap = [
    { inputId: 'i-chave', targetId: 'chave', original: '[CHAVE]' },
    { inputId: 'i-nf-numero', targetId: 'nf-numero', original: '[NUMERO]' },
    { inputId: 'i-serie', targetId: 'nf-serie', original: '[SERIE]' },
    { inputId: 'i-natureza', targetId: 'natureza', original: '[NATUREZA]' },
    { inputId: 'i-protocolo', targetId: 'protocolo', original: '[PROTOCOLO]' },
    { inputId: 'i-villela-cnpj', targetId: 'villela-cnpj', original: '[CNPJ-VILLELA]' },
    { inputId: 'i-razao', targetId: 'razao-social', original: '[RAZAO-SOCIAL]' },
    { inputId: 'i-cnpj', targetId: 'cnpj', original: '[CNPJ]' },
    { inputId: 'i-bairro', targetId: 'bairro', original: '[BAIRRO]' },
    { inputId: 'i-cep', targetId: 'cep', original: '[CEP]' },
    { inputId: 'i-cidade', targetId: 'municipio', original: '[MUNICIPIO]' },
    { inputId: 'i-uf', targetId: 'uf', original: '[UF]' },
    { inputId: 'i-telefone', targetId: 'telefone', original: '[TELEFONE]' },
    { inputId: 'i-hora', targetId: 'hora', original: '[HORA]' },
    { inputId: 'i-icms', targetId: 'icms', original: 'R$ [ICMS]' },
    { inputId: 'i-info-complementar', targetId: 'info-complementar', original: '' },
  ];

  function parseMoney(raw) {
    const cleaned = String(raw || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function formatMoney(n) {
    return (
      'R$ ' +
      n.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatDateBR(value) {
    const parts = String(value || '').split('-');
    if (parts.length !== 3) return value || '';
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function paintSimple() {
    simpleMap.forEach(cfg => {
      const input = document.getElementById(cfg.inputId);
      const targets = document.querySelectorAll('[id="' + cfg.targetId + '"]');
      if (!input || !targets.length) return;
      const filled = input.value.trim() !== '';
      let value = filled ? input.value.trim() : cfg.original;
      targets.forEach(t => {
        t.textContent = value;
      });
    });

    const emissao = document.getElementById('i-emissao');
    const emissaoTargets = document.querySelectorAll('[id="emissao"]');
    if (emissao && emissaoTargets.length) {
      const v = emissao.value ? formatDateBR(emissao.value) : '[EMISSAO]';
      emissaoTargets.forEach(t => {
        t.textContent = v;
      });
    }

    // Endereço: logradouro + número (OpenCNPJ: i-logradouro / i-numero)
    const log = document.getElementById('i-logradouro');
    const num = document.getElementById('i-numero');
    const endTargets = document.querySelectorAll('[id="endereco"]');
    if (log && endTargets.length) {
      const parts = [log.value.trim(), (num && num.value.trim()) || ''].filter(Boolean);
      const text = parts.length ? parts.join(', ') : '[ENDERECO]';
      endTargets.forEach(t => {
        t.textContent = text;
      });
    }
  }

  function bindSimple() {
    simpleMap.forEach(cfg => {
      const input = document.getElementById(cfg.inputId);
      if (!input) return;
      input.addEventListener('input', paintSimple);
      input.addEventListener('change', paintSimple);
    });
    ['i-emissao', 'i-logradouro', 'i-numero'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', paintSimple);
      el.addEventListener('change', paintSimple);
    });
  }

  function getServicoBlocks() {
    return Array.from(document.querySelectorAll('#nfe-servicos-lista .nfe-servico-bloco'));
  }

  function syncServicosDoc() {
    const blocks = getServicoBlocks();
    let total = 0;

    for (let i = 0; i < MAX_SERVICOS; i++) {
      const row = document.getElementById('prod-row-' + (i + 1));
      if (!row) continue;
      const block = blocks[i];
      const set = (sel, text) => {
        const el = row.querySelector(sel);
        if (el) el.textContent = text;
      };

      if (!block) {
        row.classList.add('is-empty');
        set('[data-col="codigo"]', '');
        set('[data-col="descricao"]', '');
        set('[data-col="ncm"]', '');
        set('[data-col="quant"]', '');
        set('[data-col="vunit"]', '');
        set('[data-col="vtotal"]', '');
        set('[data-col="bc"]', '');
        set('[data-col="vicms"]', '');
        set('[data-col="vipi"]', '');
        set('[data-col="alicms"]', '');
        set('[data-col="alipi"]', '');
        continue;
      }
      row.classList.remove('is-empty');

      const get = name => {
        const el = block.querySelector('[data-field="' + name + '"]');
        return el ? el.value.trim() : '';
      };

      const quant = parseFloat(String(get('quant')).replace(',', '.')) || 0;
      const unit = parseMoney(get('valor'));
      const linhaTotal = quant * unit;
      total += linhaTotal;

      set('[data-col="codigo"]', get('codigo') || '—');
      set('[data-col="descricao"]', get('descricao') || '[DOCUMENTO]');
      set('[data-col="ncm"]', get('ncm') || '—');
      set('[data-col="quant"]', quant ? String(quant).replace('.', ',') : '—');
      set('[data-col="vunit"]', get('valor') ? formatMoney(unit) : 'R$ [VALOR]');
      set('[data-col="vtotal"]', get('valor') ? formatMoney(linhaTotal) : 'R$ [VALOR]');
      set('[data-col="bc"]', '0,00');
      set('[data-col="vicms"]', get('vicms') || '0,00');
      set('[data-col="vipi"]', '0,00');
      set('[data-col="alicms"]', get('alicms') || '0,00');
      set('[data-col="alipi"]', '0,00');
    }

    const totalStr = formatMoney(total);
    document.querySelectorAll('[id="total-produtos"]').forEach(el => {
      el.textContent = totalStr;
    });
    document.querySelectorAll('[id="total-nota"]').forEach(el => {
      el.textContent = totalStr;
    });
    document.querySelectorAll('[id="total-servicos"]').forEach(el => {
      el.textContent = totalStr;
    });
    document.querySelectorAll('[id="base-issqn"]').forEach(el => {
      el.textContent = totalStr;
    });

    const totalInput = document.getElementById('i-total');
    if (totalInput) totalInput.value = totalStr;

    updateAddButton();
  }

  function updateAddButton() {
    const btn = document.getElementById('nfe-add-servico');
    if (!btn) return;
    const count = getServicoBlocks().length;
    btn.disabled = count >= MAX_SERVICOS;
    const label =
      count >= MAX_SERVICOS
        ? 'Máximo de 4 serviços'
        : 'Adicionar serviço (' + count + '/4)';
    btn.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">add</span> ' + label;
  }

  function bindServicoBlock(block) {
    block.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', syncServicosDoc);
      input.addEventListener('change', syncServicosDoc);
    });
    const rem = block.querySelector('.nfe-servico-remover');
    if (rem) {
      rem.addEventListener('click', () => {
        const blocks = getServicoBlocks();
        if (blocks.length <= 1) return;
        block.remove();
        renumberServicos();
        syncServicosDoc();
      });
    }
  }

  function renumberServicos() {
    getServicoBlocks().forEach((block, idx) => {
      const title = block.querySelector('.nfe-servico-titulo');
      if (title) title.textContent = 'Serviço ' + (idx + 1);
      const rem = block.querySelector('.nfe-servico-remover');
      if (rem) rem.disabled = getServicoBlocks().length <= 1;
    });
  }

  function createServicoBlock(defaults) {
    const d = defaults || {};
    const wrap = document.createElement('div');
    wrap.className = 'nfe-servico-bloco';
    wrap.innerHTML =
      '<div class="nfe-servico-topo">' +
      '<h3 class="nfe-servico-titulo">Serviço</h3>' +
      '<button type="button" class="nfe-servico-remover">Remover</button>' +
      '</div>' +
      '<div class="base-boxcampos">' +
      '<div class="campo"><div class="label"><label class="label-campo">Descrição</label></div>' +
      '<input class="input" data-field="descricao" type="text" value="' +
      (d.descricao || '') +
      '"></div>' +
      '<div class="campo"><div class="label"><label class="label-campo">Valor unitário</label></div>' +
      '<input class="input" data-field="valor" type="text" value="' +
      (d.valor || 'R$ 0,00') +
      '"></div>' +
      '<div class="campo"><div class="label"><label class="label-campo">Quantidade</label></div>' +
      '<input class="input" data-field="quant" type="text" value="' +
      (d.quant || '1') +
      '"></div>' +
      '<div class="campo"><div class="label"><label class="label-campo">Código</label></div>' +
      '<input class="input" data-field="codigo" type="text" value="' +
      (d.codigo || '7524310790') +
      '"></div>' +
      '<div class="campo"><div class="label"><label class="label-campo">NCM / SH</label></div>' +
      '<input class="input" data-field="ncm" type="text" value="' +
      (d.ncm || '4534944') +
      '"></div>' +
      '<div class="campo"><div class="label"><label class="label-campo">Alíq. ICMS (%)</label></div>' +
      '<input class="input" data-field="alicms" type="text" value="' +
      (d.alicms || '7,00') +
      '"></div>' +
      '<div class="campo"><div class="label"><label class="label-campo">V. ICMS</label></div>' +
      '<input class="input" data-field="vicms" type="text" value="' +
      (d.vicms || '0,00') +
      '"></div>' +
      '</div>';
    return wrap;
  }

  function addServico(defaults) {
    const lista = document.getElementById('nfe-servicos-lista');
    if (!lista || getServicoBlocks().length >= MAX_SERVICOS) return;
    const block = createServicoBlock(defaults);
    lista.appendChild(block);
    bindServicoBlock(block);
    renumberServicos();
    syncServicosDoc();
  }

  // Defaults emissão / hora
  const emissao = document.getElementById('i-emissao');
  if (emissao && !emissao.value) {
    const d = new Date();
    emissao.value =
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0');
  }
  const hora = document.getElementById('i-hora');
  if (hora && !hora.value) {
    const d = new Date();
    hora.value =
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0');
  }

  bindSimple();
  paintSimple();

  const addBtn = document.getElementById('nfe-add-servico');
  if (addBtn) {
    addBtn.addEventListener('click', () => addServico());
  }

  // Serviço inicial conforme PDF
  addServico({
    descricao: 'Preparação de documentos e serviços',
    valor: 'R$ 1.450,00',
    quant: '1',
    codigo: '7524310790',
    ncm: '4534944',
    alicms: '7,00',
    vicms: '0,00',
  });

  // Re-paint endereço quando OpenCNPJ preenche campos
  document.addEventListener('input', e => {
    const id = e.target && e.target.id;
    if (
      id === 'i-logradouro' ||
      id === 'i-numero' ||
      id === 'i-bairro' ||
      id === 'i-cep' ||
      id === 'i-cidade' ||
      id === 'i-uf' ||
      id === 'i-telefone' ||
      id === 'i-razao' ||
      id === 'i-cnpj'
    ) {
      paintSimple();
    }
  });
});
