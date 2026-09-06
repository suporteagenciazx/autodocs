document.addEventListener('DOMContentLoaded', () => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const simpleMap = [
    { inputId: 'i-cnpj', targetId: 'cnpj', original: '[CNPJ]' },
    { inputId: 'i-razao', targetId: 'razao-social', original: '[RAZAO-SOCIAL]' },
    { inputId: 'i-email-cnpj', targetId: 'email-cnpj', original: '[EMAIL]' },
    { inputId: 'i-telefone', targetId: 'telefone', original: '[TELEFONE]' },
    { inputId: 'i-endereco-cnpj', targetId: 'endereco-cnpj', original: '[ENDERECO]' },
    { inputId: 'i-cnae', targetId: 'cnae', original: '[CNAE]' },
    { inputId: 'i-funcionarios', targetId: 'funcionarios', original: '[FUNCIONARIOS]' },
    { inputId: 'i-capital-social', targetId: 'capital-social', original: '[CAPITAL-SOCIAL]' },
    { inputId: 'i-porte', targetId: 'porte', original: '[PORTE]' },
    { inputId: 'i-referencia', targetId: 'referencia', original: '[REFERENCIA]' },
    { inputId: 'i-fat-1', targetId: 'fat-1', original: '[FATURAMENTO1]' },
    { inputId: 'i-fat-2', targetId: 'fat-2', original: '[FATURAMENTO2]' },
    { inputId: 'i-fat-3', targetId: 'fat-3', original: '[FATURAMENTO3]' },
    { inputId: 'i-invest-estoque', targetId: 'invest-estoque', original: '[INVESTIMENTO-ESTOQUE]' },
    { inputId: 'i-fat-anual', targetId: 'fat-anual', original: '[FATURAMENTO-ANUAL]' },
    { inputId: 'i-economista-nome', targetId: 'economista-nome', original: '[ECONOMISTA]' },
    { inputId: 'i-economista-cofecon', targetId: 'economista-cofecon', original: '[COFECON]' },
    { inputId: 'i-magnus-cnpj', targetId: 'magnus-cnpj', original: '[MAGNUS-CNPJ]' },
  ];

  const ROWS = [
    { key: 'inicio', label: 'Saldo no início do período' },
    { key: 'ajuste', label: 'Ajuste de exercícios anteriores' },
    { key: 'ajustado', label: 'Saldo inicial ajustado' },
    { key: 'realizacao', label: 'Realização de Reservas' },
    { key: 'capital', label: 'Aumento/Redução do Capital Social' },
    { key: 'tesouraria', label: 'Ações de Tesouraria' },
    { key: 'dividendos', label: 'Dividendos / Lucros distribuídos' },
    { key: 'resultado', label: 'Resultado do exercício' },
    { key: 'outros', label: 'Outros ajustes patrimoniais' },
    { key: 'final', label: 'Saldo no final do período', total: true },
  ];

  const COLS = ['cs', 'rl', 'fe', 'la'];

  let dmpl = null;
  let genTimer = null;

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
      Number(n || 0).toLocaleString('pt-BR', {
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

  function inputVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function jitter(base, pct) {
    return base * (1 + (Math.random() * 2 - 1) * pct);
  }

  function svgNode(tag, attrs, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(k => node.setAttribute(k, String(attrs[k])));
    if (text != null) node.textContent = text;
    return node;
  }

  function paintSimple() {
    simpleMap.forEach(cfg => {
      const input = document.getElementById(cfg.inputId);
      const targets = document.querySelectorAll('[id="' + cfg.targetId + '"]');
      if (!input || !targets.length) return;
      const filled = input.value.trim() !== '';
      const value = filled ? input.value.trim() : cfg.original;
      targets.forEach(t => {
        t.textContent = value;
      });
    });

    const ab = document.getElementById('i-abertura');
    document.querySelectorAll('[id="data-abertura"]').forEach(t => {
      t.textContent = ab && ab.value ? formatDateBR(ab.value) : '[DATA-ABERTURA]';
    });
    const em = document.getElementById('i-data-emissao');
    document.querySelectorAll('[id="data-emissao"]').forEach(t => {
      t.textContent = em && em.value ? formatDateBR(em.value) : '[DATA-EMISSAO]';
    });
  }

  function seedsFilled() {
    const ids = ['i-fat-1', 'i-fat-2', 'i-fat-3', 'i-invest-estoque', 'i-fat-anual', 'i-capital-social'];
    return ids.some(id => parseMoney(inputVal(id)) > 0);
  }

  function generateDmpl() {
    const capital = parseMoney(inputVal('i-capital-social')) || 150000;
    const fatAnual = parseMoney(inputVal('i-fat-anual')) || capital * 8;
    const estoque = parseMoney(inputVal('i-invest-estoque')) || capital * 0.25;

    const cs0 = capital;
    const rl0 = jitter(capital * 0.15, 0.25);
    const fe0 = Math.max(0, jitter(estoque * 0.08, 0.4));
    const la0 = jitter(fatAnual * 0.04, 0.3);

    const ajusteCs = jitter(capital * 0.4, 0.35);
    const ajusteRl = jitter(rl0 * 1.8, 0.4);
    const ajusteFe = jitter(fe0 + 8000, 0.5);
    const ajusteLa = jitter(la0 * 0.6, 0.4);

    const row = (cs, rl, fe, la) => ({ cs, rl, fe, la, total: cs + rl + fe + la });

    const inicio = row(cs0, rl0, fe0, la0);
    const ajuste = row(ajusteCs, ajusteRl, ajusteFe, ajusteLa);
    const ajustado = row(
      Math.max(0, inicio.cs + ajuste.cs * 0.12 - capital * 0.55),
      Math.max(0, inicio.rl * 0.55),
      Math.max(0, inicio.fe * 0.2),
      Math.max(0, inicio.la + ajuste.la * 0.2)
    );

    const realizacao = row(0, -jitter(2000, 0.4), 0, jitter(1500, 0.5));
    const capitalMov = row(jitter(capital * 0.05, 0.8) * (Math.random() > 0.6 ? 1 : 0), jitter(35000, 0.3), 0, 0);
    const tesouraria = row(-jitter(12000, 0.25), -jitter(2000, 0.3), 0, 0);
    const dividendos = row(0, 0, 0, -jitter(fatAnual * 0.015, 0.35));
    const resultado = row(0, jitter(rl0 * 0.2, 0.4), jitter(fe0 * 0.3, 0.5), jitter(fatAnual * 0.06, 0.25));
    const outros = row(jitter(1500, 0.9) * (Math.random() > 0.5 ? 1 : -1), 0, jitter(900, 0.8), 0);

    const sum = keys =>
      row(
        keys.reduce((a, k) => a + k.cs, 0),
        keys.reduce((a, k) => a + k.rl, 0),
        keys.reduce((a, k) => a + k.fe, 0),
        keys.reduce((a, k) => a + k.la, 0)
      );

    const final = sum([ajustado, realizacao, capitalMov, tesouraria, dividendos, resultado, outros]);

    dmpl = {
      inicio,
      ajuste,
      ajustado,
      realizacao,
      capital: capitalMov,
      tesouraria,
      dividendos,
      resultado,
      outros,
      final,
    };

    renderDmplTable();
    renderPlChart();
    renderEvolChart();
  }

  function renderDmplTable() {
    const body = document.getElementById('lae-dmpl-body');
    if (!body || !dmpl) return;
    body.innerHTML = '';
    ROWS.forEach(r => {
      const vals = dmpl[r.key];
      const tr = document.createElement('tr');
      if (r.total) tr.className = 'is-total';
      const cells = [
        r.label,
        formatMoney(vals.cs),
        formatMoney(vals.rl),
        formatMoney(vals.fe),
        formatMoney(vals.la),
        formatMoney(vals.total),
      ];
      cells.forEach((text, i) => {
        const td = document.createElement('td');
        if (i > 0) td.className = 'num';
        td.textContent = text;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function syncFatChart() {
    const bars = document.getElementById('fat-bars');
    const grid = document.getElementById('fat-grid');
    const yLabels = document.getElementById('fat-y-labels');
    const xLabels = document.getElementById('fat-x-labels');
    const vLabels = document.getElementById('fat-value-labels');
    if (!bars) return;

    const values = [parseMoney(inputVal('i-fat-1')), parseMoney(inputVal('i-fat-2')), parseMoney(inputVal('i-fat-3'))];
    const labels = ['Antepenúltimo', 'Penúltimo', 'Último'];
    const max = Math.max(...values, 1);
    const top = 36;
    const bottom = 232;
    const xs = [150, 320, 490];
    const barW = 56;

    bars.innerHTML = '';
    if (grid) grid.innerHTML = '';
    if (yLabels) yLabels.innerHTML = '';
    if (xLabels) xLabels.innerHTML = '';
    if (vLabels) vLabels.innerHTML = '';

    for (let i = 0; i <= 4; i++) {
      const y = top + ((bottom - top) * i) / 4;
      if (grid) {
        grid.appendChild(
          svgNode('line', {
            x1: 72,
            y1: y,
            x2: 616,
            y2: y,
            stroke: '#e6e6e6',
            'stroke-width': 1,
            'stroke-dasharray': '4 5',
          })
        );
      }
      if (yLabels) {
        const tick = max * (1 - i / 4);
        yLabels.appendChild(
          svgNode('text', { x: 64, y: y + 4 }, tick.toLocaleString('pt-BR', { maximumFractionDigits: 0 }))
        );
      }
    }

    xs.forEach((x, i) => {
      const h = (values[i] / max) * (bottom - top);
      const y = bottom - h;
      bars.appendChild(
        svgNode('rect', {
          x: x - barW / 2,
          y: y,
          width: barW,
          height: Math.max(h, 0),
          fill: i === 2 ? '#1b4d3e' : '#5cb85f',
        })
      );
      if (vLabels) {
        const shown = inputVal('i-fat-' + (i + 1));
        vLabels.appendChild(svgNode('text', { x: x, y: y - 10 }, shown || '—'));
      }
      if (xLabels) {
        xLabels.appendChild(svgNode('text', { x: x, y: bottom + 28 }, labels[i]));
      }
    });
  }

  function renderPlChart() {
    const svg = document.getElementById('chart-pl');
    if (!svg || !dmpl) return;
    svg.innerHTML = '';
    const parts = [
      { label: 'Capital', v: Math.max(0, dmpl.final.cs), color: '#1b4d3e' },
      { label: 'Res. Legal', v: Math.max(0, dmpl.final.rl), color: '#2d6a4f' },
      { label: 'Fundos', v: Math.max(0, dmpl.final.fe), color: '#5cb85f' },
      { label: 'Lucros', v: Math.max(0, dmpl.final.la), color: '#95d5b2' },
    ];
    const sum = parts.reduce((a, p) => a + p.v, 0) || 1;
    let angle = -Math.PI / 2;
    const cx = 100;
    const cy = 100;
    const r = 70;

    parts.forEach(p => {
      const slice = (p.v / sum) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      angle += slice;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const large = slice > Math.PI ? 1 : 0;
      const d = [
        'M',
        cx,
        cy,
        'L',
        x1,
        y1,
        'A',
        r,
        r,
        0,
        large,
        1,
        x2,
        y2,
        'Z',
      ].join(' ');
      svg.appendChild(svgNode('path', { d: d, fill: p.color }));
    });

    parts.forEach((p, i) => {
      const y = 28 + i * 22;
      svg.appendChild(svgNode('rect', { x: 190, y: y - 10, width: 10, height: 10, fill: p.color }));
      svg.appendChild(
        svgNode(
          'text',
          { x: 206, y: y, 'font-size': 10, 'font-family': 'Inter, sans-serif', fill: '#333' },
          p.label + ' ' + ((p.v / sum) * 100).toFixed(0) + '%'
        )
      );
    });
  }

  function renderEvolChart() {
    const svg = document.getElementById('chart-evol');
    if (!svg || !dmpl) return;
    svg.innerHTML = '';
    const points = [
      { label: 'Início', v: dmpl.inicio.total },
      { label: 'Ajustado', v: dmpl.ajustado.total },
      { label: 'Final', v: dmpl.final.total },
    ];
    const max = Math.max(...points.map(p => Math.abs(p.v)), 1);
    const top = 24;
    const bottom = 150;
    const xs = [50, 160, 270];

    svg.appendChild(svgNode('line', { x1: 30, y1: bottom, x2: 300, y2: bottom, stroke: '#cfcfcf' }));

    const ys = points.map(p => bottom - (Math.abs(p.v) / max) * (bottom - top));
    const path = xs.map((x, i) => (i === 0 ? 'M' : 'L') + x + ',' + ys[i]).join(' ');
    svg.appendChild(
      svgNode('path', {
        d: path,
        fill: 'none',
        stroke: '#1b4d3e',
        'stroke-width': 2.5,
        'stroke-linejoin': 'round',
      })
    );

    xs.forEach((x, i) => {
      svg.appendChild(svgNode('circle', { cx: x, cy: ys[i], r: 4.5, fill: '#1b4d3e' }));
      svg.appendChild(
        svgNode(
          'text',
          {
            x: x,
            y: ys[i] - 12,
            'font-size': 9,
            'font-family': 'Inter, sans-serif',
            'font-weight': 600,
            fill: '#333',
            'text-anchor': 'middle',
          },
          formatMoney(points[i].v).replace('R$ ', '')
        )
      );
      svg.appendChild(
        svgNode(
          'text',
          {
            x: x,
            y: bottom + 22,
            'font-size': 10,
            'font-family': 'Inter, sans-serif',
            'font-weight': 700,
            fill: '#1a1a1a',
            'text-anchor': 'middle',
          },
          points[i].label
        )
      );
    });
  }

  function scheduleGenerate() {
    if (genTimer) clearTimeout(genTimer);
    genTimer = setTimeout(() => {
      if (seedsFilled()) generateDmpl();
      syncFatChart();
      paintSimple();
    }, 180);
  }

  simpleMap.forEach(cfg => {
    const input = document.getElementById(cfg.inputId);
    if (!input) return;
    input.addEventListener('input', () => {
      paintSimple();
      if (input.hasAttribute('data-seed')) scheduleGenerate();
      if (cfg.inputId.indexOf('i-fat-') === 0) syncFatChart();
    });
    input.addEventListener('change', () => {
      paintSimple();
      if (input.hasAttribute('data-seed')) scheduleGenerate();
      if (cfg.inputId.indexOf('i-fat-') === 0) syncFatChart();
    });
  });

  ['i-abertura', 'i-data-emissao'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', paintSimple);
    el.addEventListener('change', paintSimple);
  });

  // Defaults
  const emissao = document.getElementById('i-data-emissao');
  if (emissao && !emissao.value) {
    const d = new Date();
    emissao.value =
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // Seed defaults so table/charts start filled (como variáveis do PDF)
  const seedDefaults = {
    'i-capital-social': 'R$ 150.000,00',
    'i-fat-1': 'R$ 118.500,00',
    'i-fat-2': 'R$ 132.800,00',
    'i-fat-3': 'R$ 145.200,00',
    'i-invest-estoque': 'R$ 42.750,00',
    'i-fat-anual': 'R$ 1.485.000,00',
  };
  Object.keys(seedDefaults).forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = seedDefaults[id];
  });

  paintSimple();
  generateDmpl();
  syncFatChart();

  // Regenera DMPL quando OpenCNPJ preenche capital / campos seed
  document.addEventListener('input', e => {
    const t = e.target;
    if (!t || !t.id) return;
    if (t.hasAttribute('data-seed') || t.id === 'i-capital-social') scheduleGenerate();
  });
});
