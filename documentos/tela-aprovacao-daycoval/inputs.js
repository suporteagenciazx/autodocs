document.addEventListener('DOMContentLoaded', () => {
  const STATUS_ICONS = {
    warning: 'warning',
    check: 'check_circle',
    block: 'block',
  };

  const PROTOCOLO_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const DIGITS = '0123456789';

  const configurations = [
    { inputId: 'i-gerente', targetId: 'gerente', originalText: '[GERENTE]' },
    { inputId: 'i-titular', targetId: 'titular', originalText: '[TITULAR]' },
    { inputId: 'i-razao', targetId: 'razao', originalText: '[RAZAO-SOCIAL]' },
    { inputId: 'i-fantasia', targetId: 'fantasia', originalText: '[NOME-FANTASIA]' },
    { inputId: 'i-cnpj', targetId: 'cnpj', originalText: '[CNPJ]' },
    { inputId: 'i-abertura', targetId: 'abertura', originalText: '[DATA-ABERTURA]', format: 'date-br' },
    { inputId: 'i-cnae', targetId: 'cnae', originalText: '[CNAE]' },
    { inputId: 'i-status', targetId: 'status', originalText: '[STATUS]' },
    { inputId: 'i-protocolo', targetId: 'protocolo', originalText: '[PROTOCOLO]' },
    { inputId: 'i-codigo', targetId: 'codigo', originalText: '[CODIGO]' },
    { inputId: 'i-valor', targetId: 'valor', originalText: 'R$ 0,00' },
    { inputId: 'i-parcelas', targetId: 'parcelas', originalText: '[PARCELAS]', format: 'parcelas' },
    { inputId: 'i-prazo', targetId: 'prazo', originalText: '[PRAZO]' },
    { inputId: 'i-status-pagamento', targetId: 'status-pagamento', originalText: '[STATUS-PAGAMENTO]' },
  ];

  function formatDateBR(value) {
    const parts = String(value || '').split('-');
    if (parts.length !== 3) return value;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function paint(config) {
    const input = document.getElementById(config.inputId);
    const target = document.getElementById(config.targetId);
    if (!input || !target) return;

    const filled = input.value.trim() !== '';
    let value = filled ? input.value.trim() : config.originalText;
    if (filled && config.format === 'parcelas' && /^\d+$/.test(value)) {
      value = value + 'x';
    }
    if (filled && config.format === 'date-br') {
      value = formatDateBR(value);
    }
    target.textContent = value;

    if (config.inputId === 'i-gerente') {
      const wrap = target.closest('.ta-gerente');
      if (wrap) wrap.hidden = !filled;
    }
  }

  function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function randomToken(alphabet, length) {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }

  /**
   * Protocolo Daycoval: 20 caracteres alfanuméricos (sem I/O).
   * Ex.: 290JKFSJ92181K0W2022
   */
  function gerarProtocolo() {
    return randomToken(PROTOCOLO_ALPHABET, 20);
  }

  /**
   * Código da proposta: DDMMAAAA + 8 dígitos + "-" + 1 dígito.
   * Ex.: 0806202263798458-5
   */
  function gerarCodigoProposta(refDate) {
    const d = refDate instanceof Date ? refDate : new Date();
    const stamp =
      String(d.getDate()).padStart(2, '0') +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getFullYear());
    return stamp + randomToken(DIGITS, 8) + '-' + randomToken(DIGITS, 1);
  }

  configurations.forEach(config => {
    const input = document.getElementById(config.inputId);
    if (!input) return;
    paint(config);
    input.addEventListener('input', () => paint(config));
    input.addEventListener('change', () => paint(config));
  });

  function syncResultado() {
    const select = document.getElementById('i-resultado');
    const pill = document.getElementById('resultado');
    if (!select || !pill) return;
    const value = select.value || 'Aprovado';
    pill.textContent = value;
    pill.classList.remove('ta-pill--ok', 'ta-pill--warn', 'ta-pill--bad');
    if (/negad/i.test(value)) pill.classList.add('ta-pill--bad');
    else if (/an[aá]lise/i.test(value)) pill.classList.add('ta-pill--warn');
    else pill.classList.add('ta-pill--ok');
  }

  function syncStatusIcon() {
    const select = document.getElementById('i-status-icon');
    const icon = document.getElementById('status-icon');
    if (!select || !icon) return;
    const kind = select.value in STATUS_ICONS ? select.value : 'warning';
    icon.dataset.kind = kind;
    icon.hidden = false;
    const glyph = icon.querySelector('.material-symbols-rounded');
    if (glyph) glyph.textContent = STATUS_ICONS[kind];
  }

  const resultado = document.getElementById('i-resultado');
  if (resultado) {
    syncResultado();
    resultado.addEventListener('change', syncResultado);
  }

  const statusIcon = document.getElementById('i-status-icon');
  if (statusIcon) {
    syncStatusIcon();
    statusIcon.addEventListener('change', syncStatusIcon);
  }

  const btnProtocolo = document.getElementById('btn-gerar-protocolo');
  if (btnProtocolo) {
    btnProtocolo.addEventListener('click', () => setInputValue('i-protocolo', gerarProtocolo()));
  }

  const btnCodigo = document.getElementById('btn-gerar-codigo');
  if (btnCodigo) {
    btnCodigo.addEventListener('click', () => setInputValue('i-codigo', gerarCodigoProposta()));
  }

  // Preenche na abertura se ainda vazios.
  const protocolo = document.getElementById('i-protocolo');
  if (protocolo && !protocolo.value.trim()) setInputValue('i-protocolo', gerarProtocolo());

  const codigo = document.getElementById('i-codigo');
  if (codigo && !codigo.value.trim()) setInputValue('i-codigo', gerarCodigoProposta());
});
