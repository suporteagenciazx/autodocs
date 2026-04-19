document.addEventListener("DOMContentLoaded", function () {
    const confirmacao = document.getElementById("confirmacao");
    const exportar = document.getElementById("exportar");

    // função para atualizar a classe
    function atualizarBotao() {
        if (confirmacao.checked) {
            exportar.classList.add("ativo");
        } else {
            exportar.classList.remove("ativo");
        }
    }

    // executa sempre que o checkbox mudar
    confirmacao.addEventListener("change", atualizarBotao);

    // garante estado inicial
    atualizarBotao();
});