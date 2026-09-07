(function () {
  const RISK_LABEL = {
    baixo: 'risco baixo',
    medio: 'risco médio',
    alto: 'risco alto',
  };

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function paintTexts() {
    const map = [
      { id: 'i-razao', target: 'razao-social', empty: '[RAZAO-SOCIAL]' },
      { id: 'i-cnpj', target: 'cnpj', empty: '[CNPJ]' },
      { id: 'i-banco', target: 'banco-empresa', empty: '[BANCO-EMPRESA]' },
      { id: 'i-credito', target: 'credito', empty: '[CREDITO]' },
    ];
    map.forEach(cfg => {
      const input = document.getElementById(cfg.id);
      const target = document.getElementById(cfg.target);
      if (!input || !target) return;
      const v = input.value.trim();
      target.textContent = v || cfg.empty;
    });

    const chanceIn = document.getElementById('i-chance');
    const chanceOut = document.getElementById('chance-valor');
    if (chanceIn && chanceOut) {
      const c = clamp(parseInt(chanceIn.value, 10) || 0, 0, 100);
      chanceOut.textContent = String(c);
    }

    const riscoIn = document.getElementById('i-risco');
    const riscoOut = document.getElementById('risco-texto');
    if (riscoIn && riscoOut) {
      riscoOut.textContent = RISK_LABEL[riscoIn.value] || RISK_LABEL.medio;
    }
  }

  function paintScore() {
    const scoreIn = document.getElementById('i-score');
    const scoreOut = document.getElementById('score-valor');
    const arrow = document.getElementById('sb-arrow');
    if (!scoreIn || !scoreOut) return;

    const score = clamp(parseInt(scoreIn.value, 10) || 0, 0, 1000);
    scoreOut.textContent = String(score);

    // Semicírculo: π (0 / esquerda) → 0 (1000 / direita); setinha no arco
    const t = score / 1000;
    const angle = Math.PI - t * Math.PI;
    const cx = 140;
    const cy = 140;
    const r = 96; // raio interno do arco (evita cruzar o número)
    const x = cx + r * Math.cos(angle);
    const y = cy - r * Math.sin(angle);
    const rot = 90 - (angle * 180) / Math.PI;

    if (arrow) {
      arrow.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + rot + ')');
    }
  }

  function paint() {
    paintTexts();
    paintScore();
  }

  function bind() {
    ['i-razao', 'i-cnpj', 'i-banco', 'i-credito', 'i-chance', 'i-risco', 'i-score'].forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.dataset.bound === '1') return;
      el.dataset.bound = '1';
      el.addEventListener('input', paint);
      el.addEventListener('change', paint);
    });
  }

  function start() {
    if (!document.getElementById('tela-score')) return;
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
