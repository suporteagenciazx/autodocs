document.addEventListener('DOMContentLoaded', () => {
    const configurations = [
        { inputId: 'i-cnpj', targetId: 'cnpj', originalText: '[CNPJ]' },
        { inputId: 'i-razao', targetId: 'razao', originalText: '[RAZÃO SOCIAL]' },
        { inputId: 'i-gerente', targetId: 'gerente', originalText: '[GERENTE]' },
        { inputId: 'i-pendencia', targetId: 'pendencia', originalText: '[PENDÊNCIA]' },
        { inputId: 'i-parcelas', targetId: 'parcelas', originalText: '[PARCELAS]' },
        { inputId: 'i-prazo', targetId: 'prazo', originalText: '[PRAZO DE PAGAMENTO]' },
    ];

    configurations.forEach(config => {
        const inputElement = document.getElementById(config.inputId);
        const targetElement = document.getElementById(config.targetId);

        // Atualiza imediatamente com o valor atual do input
        if (inputElement.value.trim() !== '') {
            targetElement.textContent = inputElement.value;
        } else {
            targetElement.textContent = config.originalText;
        }

        // Atualiza em tempo real quando o usuário altera o campo
        inputElement.addEventListener('input', () => {
            if (inputElement.value.trim() === '') {
                targetElement.textContent = config.originalText;
            } else {
                targetElement.textContent = inputElement.value;
            }
        });
    });
});
