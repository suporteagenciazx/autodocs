document.addEventListener('DOMContentLoaded', () => {
  const configurations = [
    { inputId: 'i-validade', targetId: 'validade', originalText: '[VALIDADE]', format: 'date-br' },
    { inputId: 'i-documentacao', targetId: 'documentacao', originalText: '[DOCUMENTACAO]' },
    { inputId: 'i-finalidade', targetId: 'finalidade', originalText: '[FINALIDADE]' },
    { inputId: 'i-cnpj', targetId: 'cnpj', originalText: '[CNPJ]' },
    { inputId: 'i-razao', targetId: 'razao-social', originalText: '[RAZAO-SOCIAL]' },
    { inputId: 'i-telefone', targetId: 'telefone', originalText: '[TELEFONE]' },
    { inputId: 'i-tributos', targetId: 'tributos', originalText: 'R$ [TRIBUTOS]' },
    { inputId: 'i-custos', targetId: 'custos', originalText: 'R$ [CUSTOS]' },
    { inputId: 'i-total', targetId: 'total', originalText: 'R$ [TOTAL]' },
    { inputId: 'i-economista', targetId: 'economista', originalText: '[ECONOMISTA]' },
    { inputId: 'i-cofecon', targetId: 'cofecon', originalText: '[COFECON]' },
  ];

  function formatDateBR(value) {
    const parts = String(value || '').split('-');
    if (parts.length !== 3) return value;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

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

  function syncTotal() {
    const tributos = document.getElementById('i-tributos');
    const custos = document.getElementById('i-custos');
    const total = document.getElementById('i-total');
    if (!tributos || !custos || !total) return;
    const sum = parseMoney(tributos.value) + parseMoney(custos.value);
    total.value = formatMoney(sum);
    total.dispatchEvent(new Event('input', { bubbles: true }));
  }

  configurations.forEach(config => {
    const input = document.getElementById(config.inputId);
    const targets = document.querySelectorAll('[id="' + config.targetId + '"]');
    if (!input || !targets.length) return;

    const paint = () => {
      const filled = input.value.trim() !== '';
      let value = filled ? input.value.trim() : config.originalText;
      if (filled && config.format === 'date-br') value = formatDateBR(input.value);
      targets.forEach(target => {
        target.textContent = value;
      });
    };

    paint();
    input.addEventListener('input', paint);
    input.addEventListener('change', paint);
  });

  ['i-tributos', 'i-custos'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', syncTotal);
    el.addEventListener('change', syncTotal);
  });

  // Validade padrão: +15 dias
  const validade = document.getElementById('i-validade');
  if (validade && !validade.value) {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    validade.value =
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0');
    validade.dispatchEvent(new Event('input', { bubbles: true }));
  }

  syncTotal();
});
