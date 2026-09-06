document.addEventListener('DOMContentLoaded', function () {
    const inputCodigo = document.getElementById('i-codigo');
    const targetCodigo = document.getElementById('codigo');

    // Gera número aleatório de 8 dígitos
    const valorAleatorio = Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;

    // Define o valor do input e atualiza o elemento alvo
    inputCodigo.value = valorAleatorio;
    targetCodigo.textContent = valorAleatorio;

    // Atualiza o elemento sempre que o valor do input mudar
    inputCodigo.addEventListener('input', () => {
        if (inputCodigo.value.trim() === '') {
            targetCodigo.textContent = '[CÓDIGO]'; // texto padrão
        } else {
            targetCodigo.textContent = inputCodigo.value;
        }
    });
});
