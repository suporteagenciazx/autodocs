document.addEventListener('DOMContentLoaded', () => {
    const iData = document.getElementById('i-data');
    const iHora = document.getElementById('i-hora');
    const spanData = document.getElementById('data');
    const spanHora = document.getElementById('hora');

    // Valores padrão
    spanData.textContent = '[DATA]';
    spanHora.textContent = '[HORA]';

    iData.addEventListener('change', () => {
        if (iData.value) {
            const [ano, mes, dia] = iData.value.split('-');
            spanData.textContent = `${dia}/${mes}/${ano}`;
        } else {
            spanData.textContent = '[DATA]';
        }
    });

    iHora.addEventListener('change', () => {
        if (iHora.value) {
            const [hora, minuto] = iHora.value.split(':');
            spanHora.textContent = `${hora}:${minuto}`;
        } else {
            spanHora.textContent = '[HORA]';
        }
    });
});
