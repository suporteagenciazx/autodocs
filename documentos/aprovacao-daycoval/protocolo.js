document.addEventListener('DOMContentLoaded', function () {
    const inputProtocolo = document.getElementById('i-protocolo');
    const targetProtocolo = document.getElementById('protocolo');

    // Função para gerar código aleatório de 10 dígitos (A-Z, 0-9)
    function gerarCodigoProtocolo() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let codigo = '';
        for (let i = 0; i < 10; i++) {
            codigo += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return codigo;
    }

    // Gera e define no input + elemento
    const codigoAleatorio = gerarCodigoProtocolo();
    inputProtocolo.value = codigoAleatorio;
    targetProtocolo.textContent = codigoAleatorio;

    // Atualiza quando o usuário alterar
    inputProtocolo.addEventListener('input', () => {
        if (inputProtocolo.value.trim() === '') {
            targetProtocolo.textContent = '[PROTOCOLO]'; // texto padrão
        } else {
            targetProtocolo.textContent = inputProtocolo.value;
        }
    });
});
