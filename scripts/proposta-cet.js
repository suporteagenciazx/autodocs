function formatValue(value) {
    const limpo = value
        .replace(/\./g, '')   // remove separadores de milhar
        .replace(',', '.');   // converte vírgula para ponto
    return limpo;
}

function formatToBRL(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
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

    const valorCredito = parseFloat(formatValue(iValor)) || 0;
    const parcelas = parseInt(iParcelas) || 0;
    const carencia = parseInt(iCarencia) || 0;

    const taxaJuros = 0.0075; // 0,75% a.m.
    const tarifaContratacao = 100.00;
    const iof = 30.00;

    document.getElementById('prazo-carencia').innerText = carencia;

    if (parcelas > 0 && valorCredito > 0) {
        // Valor da parcela pelo sistema Price
        const valorParcela = valorCredito * (taxaJuros / (1 - Math.pow(1 + taxaJuros, -parcelas)));

        // Total pago
        const totalPago = valorParcela * parcelas;

        // Juros totais
        const totalJuros = totalPago - valorCredito;

        // Valor líquido recebido (descontando tarifa e IOF)
        const valorLiquido = valorCredito - tarifaContratacao - iof;

        // Cálculo aproximado do CET mensal
        const cetMensal = taxaJuros + ((tarifaContratacao + iof) / valorCredito) / parcelas;

        // CET anual aproximado (capitalização composta)
        const cetAnual = (Math.pow(1 + cetMensal, 12) - 1) * 100;

        // Atualiza os campos
        document.getElementById('valor').innerText = formatToBRL(valorCredito);
        document.getElementById('parcelas').innerText = parcelas;
        document.getElementById('proposta-parcelas').innerText = formatToBRL(valorParcela);
        document.getElementById('proposta-juros').innerText = formatToBRL(totalJuros);
        document.getElementById('proposta-devido').innerText = formatToBRL(totalPago);
        document.getElementById('taxa-juros').innerText = formatPercentage(taxaJuros * 100);
        document.getElementById('proposta-liquido').innerText = formatToBRL(valorLiquido);
        document.getElementById('cet').innerText = formatPercentage(cetAnual);

    } else {
        // Limpa os campos se houver dados insuficientes
        const ids = [
            'valor', 'parcelas', 'proposta-parcelas', 'proposta-juros',
            'proposta-devido', 'taxa-juros', 'proposta-liquido', 'cet'
        ];
        ids.forEach(id => document.getElementById(id).innerText = '');
    }
}

// Listeners de input
document.getElementById('i-valor').addEventListener('input', function(e) {
    // Permite apenas números, vírgula e ponto
    e.target.value = e.target.value.replace(/[^\d.,]/g, '');
    calcular();
});

document.getElementById('i-parcelas').addEventListener('input', calcular);
document.getElementById('i-carencia').addEventListener('input', calcular);
