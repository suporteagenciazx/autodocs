function formatValue(value) {
    console.log("Valor digitado bruto:", value);
    const limpo = value
        .replace(/\./g, '')   // remove separadores de milhar
        .replace(',', '.');   // converte vírgula para ponto
    console.log("Valor numérico em string:", limpo);
    return limpo;
}

function formatToBRL(value) {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatPercentage(value) {
    return value.toFixed(2).replace('.', ',') + '%';
}

function calcular() {
    const iValor = document.getElementById('i-valor').value;
    const iParcelas = document.getElementById('i-parcelas').value;
    const iCarencia = document.getElementById('i-carencia').value;

    console.log("Inputs → Valor:", iValor, "| Parcelas:", iParcelas, "| Carência:", iCarencia);

    const m2 = parseFloat(formatValue(iValor)) || 0;
    const n2 = parseInt(iParcelas) || 0;
    const o2 = 0.0075; // 0,75%

    console.log("m2 numérico:", m2, "n2 numérico:", n2);

    document.getElementById('prazo-carencia').innerText = iCarencia;

    if (n2 > 0 && m2 > 0) {
        const p2 = m2 * (o2 / (1 - Math.pow(1 + o2, -n2)));
        const q2 = p2 * n2;
        const propostaJuros = q2 - m2;

        document.getElementById('valor').innerText = formatToBRL(m2);
        document.getElementById('parcelas').innerText = n2;
        document.getElementById('proposta-parcelas').innerText = formatToBRL(p2);
        document.getElementById('proposta-juros').innerText = formatToBRL(propostaJuros);
        document.getElementById('proposta-devido').innerText = formatToBRL(q2);
        document.getElementById('taxa-juros').innerText = formatPercentage(o2 * 100);

        console.log("Campos finais atualizados.");
    } else {
        console.warn("Valores insuficientes para cálculo. Limpando campos.");
        document.getElementById('valor').innerText = '';
        document.getElementById('parcelas').innerText = '';
        document.getElementById('proposta-parcelas').innerText = '';
        document.getElementById('proposta-juros').innerText = '';
        document.getElementById('proposta-devido').innerText = '';
        document.getElementById('taxa-juros').innerText = '';
    }
}

document.getElementById('i-valor').addEventListener('input', function(e) {
    // Permite apenas números, vírgula e ponto
    e.target.value = e.target.value.replace(/[^\d.,]/g, '');
    console.log("Valor no input após sanitização:", e.target.value);
    calcular();
});

document.getElementById('i-parcelas').addEventListener('input', calcular);
document.getElementById('i-carencia').addEventListener('input', calcular);
