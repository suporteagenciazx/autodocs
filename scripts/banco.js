function aplicarTextosBanco() {
    const elementosTexto = [
        { class: 'banco-cnpj', texto: '60.889.128/0001-80' },

        { class: 'banco-nome', texto: 'Banco Sofisa S.A.' },
        { class: 'banco-nome-ALT', texto: 'Banco Sofisa S.A.' },

        { class: 'banco-nomeCAPS', texto: 'BANCO SOFISA S.A.' },
        { class: 'banco-nomeCAPS-ALT', texto: 'BANCO SOFISA S.A.' },

        { class: 'banco-razaosocial', texto: 'Banco Sofisa S.A.' },
        { class: 'banco-razaosocialCAPS', texto: 'BANCO SOFISA S.A.' },

        { class: 'banco-comprovante', texto: 'BANCO SOFISA S.A.' },
        { class: 'banco-agencia', texto: '0001' },
        { class: 'banco-conta', texto: '95477282-2' },

        { class: 'banco-logradouro', texto: 'Alameda Santos' },
        { class: 'banco-numero', texto: '1496' },
        { class: 'banco-bairro', texto: 'Cerqueira Cesar' },
        { class: 'banco-cidade', texto: 'São Paulo' },
        { class: 'banco-estado', texto: 'São Paulo' },
        { class: 'banco-uf', texto: 'SP' },
        { class: 'banco-cep', texto: '01418-100' },

        { class: 'banco-diretor', texto: 'Alexandre Burmaian' },
    ];

    elementosTexto.forEach(item => {
        const elementos = document.querySelectorAll(`.${item.class}`);
        elementos.forEach(el => {
            el.dataset.originalText = el.textContent;
            el.textContent = item.texto;
        });
    });

    const headerBanco = document.getElementById('sistema-banco');
    const headerCnpj = document.getElementById('sistema-cnpj');
    if (headerBanco) headerBanco.textContent = 'AutoDocs';
    if (headerCnpj) {
        headerCnpj.textContent = 'Sistema de emissão de documentações automáticas';
    }
}

document.addEventListener('DOMContentLoaded', aplicarTextosBanco);
document.addEventListener('autodocs-page-ready', aplicarTextosBanco);
window.aplicarTextosBanco = aplicarTextosBanco;
