document.addEventListener('DOMContentLoaded', () => {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const configurations = [
        { inputId: 'i-cnpj', targetId: 'cnpj', originalText: '[CNPJ]' },
        { inputId: 'i-razao', targetId: 'razao-social', originalText: '[RAZAO-SOCIAL]' },
        { inputId: 'i-email-cnpj', targetId: 'email-cnpj', originalText: '[EMAIL-CNPJ]' },
        { inputId: 'i-telefone', targetId: 'telefone', originalText: '[TELEFONE]' },
        { inputId: 'i-endereco-cnpj', targetId: 'endereco-cnpj', originalText: '[ENDERECO-CNPJ]' },
        { inputId: 'i-cnae', targetId: 'cnae', originalText: '[CNAE]' },
        { inputId: 'i-funcionarios', targetId: 'funcionarios', originalText: '[FUNCIONARIOS]' },
        { inputId: 'i-capital-social', targetId: 'capital-social', originalText: '[CAPITAL-SOCIAL]' },
        { inputId: 'i-abertura', targetId: 'data-abertura', originalText: '[DATA-ABERTURA]', format: 'date-br' },
        { inputId: 'i-porte', targetId: 'porte', originalText: '[PORTE]' },
        { inputId: 'i-data-emissao', targetId: 'data-emissao', originalText: '[DATA-EMISSAO]', format: 'date-br' },
        { inputId: 'i-referencia', targetId: 'referencia', originalText: '[REFERENCIA]' },
        { inputId: 'i-taxa-desconto', targetId: 'taxa-desconto', originalText: '[TAXA-DESCONTO]' },
        { inputId: 'i-crescimento-perpetuidade', targetId: 'crescimento-perpetuidade', originalText: '[CRESCIMENTO-PERPETUIDADE]' },
        { inputId: 'i-ipca-projetado', targetId: 'ipca-projetado', originalText: '[IPCA-PROJETADO]' },
        { inputId: 'i-valor-5-anos', targetId: 'valor-5-anos', originalText: '[VALOR-5-ANOS]' },
        { inputId: 'i-valor-total-empresa', targetId: 'valor-total-empresa', originalText: '[VALOR-TOTAL-EMPRESA]' },
        { inputId: 'i-valor-perpetuidade', targetId: 'valor-perpetuidade', originalText: '[VALOR-PERPETUIDADE]' },
        { inputId: 'i-economista-nome', targetId: 'economista-nome', originalText: '[ECONOMISTA-NOME]' },
        { inputId: 'i-economista-cofecon', targetId: 'economista-cofecon', originalText: '[ECONOMISTA-COFECON]' },
        { inputId: 'i-magnus-cnpj', targetId: 'magnus-cnpj', originalText: '[MAGNUS-CNPJ]' },
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

    function inputValue(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function svgNode(tag, attrs, text) {
        const node = document.createElementNS(SVG_NS, tag);
        Object.keys(attrs).forEach(k => node.setAttribute(k, String(attrs[k])));
        if (text != null) node.textContent = text;
        return node;
    }

    /* Geometria em unidades do viewBox 640x320 do gráfico. */
    const CHART = { xs: [169, 356, 543], top: 48, bottom: 272, axisX: 96, axisRight: 616 };

    function syncChart() {
        const line = document.getElementById('fat-line');
        const area = document.getElementById('fat-area');
        if (!line || !area) return;

        const values = [1, 2, 3].map(i => parseMoney(inputValue('i-fat-mes-' + i)));
        const rawLabels = [1, 2, 3].map(i => inputValue('i-fat-label-' + i));
        const max = Math.max(...values, 0);
        const scale = max > 0 ? max : 1;

        const ys = values.map(v => CHART.bottom - (v / scale) * (CHART.bottom - CHART.top));
        const path = CHART.xs.map((x, i) => (i === 0 ? 'M' : 'L') + x + ',' + ys[i]).join(' ');

        line.setAttribute('d', path);
        area.setAttribute(
            'd',
            path + ' L' + CHART.xs[2] + ',' + CHART.bottom + ' L' + CHART.xs[0] + ',' + CHART.bottom + ' Z'
        );

        const grid = document.getElementById('fat-grid');
        const yLabels = document.getElementById('fat-y-labels');
        if (grid) grid.innerHTML = '';
        if (yLabels) yLabels.innerHTML = '';

        for (let i = 0; i <= 4; i++) {
            const y = CHART.top + ((CHART.bottom - CHART.top) * i) / 4;
            if (grid) {
                grid.appendChild(svgNode('line', {
                    x1: CHART.axisX, y1: y, x2: CHART.axisRight, y2: y,
                    stroke: '#e3e9e6', 'stroke-width': 1, 'stroke-dasharray': '4 5',
                }));
            }
            if (yLabels && max > 0) {
                const tick = scale * (1 - i / 4);
                yLabels.appendChild(svgNode('text', { x: CHART.axisX - 10, y: y + 4 },
                    tick.toLocaleString('pt-BR', { maximumFractionDigits: 0 })));
            }
        }

        const points = document.getElementById('fat-points');
        const valueLabels = document.getElementById('fat-value-labels');
        const xLabels = document.getElementById('fat-x-labels');
        if (points) points.innerHTML = '';
        if (valueLabels) valueLabels.innerHTML = '';
        if (xLabels) xLabels.innerHTML = '';

        CHART.xs.forEach((x, i) => {
            if (points) {
                points.appendChild(svgNode('circle', {
                    cx: x, cy: ys[i], r: 6, fill: '#5cb85f', stroke: '#fff', 'stroke-width': 3,
                }));
            }
            if (valueLabels) {
                const shown = inputValue('i-fat-mes-' + (i + 1));
                valueLabels.appendChild(svgNode('text', { x: x, y: ys[i] - 16 },
                    shown || '[FATURAMENTO-MES-' + (i + 1) + ']'));
            }
            if (xLabels) {
                xLabels.appendChild(svgNode('text', { x: x, y: CHART.bottom + 26 },
                    rawLabels[i] || '[FATURAMENTO-LABEL-' + (i + 1) + ']'));
            }
        });
    }

    configurations.forEach(config => {
        const input = document.getElementById(config.inputId);
        const targets = document.querySelectorAll('[id="' + config.targetId + '"]');
        if (!input || !targets.length) return;

        const paint = () => {
            const filled = input.value.trim() !== '';
            let value = filled ? input.value : config.originalText;
            if (filled && config.format === 'date-br') value = formatDateBR(input.value);
            targets.forEach(target => { target.textContent = value; });
        };

        paint();
        input.addEventListener('input', paint);
        input.addEventListener('change', paint);
    });

    [1, 2, 3].forEach(i => {
        ['i-fat-mes-' + i, 'i-fat-label-' + i].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', syncChart);
            el.addEventListener('change', syncChart);
        });
    });

    const toggleCorecon = document.getElementById('i-selo-corecon');
    const seloCorecon = document.getElementById('selo-corecon');
    if (toggleCorecon && seloCorecon) {
        const syncCorecon = () => { seloCorecon.hidden = !toggleCorecon.checked; };
        syncCorecon();
        toggleCorecon.addEventListener('change', syncCorecon);
    }

    syncChart();
});
