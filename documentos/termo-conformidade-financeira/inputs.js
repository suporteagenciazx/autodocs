(function () {
  const map = [
    { id: 'i-cliente', target: 'cliente', empty: '[CLIENTE]' },
    { id: 'i-cnpj', target: 'cnpj', empty: '[CNPJ]' },
    { id: 'i-credito', target: 'credito', empty: '[CREDITO]' },
    { id: 'i-parcelas', target: 'parcelas', empty: '[QTD-PARCELAS]' },
    { id: 'i-valor-parcela', target: 'valor-parcela', empty: '[VALOR-PARCELA]' },
    { id: 'i-carencia', target: 'carencia', empty: '[CARENCIA]' },
    { id: 'i-taxa', target: 'taxa', empty: '[TAXA]' },
    { id: 'i-banco', target: 'banco', empty: '[BANCO]' },
    { id: 'i-agencia', target: 'agencia', empty: '[AGENCIA]' },
    { id: 'i-conta', target: 'conta', empty: '[CONTA]' },
  ];

  function paint() {
    map.forEach(cfg => {
      const input = document.getElementById(cfg.id);
      const target = document.getElementById(cfg.target);
      if (!input || !target) return;
      const v = input.value.trim();
      target.textContent = v || cfg.empty;
    });
  }

  function bind() {
    map.forEach(cfg => {
      const el = document.getElementById(cfg.id);
      if (!el || el.dataset.bound === '1') return;
      el.dataset.bound = '1';
      el.addEventListener('input', paint);
      el.addEventListener('change', paint);
    });
  }

  function start() {
    if (!document.getElementById('termo-conformidade-financeira')) return;
    bind();
    paint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  document.addEventListener('autodocs-page-ready', start);
})();
