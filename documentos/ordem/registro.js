document.addEventListener('DOMContentLoaded', () => {
    // Função para gerar um número aleatório entre min e max
    function gerarNumeroAleatorio(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Gerar um número aleatório entre 1.000.000.000.000.000 e 9.999.999.999.999.999
    const numeroAleatorio = gerarNumeroAleatorio(1000000000000000, 9999999999999999);

    // Exibir o resultado no elemento com id="registro"
    const registroEl = document.getElementById('registro');
    if (registroEl) {
        registroEl.textContent = numeroAleatorio;
    }
});