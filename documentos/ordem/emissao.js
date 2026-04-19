document.addEventListener('DOMContentLoaded', () => {
    // Função para gerar um número aleatório dentro de um intervalo
    function randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    // Função para gerar um caractere aleatório entre A e Z
    function randomLetter() {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    // Gerar o código de emissão
    function generateCodigoEmissao() {
        let codigoEmissao = '';
        codigoEmissao += randomNumber(100, 999);
        codigoEmissao += randomLetter();
        codigoEmissao += randomNumber(0, 9);
        codigoEmissao += randomLetter();
        codigoEmissao += randomLetter();
        codigoEmissao += randomNumber(100, 999);
        codigoEmissao += randomLetter();
        codigoEmissao += randomLetter();
        codigoEmissao += randomNumber(10, 99);
        codigoEmissao += randomLetter();
        codigoEmissao += randomLetter();
        return codigoEmissao;
    }

    // Exibir o código de emissão na div com id="emissao"
    const emissaoDiv = document.getElementById('emissao');
    if (emissaoDiv) {
        emissaoDiv.innerText = generateCodigoEmissao();
    }
});