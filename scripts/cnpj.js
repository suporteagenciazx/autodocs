// JavaScript Document

// Selecionando o elemento de input do CNPJ
const inputCNPJ = document.getElementById('i-cnpj');

// Adicionando um evento de input ao campo de entrada de CNPJ
inputCNPJ.addEventListener('input', function() {
    const cnpjValue = inputCNPJ.value.replace(/\D/g, ''); // Remover caracteres não numéricos

    // Configuração para CNPJ
    inputCNPJ.maxLength = 18;

    // Formatação para CNPJ (##.###.###/####-##)
    let formattedCNPJ = cnpjValue.substring(0, 2);
    if (cnpjValue.length > 2) formattedCNPJ += '.' + cnpjValue.substring(2, 5);
    if (cnpjValue.length > 5) formattedCNPJ += '.' + cnpjValue.substring(5, 8);
    if (cnpjValue.length > 8) formattedCNPJ += '/' + cnpjValue.substring(8, 12);
    if (cnpjValue.length > 12) formattedCNPJ += '-' + cnpjValue.substring(12, 14);

    inputCNPJ.value = formattedCNPJ;
});