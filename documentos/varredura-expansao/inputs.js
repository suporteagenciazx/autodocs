document.addEventListener('DOMContentLoaded', () => {
  const configurations = [
    { inputId: 'i-titular', targetId: 'titular', originalText: '[TITULAR]' },
    { inputId: 'i-cpf', targetId: 'cpf', originalText: '[CPF]' },
    { inputId: 'i-cnpj', targetId: 'cnpj', originalText: '[CNPJ]' },
    { inputId: 'i-banco-recebimento', targetId: 'banco-recebimento', originalText: '[BANCO-RECEBIMENTO]' },
    { inputId: 'i-agencia', targetId: 'agencia', originalText: '[AGENCIA]' },
    { inputId: 'i-conta', targetId: 'conta', originalText: '[CONTA]' },
    { inputId: 'i-status', targetId: 'status', originalText: '[STATUS]' },
    { inputId: 'i-capacidade', targetId: 'capacidade', originalText: '[CAPACIDADE]' },
    { inputId: 'i-modalidades', targetId: 'modalidades', originalText: 'PIX, TED E DOC' },
    { inputId: 'i-elegibilidade', targetId: 'elegibilidade', originalText: '[ELEGIBILIDADE]' },
  ];

  configurations.forEach(config => {
    const input = document.getElementById(config.inputId);
    const targets = document.querySelectorAll('[id="' + config.targetId + '"]');
    if (!input || !targets.length) return;
    const paint = () => {
      const filled = String(input.value || '').trim() !== '';
      const value = filled ? input.value : config.originalText;
      targets.forEach(t => {
        t.textContent = value;
      });
    };
    paint();
    input.addEventListener('input', paint);
    input.addEventListener('change', paint);
  });

  const escalaInput = document.getElementById('i-escala');
  const escalaLabel = document.getElementById('escala');
  const escalaFill = document.getElementById('escala-fill');
  const escalaFormValue = document.getElementById('i-escala-value');
  const escalaFormFill = document.getElementById('i-escala-preview-fill');

  const syncEscala = () => {
    let n = parseInt(escalaInput && escalaInput.value, 10);
    if (!Number.isFinite(n)) n = 0;
    n = Math.max(0, Math.min(100, n));
    if (escalaInput && String(escalaInput.value) !== String(n)) escalaInput.value = String(n);
    if (escalaInput) escalaInput.setAttribute('aria-valuenow', String(n));
    if (escalaLabel) escalaLabel.textContent = String(n);
    if (escalaFill) escalaFill.style.width = n + '%';
    if (escalaFormValue) escalaFormValue.textContent = n + '%';
    if (escalaFormFill) escalaFormFill.style.width = n + '%';
  };

  if (escalaInput) {
    escalaInput.addEventListener('input', syncEscala);
    escalaInput.addEventListener('change', syncEscala);
  }
  syncEscala();
});
