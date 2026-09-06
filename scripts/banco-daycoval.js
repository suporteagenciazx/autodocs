function aplicarTextosBanco() {
    const elementosTexto = [
        { class: 'banco-cnpj', texto: '62.232.889/0001-90' },

        { class: 'banco-nome', texto: 'Banco Daycoval S.A.' },
        { class: 'banco-nome-ALT', texto: 'Banco Daycoval S.A.' },

        { class: 'banco-nomeCAPS', texto: 'BANCO DAYCOVAL S.A.' },
        { class: 'banco-nomeCAPS-ALT', texto: 'BANCO DAYCOVAL S.A.' },

        { class: 'banco-razaosocial', texto: 'Banco Daycoval S.A.' },
        { class: 'banco-razaosocialCAPS', texto: 'BANCO DAYCOVAL S.A.' },

        { class: 'banco-comprovante', texto: 'BANCO DAYCOVAL S.A.' },
        { class: 'banco-agencia', texto: '0001' },
        { class: 'banco-conta', texto: '62232889-0' },

        { class: 'banco-logradouro', texto: 'Avenida Paulista' },
        { class: 'banco-numero', texto: '1793' },
        { class: 'banco-bairro', texto: 'Bela Vista' },
        { class: 'banco-cidade', texto: 'São Paulo' },
        { class: 'banco-estado', texto: 'São Paulo' },
        { class: 'banco-uf', texto: 'SP' },
        { class: 'banco-cep', texto: '01311-200' },

        { class: 'banco-diretor', texto: 'Carlos Moche Dayan' },
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
