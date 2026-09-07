document.addEventListener('DOMContentLoaded', () => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const textBindings = [
    { inputId: 'i-cnpj', targetId: 'cnpj', originalText: '[CNPJ]' },
    { inputId: 'i-razao', targetId: 'razao-social', originalText: '[RAZAO-SOCIAL]' },
    { inputId: 'i-cnae', targetId: 'cnae', originalText: '[CNAE]' },
    { inputId: 'i-porte', targetId: 'porte', originalText: '[PORTE]' },
    { inputId: 'i-endereco-cnpj', targetId: 'endereco-cnpj', originalText: '[ENDERECO]' },
    { inputId: 'i-referencia', targetId: 'referencia', originalText: '[REFERENCIA]' },
    { inputId: 'i-data-emissao', targetId: 'data-emissao', originalText: '[DATA-EMISSAO]', format: 'date-br' },
    { inputId: 'i-economista-nome', targetId: 'economista-nome', originalText: '[ECONOMISTA-NOME]' },
    { inputId: 'i-economista-cofecon', targetId: 'economista-cofecon', originalText: '[ECONOMISTA-COFECON]' },
  ];

  function formatDateBR(value) {
    const parts = String(value || '').split('-');
    if (parts.length !== 3) return value;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function parseMoney(raw) {
    const cleaned = String(raw || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function parsePercent(raw) {
    const cleaned = String(raw || '').replace('%', '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function formatMoney(n) {
    return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(n) {
    return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  function inputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function setInput(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  function svgNode(tag, attrs, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(k => node.setAttribute(k, String(attrs[k])));
    if (text != null) node.textContent = text;
    return node;
  }

  function paintTextBindings() {
    textBindings.forEach(config => {
      const input = document.getElementById(config.inputId);
      const targets = document.querySelectorAll('[id="' + config.targetId + '"]');
      if (!input || !targets.length) return;
      const filled = input.value.trim() !== '';
      let value = filled ? input.value : config.originalText;
      if (filled && config.format === 'date-br') value = formatDateBR(input.value);
      targets.forEach(t => {
        t.textContent = value;
      });
    });
  }

  function cashFlows(shockPct) {
    const invest = parseMoney(inputValue('i-investimento'));
    const factor = 1 + shockPct / 100;
    const flows = [-invest];
    for (let i = 1; i <= 5; i++) {
      const rec = parseMoney(inputValue('i-rec-' + i)) * factor;
      const cus = parseMoney(inputValue('i-cus-' + i)) * Math.max(0.5, 1 + shockPct / 200);
      flows.push(rec - cus);
    }
    return flows;
  }

  function npv(rate, flows) {
    return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
  }

  function irr(flows) {
    let lo = -0.99;
    let hi = 5;
    let fLo = npv(lo, flows);
    let fHi = npv(hi, flows);
    if (fLo * fHi > 0) return null;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      const fMid = npv(mid, flows);
      if (Math.abs(fMid) < 1e-6) return mid;
      if (fLo * fMid <= 0) {
        hi = mid;
        fHi = fMid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }
    return (lo + hi) / 2;
  }

  function paybackYears(flows) {
    let acc = 0;
    for (let t = 0; t < flows.length; t++) {
      const prev = acc;
      acc += flows[t];
      if (t > 0 && prev < 0 && acc >= 0) {
        const frac = Math.abs(prev) / Math.abs(flows[t] || 1);
        return t - 1 + frac;
      }
    }
    return null;
  }

  function renderBars(svgId, seriesA, seriesB, labels) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    svg.innerHTML = '';
    const top = 24;
    const bottom = 200;
    const left = 56;
    const right = 620;
    const max = Math.max(...seriesA, ...seriesB, 1);
    const n = seriesA.length;
    const groupW = (right - left) / n;
    const barW = groupW * 0.32;

    for (let i = 0; i <= 4; i++) {
      const y = top + ((bottom - top) * i) / 4;
      svg.appendChild(svgNode('line', {
        x1: left, y1: y, x2: right, y2: y, stroke: '#e8e8e8', 'stroke-width': 1, 'stroke-dasharray': '4 4',
      }));
      const tick = max * (1 - i / 4);
      svg.appendChild(svgNode('text', {
        x: left - 8, y: y + 4, 'font-size': 10, fill: '#888', 'text-anchor': 'end', 'font-family': 'Inter, sans-serif',
      }, tick.toLocaleString('pt-BR', { maximumFractionDigits: 0 })));
    }

    seriesA.forEach((v, i) => {
      const x0 = left + groupW * i + groupW * 0.18;
      const hA = ((v / max) * (bottom - top));
      const hB = ((seriesB[i] / max) * (bottom - top));
      svg.appendChild(svgNode('rect', {
        x: x0, y: bottom - hA, width: barW, height: hA, fill: '#4a4a4a', rx: 2,
      }));
      svg.appendChild(svgNode('rect', {
        x: x0 + barW + 4, y: bottom - hB, width: barW, height: hB, fill: '#a0a0a0', rx: 2,
      }));
      svg.appendChild(svgNode('text', {
        x: x0 + barW, y: bottom + 18, 'font-size': 11, fill: '#222', 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-weight': 700,
      }, labels[i]));
    });
  }

  function renderLine(svgId, values, labels) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    svg.innerHTML = '';
    const top = 24;
    const bottom = 200;
    const left = 56;
    const right = 620;
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const span = max - min || 1;
    const xs = values.map((_, i) => left + ((right - left) * i) / Math.max(values.length - 1, 1));
    const ys = values.map(v => bottom - ((v - min) / span) * (bottom - top));

    for (let i = 0; i <= 4; i++) {
      const y = top + ((bottom - top) * i) / 4;
      svg.appendChild(svgNode('line', {
        x1: left, y1: y, x2: right, y2: y, stroke: '#e8e8e8', 'stroke-width': 1, 'stroke-dasharray': '4 4',
      }));
    }

    const zeroY = bottom - ((0 - min) / span) * (bottom - top);
    svg.appendChild(svgNode('line', {
      x1: left, y1: zeroY, x2: right, y2: zeroY, stroke: '#c9c9c9', 'stroke-width': 1,
    }));

    const d = xs.map((x, i) => (i === 0 ? 'M' : 'L') + x + ',' + ys[i]).join(' ');
    svg.appendChild(svgNode('path', { d: d, fill: 'none', stroke: '#3a3a3a', 'stroke-width': 2.5 }));
    xs.forEach((x, i) => {
      svg.appendChild(svgNode('circle', { cx: x, cy: ys[i], r: 4, fill: '#3a3a3a', stroke: '#fff', 'stroke-width': 2 }));
      svg.appendChild(svgNode('text', {
        x: x, y: bottom + 18, 'font-size': 11, fill: '#222', 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-weight': 700,
      }, labels[i]));
    });
  }

  function setText(id, value) {
    document.querySelectorAll('[id="' + id + '"]').forEach(el => {
      el.textContent = value;
    });
  }

  function recompute() {
    paintTextBindings();

    const invest = parseMoney(inputValue('i-investimento'));
    const taxa = parsePercent(inputValue('i-taxa')) / 100;
    const pes = parsePercent(inputValue('i-cenario-pes'));
    const otm = parsePercent(inputValue('i-cenario-otm'));

    setText('investimento', formatMoney(invest));
    setText('taxa', inputValue('i-taxa') || '[TAXA]');
    setText('crescimento', inputValue('i-crescimento') || '[CRESCIMENTO]');
    setText('cenario-pes', String(pes));
    setText('cenario-otm', String(otm));

    const recs = [];
    const cuss = [];
    const projBody = document.getElementById('eve-proj-body');
    if (projBody) {
      projBody.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const rec = parseMoney(inputValue('i-rec-' + i));
        const cus = parseMoney(inputValue('i-cus-' + i));
        recs.push(rec);
        cuss.push(cus);
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td>Ano ' + i + '</td><td>R$ ' + formatMoney(rec) + '</td><td>R$ ' + formatMoney(cus) + '</td><td>R$ ' + formatMoney(rec - cus) + '</td>';
        projBody.appendChild(tr);
      }
    }
    renderBars('chart-proj', recs, cuss, ['A1', 'A2', 'A3', 'A4', 'A5']);

    const baseFlows = cashFlows(0);
    const fcBody = document.getElementById('eve-fc-body');
    const accumulated = [];
    let acc = 0;
    if (fcBody) {
      fcBody.innerHTML = '';
      baseFlows.forEach((cf, t) => {
        acc += cf;
        accumulated.push(acc);
        const vp = cf / Math.pow(1 + (taxa || 0), t);
        const tr = document.createElement('tr');
        const label = t === 0 ? 'Ano 0 (investimento)' : 'Ano ' + t;
        tr.innerHTML =
          '<td>' + label + '</td><td>R$ ' + formatMoney(cf) + '</td><td>R$ ' + formatMoney(acc) + '</td><td>R$ ' + formatMoney(vp) + '</td>';
        fcBody.appendChild(tr);
      });
    }
    renderLine('chart-fc', accumulated, ['0', '1', '2', '3', '4', '5']);

    function applyScenario(shock, vplId, tirId) {
      const flows = cashFlows(shock);
      const v = npv(taxa, flows);
      const r = irr(flows);
      setText(vplId, 'R$ ' + formatMoney(v));
      setText(tirId, r == null ? 'n/d' : formatPercent(r * 100));
      return { vpl: v, tir: r };
    }

    const base = applyScenario(0, 'vpl', 'tir');
    applyScenario(pes, 'vpl-pes', 'tir-pes');
    applyScenario(otm, 'vpl-otm', 'tir-otm');

    const pb = paybackYears(baseFlows);
    setText('payback', pb == null ? 'Não recupera em 5 anos' : pb.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' anos');

    const viavel = base.vpl > 0 && (base.tir == null || base.tir >= taxa);
    setText('viavel', viavel ? 'Viável' : 'Inviável');
    const kpiVpl = document.getElementById('kpi-vpl');
    const kpiViavel = document.getElementById('kpi-viavel');
    if (kpiVpl) kpiVpl.classList.toggle('is-ok', base.vpl > 0);
    if (kpiVpl) kpiVpl.classList.toggle('is-bad', base.vpl <= 0);
    if (kpiViavel) kpiViavel.classList.toggle('is-ok', viavel);
    if (kpiViavel) kpiViavel.classList.toggle('is-bad', !viavel);

    lastViavel = viavel;
    paintConclusaoFromForm();
  }

  const CONCLUSAO_MAX = 380;
  let lastViavel = true;

  function suggestedConclusao(viavel) {
    const text = viavel
      ? 'Com base nas projeções de receita e custos, no fluxo de caixa descontado e nos indicadores VPL, TIR e payback, o projeto apresenta viabilidade econômico-financeira no cenário-base. A análise de cenários confirma resiliência sob choques moderados; recomenda-se acompanhamento contínuo das premissas.'
      : 'Com base nas projeções e nos indicadores (VPL, TIR e payback), o projeto não demonstra viabilidade econômico-financeira no cenário-base sob a taxa informada. Recomenda-se revisar investimento, receitas/custos ou premissas de risco antes da decisão de capital.';
    return text.slice(0, CONCLUSAO_MAX);
  }

  function updateConclusaoCount() {
    const el = document.getElementById('i-conclusao');
    const count = document.getElementById('i-conclusao-count');
    if (!count) return;
    const n = el ? String(el.value || '').length : 0;
    count.textContent = n + '/' + CONCLUSAO_MAX;
  }

  function paintConclusaoFromForm() {
    const el = document.getElementById('i-conclusao');
    const raw = el ? String(el.value || '').trim() : '';
    const text = raw || '[CONCLUSAO]';
    setText('conclusao', text.slice(0, CONCLUSAO_MAX));
    updateConclusaoCount();
  }

  function applySuggestedConclusao() {
    const el = document.getElementById('i-conclusao');
    if (!el) return;
    el.value = suggestedConclusao(lastViavel);
    paintConclusaoFromForm();
  }

  function randomAround(base, variation) {
    const factor = 1 + (Math.random() * 2 - 1) * variation;
    return Math.max(0, base * factor);
  }

  function genFin1() {
    let rec = 420000 + Math.random() * 120000;
    let cus = rec * (0.62 + Math.random() * 0.08);
    for (let i = 1; i <= 5; i++) {
      setInput('i-rec-' + i, formatMoney(rec));
      setInput('i-cus-' + i, formatMoney(cus));
      rec = randomAround(rec * 1.12, 0.04);
      cus = randomAround(cus * 1.08, 0.04);
    }
    recompute();
  }

  function genFin2() {
    const avgRec1 = parseMoney(inputValue('i-rec-1')) || 480000;
    setInput('i-investimento', formatMoney(avgRec1 * (0.65 + Math.random() * 0.25)));
    setInput('i-taxa', (10 + Math.random() * 6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setInput('i-crescimento', (2 + Math.random() * 2.5).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setInput('i-cenario-pes', String(-10 - Math.floor(Math.random() * 10)));
    setInput('i-cenario-otm', String(10 + Math.floor(Math.random() * 10)));
    recompute();
  }

  textBindings.forEach(config => {
    const input = document.getElementById(config.inputId);
    if (!input) return;
    input.addEventListener('input', recompute);
    input.addEventListener('change', recompute);
  });

  ['i-investimento', 'i-taxa', 'i-crescimento', 'i-cenario-pes', 'i-cenario-otm'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', recompute);
    el.addEventListener('change', recompute);
  });
  for (let i = 1; i <= 5; i++) {
    ['i-rec-' + i, 'i-cus-' + i].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', recompute);
      el.addEventListener('change', recompute);
    });
  }

  const btn1 = document.getElementById('eve-gen-fin1');
  const btn2 = document.getElementById('eve-gen-fin2');
  const btnConclusao = document.getElementById('eve-gen-conclusao');
  const conclusaoEl = document.getElementById('i-conclusao');
  if (btn1) btn1.addEventListener('click', genFin1);
  if (btn2) btn2.addEventListener('click', genFin2);
  if (btnConclusao) btnConclusao.addEventListener('click', applySuggestedConclusao);
  if (conclusaoEl) {
    conclusaoEl.addEventListener('input', paintConclusaoFromForm);
    conclusaoEl.addEventListener('change', paintConclusaoFromForm);
  }

  const dataEl = document.getElementById('i-data-emissao');
  if (dataEl && !dataEl.value) {
    const d = new Date();
    dataEl.value = d.toISOString().slice(0, 10);
  }

  recompute();
  if (conclusaoEl && !conclusaoEl.value.trim()) applySuggestedConclusao();
});
