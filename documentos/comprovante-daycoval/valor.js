document.addEventListener('DOMContentLoaded', () => {

    function formatToBRL(value) {
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function atualizarValorFormatado() {
        const inputValor = document.getElementById('i-valor');
        const displayValor = document.getElementById('valor');

        // Remove tudo que não for número, vírgula ou ponto
        let valorDigitado = inputValor.value.replace(/[^\d.,]/g, '');

        // Substitui pontos por nada (remoção de separador de milhar) e vírgula por ponto para conversão
        let valorNumerico = parseFloat(valorDigitado.replace(/\./g, '').replace(',', '.')) || 0;

        // Atualiza o display formatado
        displayValor.innerText = formatToBRL(valorNumerico);
    }

    const input = document.getElementById('i-valor');

    input.addEventListener('input', () => {
        // Permite apenas números, vírgula e ponto na digitação
        input.value = input.value.replace(/[^\d.,]/g, '');
        atualizarValorFormatado();
    });

    // Inicializa a exibição ao carregar
    atualizarValorFormatado();
});