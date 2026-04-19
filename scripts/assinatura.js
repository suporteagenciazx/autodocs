document.addEventListener("DOMContentLoaded", function () {

    // Função para gerar um número aleatório dentro de um intervalo
    function randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    // Função para gerar um caractere aleatório entre A e Z
    function randomLetter() {
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    // Gerar a assinatura
    function generateAssinatura() {
        var assinatura = '';
        assinatura += randomLetter();          
        assinatura += randomNumber(10, 99);    
        assinatura += '.2026.';
        assinatura += randomNumber(0, 9);      
        assinatura += randomNumber(10, 99);    
        assinatura += randomLetter();          
        assinatura += '.';
        assinatura += randomLetter();          
        assinatura += randomNumber(0, 9);      
        assinatura += randomLetter();          
        assinatura += randomNumber(0, 9);      
        return assinatura;
    }

    // Preencher assinatura principal
    const el1 = document.getElementById('assinatura');
    if (el1) el1.innerText = generateAssinatura();

    // Preencher assinatura2 se existir
    const el2 = document.getElementById('assinatura2');
    if (el2) el2.innerText = generateAssinatura();

});