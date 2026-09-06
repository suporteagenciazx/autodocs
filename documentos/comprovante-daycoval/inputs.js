document.addEventListener('DOMContentLoaded', () => {
    const configurations = [
        { inputId: 'i-cpfcnpj', targetId: 'cpfcnpj', originalText: '[CPF / CNPJ]' },
        { inputId: 'i-nome', targetId: 'nome', originalText: '[NOME / RAZÃO SOCIAL]' },

		{ inputId: 'i-banco', targetId: 'banco', originalText: '[BANCO]' },
        { inputId: 'i-agencia', targetId: 'agencia', originalText: '[AGÊNCIA]' },
        { inputId: 'i-conta', targetId: 'conta', originalText: '[CONTA]' },
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
});
