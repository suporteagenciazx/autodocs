document.addEventListener('DOMContentLoaded', () => {
  const configurations = [
    { inputId: 'i-documentacao', targetId: 'documentacao', original: '[DOCUMENTACAO]' },
    { inputId: 'i-cnpj', targetId: 'cnpj', original: '[CNPJ]' },
    { inputId: 'i-razao', targetId: 'razao-social', original: '[RAZAO-SOCIAL]' },
    { inputId: 'i-codigo', targetId: 'codigo', original: '[CODIGO]' },
    { inputId: 'i-valor', targetId: 'valor', original: '[VALOR]' },
    { inputId: 'i-empresa', targetId: 'empresa', original: '[EMPRESA]' },
    { inputId: 'i-empresa-cnpj', targetId: 'empresa-cnpj', original: '[CNPJ-EMPRESA]' },
    { inputId: 'i-contato', targetId: 'contato', original: '[CONTATO]' },
    { inputId: 'i-economista', targetId: 'economista', original: '[ECONOMISTA]' },
    { inputId: 'i-cargo', targetId: 'cargo', original: '[CARGO]' },
  ];

  function formatDateBR(value) {
    const parts = String(value || '').split('-');
    if (parts.length !== 3) return value || '';
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function paint() {
    configurations.forEach(cfg => {
      const input = document.getElementById(cfg.inputId);
      const targets = document.querySelectorAll('[id="' + cfg.targetId + '"]');
      if (!input || !targets.length) return;
      const filled = input.value.trim() !== '';
      const value = filled ? input.value.trim() : cfg.original;
      targets.forEach(t => {
        t.textContent = value;
      });
    });

    const data = document.getElementById('i-data-servico');
    document.querySelectorAll('[id="data-servico"]').forEach(t => {
      t.textContent = data && data.value ? formatDateBR(data.value) : '[DATA-SERVICO]';
    });
  }

  configurations.forEach(cfg => {
    const input = document.getElementById(cfg.inputId);
    if (!input) return;
    input.addEventListener('input', paint);
    input.addEventListener('change', paint);
  });

  const data = document.getElementById('i-data-servico');
  if (data) {
    if (!data.value) {
      const d = new Date();
      data.value =
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0');
    }
    data.addEventListener('input', paint);
    data.addEventListener('change', paint);
  }

  paint();
});
