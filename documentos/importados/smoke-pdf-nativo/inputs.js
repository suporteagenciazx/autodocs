document.addEventListener('DOMContentLoaded', () => {
    const configurations = [
        { inputId: 'i-gerente', targetId: 'gerente', originalText: '[GERENTE]' },
        { inputId: 'i-cliente', targetId: 'cliente', originalText: '[CLIENTE]' },
        { inputId: 'i-cnpj', targetId: 'cnpj', originalText: '[CNPJ]' },
    ];

    configurations.forEach(config => {
        const inputElement = document.getElementById(config.inputId);
        const targetElements = document.querySelectorAll('[id="' + config.targetId + '"], [data-field-id="' + config.targetId + '"]');
        if (!inputElement || !targetElements.length) return;

        targetElements.forEach(targetElement => {
            targetElement.textContent = config.originalText;
        });

        inputElement.addEventListener('input', () => {
            const value = inputElement.value.trim() === '' ? config.originalText : inputElement.value;
            targetElements.forEach(targetElement => {
                targetElement.textContent = value;
            });
        });
    });
});
