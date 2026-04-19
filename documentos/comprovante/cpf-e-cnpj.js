// Selecionando o elemento de input do CNPJ/CPF
const inputDocumento = document.getElementById('i-cpfcnpj');

// Adicionando um evento de input ao campo de entrada de documento
inputDocumento.addEventListener('input', function() {
    const documentoValue = inputDocumento.value.replace(/\D/g, ''); // Remover caracteres não numéricos

    // Configuração de comprimento máximo do input
    inputDocumento.maxLength = 18;

    let formattedDocumento;

    if (documentoValue.length <= 11) {
        // Formatação para CPF (###.###.###-##)
        formattedDocumento = documentoValue.substring(0, 3);
        if (documentoValue.length > 3) formattedDocumento += '.' + documentoValue.substring(3, 6);
        if (documentoValue.length > 6) formattedDocumento += '.' + documentoValue.substring(6, 9);
        if (documentoValue.length > 9) formattedDocumento += '-' + documentoValue.substring(9, 11);
    } else {
        // Formatação para CNPJ (##.###.###/####-##)
        formattedDocumento = documentoValue.substring(0, 2);
        if (documentoValue.length > 2) formattedDocumento += '.' + documentoValue.substring(2, 5);
        if (documentoValue.length > 5) formattedDocumento += '.' + documentoValue.substring(5, 8);
        if (documentoValue.length > 8) formattedDocumento += '/' + documentoValue.substring(8, 12);
        if (documentoValue.length > 12) formattedDocumento += '-' + documentoValue.substring(12, 14);
    }

    inputDocumento.value = formattedDocumento;
});