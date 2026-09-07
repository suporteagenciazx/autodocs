document.addEventListener('DOMContentLoaded', () => {
  const configurations = [
    { inputId: 'i-cnpj', targetId: 'cnpj', original: '[CNPJ]' },
    { inputId: 'i-razao', targetId: 'razao-social', original: '[RAZAO-SOCIAL]' },
    { inputId: 'i-credito', targetId: 'credito', original: '[CREDITO]' },
    { inputId: 'i-credito-extenso', targetId: 'credito-extenso', original: '[CREDITO-POR-EXTENSO]' },
    { inputId: 'i-banco', targetId: 'banco', original: '[BANCO]' },
    { inputId: 'i-empresa', targetId: 'empresa', original: '[EMPRESA]' },
    { inputId: 'i-empresa-cnpj', targetId: 'empresa-cnpj', original: '[CNPJ-EMPRESA]' },
    { inputId: 'i-autarquia', targetId: 'autarquia', original: '[AUTARQUIA]' },
    { inputId: 'i-autarquia-cargo', targetId: 'autarquia-cargo', original: '[CARGO-BACEN]' },
    { inputId: 'i-economista', targetId: 'economista', original: '[ECONOMISTA]' },
    { inputId: 'i-corecon', targetId: 'corecon', original: '[CORECON]' },
  ];

  const unidades = [
    '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
  ];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function trecho(n) {
    n = n | 0;
    if (n === 0) return '';
    if (n === 100) return 'cem';
    if (n < 20) return unidades[n];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return dezenas[d] + (u ? ' e ' + unidades[u] : '');
    }
    const c = Math.floor(n / 100);
    const r = n % 100;
    return centenas[c] + (r ? ' e ' + trecho(r) : '');
  }

  function grupo(n, singular, plural) {
    n = n | 0;
    if (n === 0) return '';
    if (n === 1) return 'um ' + singular;
    return trecho(n) + ' ' + plural;
  }

  function reaisPorExtenso(centavos) {
    let total = Math.round(Number(centavos) || 0);
    if (total < 0) total = 0;
    const reais = Math.floor(total / 100);
    const cents = total % 100;

    if (reais === 0 && cents === 0) return 'zero reais';

    const bi = Math.floor(reais / 1e9);
    const mi = Math.floor((reais % 1e9) / 1e6);
    const mil = Math.floor((reais % 1e6) / 1e3);
    const rest = reais % 1e3;

    const parts = [];
    if (bi) parts.push(grupo(bi, 'bilhão', 'bilhões'));
    if (mi) parts.push(grupo(mi, 'milhão', 'milhões'));
    if (mil) {
      if (mil === 1) parts.push('mil');
      else parts.push(trecho(mil) + ' mil');
    }
    if (rest) parts.push(trecho(rest));

    let texto = parts.join(' e ');
    if (reais === 0) texto = '';
    else if (reais === 1) texto += ' real';
    else texto += ' reais';

    if (cents) {
      const cTxt = cents === 1 ? 'um centavo' : trecho(cents) + ' centavos';
      texto = texto ? texto + ' e ' + cTxt : cTxt;
    }

    return texto;
  }

  function parseMoneyToCents(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const digits = s.replace(/[^\d,.-]/g, '');
    if (!digits) return null;
    // BR: 1.250.000,00 or 1250000,00 or 1250000.00
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

  const creditoInput = document.getElementById('i-credito');
  const extensoInput = document.getElementById('i-credito-extenso');
  let extensoManual = false;

  function syncExtensoFromCredito() {
    if (!creditoInput || !extensoInput || extensoManual) return;
    const cents = parseMoneyToCents(creditoInput.value);
    if (cents === null) {
      extensoInput.value = '';
      return;
    }
    creditoInput.value = formatMoneyBR(cents);
    extensoInput.value = reaisPorExtenso(cents);
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
  }

  configurations.forEach((cfg) => {
    const input = document.getElementById(cfg.inputId);
    if (!input) return;
    input.addEventListener('input', paint);
    input.addEventListener('change', paint);
  });

  if (creditoInput) {
    creditoInput.addEventListener('input', () => {
      extensoManual = false;
      syncExtensoFromCredito();
      paint();
    });
    creditoInput.addEventListener('change', () => {
      extensoManual = false;
      syncExtensoFromCredito();
      paint();
    });
  }

  if (extensoInput) {
    extensoInput.addEventListener('input', () => {
      extensoManual = extensoInput.value.trim() !== '';
      paint();
    });
  }

  syncExtensoFromCredito();
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
