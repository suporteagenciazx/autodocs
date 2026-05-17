document.addEventListener('DOMContentLoaded', function () {
    const confirmacao = document.getElementById('confirmacao');
    const exportar = document.getElementById('exportar');
    if (!confirmacao || !exportar) return;

    function atualizarBotao() {
        if (confirmacao.checked) {
            exportar.classList.add('ativo');
        } else {
            exportar.classList.remove('ativo');
        }
    }

    confirmacao.addEventListener('change', atualizarBotao);
    atualizarBotao();
});
