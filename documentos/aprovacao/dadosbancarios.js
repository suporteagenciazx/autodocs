document.addEventListener("DOMContentLoaded", function () {
    const confirmacao = document.getElementById("i-dadosbancarios");
    const h2 = document.getElementById("h2-dadosbancarios");
    const campos = document.getElementById("dadosbancarios");
    const documento = document.getElementById("dadosbancarios-documento");

    // função para atualizar a classe
    function atualizarBotao() {
        if (confirmacao.checked) {
            h2.classList.add("ativo");
            campos.style.display = 'flex';
            documento.style.display = 'flex';

                const configurations = [
                    { inputId: 'i-banco', targetId: 'banco', originalText: '[BANCO]' },
		            { inputId: 'i-agencia', targetId: 'agencia', originalText: '[AGÊNCIA]' },
		            { inputId: 'i-conta', targetId: 'conta', originalText: '[CONTA]' }
                ];

                configurations.forEach(config => {
                    const inputElement = document.getElementById(config.inputId);
                    const targetElement = document.getElementById(config.targetId);

                    // Initialize the target element with the original text
                    targetElement.textContent = config.originalText;

                    inputElement.addEventListener('input', () => {
                        if (inputElement.value.trim() === '') {
                            targetElement.textContent = config.originalText;
                        } else {
                            targetElement.textContent = inputElement.value;
                        }
                    });
                });
        } else {
            h2.classList.remove("ativo");
            campos.style.display = 'none';
            documento.style.display = 'none';
        }
    }

    // executa sempre que o checkbox mudar
    confirmacao.addEventListener("change", atualizarBotao);

    // garante estado inicial
    atualizarBotao();
});