document.addEventListener('DOMContentLoaded', () => {
    const selectStatus = document.getElementById('select-status');
    const inputStatus = document.getElementById('i-status');
    const statusSpan = document.getElementById('status'); // assumindo que o span será criado
     
    // Configuração inicial
    const firstOption = selectStatus.querySelector('option[value="[STATUS]"]');
    if (firstOption) {
        firstOption.disabled = true;
        firstOption.selected = true;
    }
    inputStatus.style.display = 'none';
    statusSpan.textContent = "[STATUS]";

    function updateStatusFromSelect() {
        const selectedValue = selectStatus.value;

        if (selectedValue === "[STATUS]") {
            // Nenhuma seleção feita
            statusSpan.textContent = "[STATUS]";
            inputStatus.style.display = 'none';
        } 
        else if (selectedValue === 'Outro') {
            // Mostrar input, mas usar [STATUS] se estiver vazio
            inputStatus.style.display = 'flex';
            statusSpan.textContent = inputStatus.value.trim() || "[STATUS]";
        } 
        else {
            // Qualquer outra opção selecionada
            inputStatus.style.display = 'none';
            statusSpan.textContent = selectedValue;
        }
    }

    function updateStatusFromInput() {
        // Atualiza texto enquanto digita
        statusSpan.textContent = inputStatus.value.trim() || "[STATUS]";
    }

    // Eventos
    selectStatus.addEventListener('change', updateStatusFromSelect);
    inputStatus.addEventListener('input', updateStatusFromInput);
});