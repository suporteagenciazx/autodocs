document.addEventListener('DOMContentLoaded', () => {
  const configurations = [
    { inputId: 'i-cnpj', targetId: 'cnpj', original: '[CNPJ]' },
    { inputId: 'i-razao', targetId: 'razao-social', original: '[RAZAO-SOCIAL]' },
    { inputId: 'i-credito', targetId: 'credito', original: '[CREDITO]' },
    { inputId: 'i-banco', targetId: 'banco', original: '[BANCO]' },
    { inputId: 'i-empresa', targetId: 'empresa', original: '[EMPRESA]' },
    { inputId: 'i-empresa-cnpj', targetId: 'empresa-cnpj', original: '[CNPJ-EMPRESA]' },
    { inputId: 'i-autarquia', targetId: 'autarquia', original: '[AUTARQUIA]' },
    { inputId: 'i-autarquia-cargo', targetId: 'autarquia-cargo', original: '[CARGO-BACEN]' },
    { inputId: 'i-economista', targetId: 'economista', original: '[ECONOMISTA]' },
    { inputId: 'i-corecon', targetId: 'corecon', original: '[CORECON]' },
  ];

  function formatMoneyBR(cents) {
    const n = (cents || 0) / 100;
    return (
      'R$ ' +
      n.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function parseMoneyToCents(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const digits = s.replace(/[^\d,.-]/g, '');
    if (!digits) return null;
    let normalized = digits;
    if (normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if ((normalized.match(/\./g) || []).length > 1) {
      normalized = normalized.replace(/\./g, '');
    }
    const num = Number(normalized);
    if (!Number.isFinite(num)) return null;
    return Math.round(num * 100);
  }

  function syncProtocolo() {
    const el = document.getElementById('protocolo');
    if (!el) return;
    const cnpj = (document.getElementById('i-cnpj')?.value || '').replace(/\D/g, '');
    const tail = (cnpj.slice(-6) || String(Date.now()).slice(-6)).padStart(6, '0');
    el.textContent = 'CDL-BCB-' + tail;
  }

  function paint() {
    configurations.forEach((cfg) => {
      const input = document.getElementById(cfg.inputId);
      const targets = document.querySelectorAll('[id="' + cfg.targetId + '"]');
      if (!input || !targets.length) return;
      const filled = input.value.trim() !== '';
      const value = filled ? input.value.trim() : cfg.original;
      targets.forEach((t) => {
        t.textContent = value;
      });
    });

    const carenciaInput = document.getElementById('i-carencia');
    const carenciaVal = carenciaInput && String(carenciaInput.value).trim() !== ''
      ? String(carenciaInput.value).trim()
      : '[CARENCIA]';
    document.querySelectorAll('[id="carencia"]').forEach((t) => {
      t.textContent = carenciaVal;
    });

    syncProtocolo();
  }

  configurations.forEach((cfg) => {
    const input = document.getElementById(cfg.inputId);
    if (!input) return;
    input.addEventListener('input', paint);
    input.addEventListener('change', paint);
  });

  const creditoInput = document.getElementById('i-credito');
  if (creditoInput) {
    const normalizeCredito = () => {
      const cents = parseMoneyToCents(creditoInput.value);
      if (cents !== null) creditoInput.value = formatMoneyBR(cents);
      paint();
    };
    creditoInput.addEventListener('change', normalizeCredito);
    creditoInput.addEventListener('input', paint);
  }

  const carenciaInput = document.getElementById('i-carencia');
  if (carenciaInput) {
    carenciaInput.addEventListener('input', paint);
    carenciaInput.addEventListener('change', paint);
  }

  paint();

  const toggleCorecon = document.getElementById('i-selo-corecon');
  const seloCorecon = document.getElementById('selo-corecon');
  if (toggleCorecon && seloCorecon) {
    const syncCorecon = () => {
      seloCorecon.hidden = !toggleCorecon.checked;
    };
    syncCorecon();
    toggleCorecon.addEventListener('change', syncCorecon);
  }
});
