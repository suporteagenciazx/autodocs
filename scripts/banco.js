document.addEventListener('DOMContentLoaded', function () {
    const elementosTexto = [
        { class: 'banco-cnpj', texto: '10.664.513/0001-50' },

        { class: 'banco-nome', texto: 'Banco Agibank' },
        { class: 'banco-nome-ALT', texto: 'Banco Agibank' },

        { class: 'banco-nomeCAPS', texto: 'BANCO AGIBANK' },
        { class: 'banco-nomeCAPS-ALT', texto: 'BANCO AGIBANK' },

        { class: 'banco-razaosocial', texto: 'Banco Agibank S/A' },
        { class: 'banco-razaosocialCAPS', texto: 'BANCO AGIBANK S/A' },
        
        { class: 'banco-comprovante', texto: 'BANCO AGIBANK SA' },
        { class: 'banco-agencia', texto: '0001' },
        { class: 'banco-conta', texto: '95477282-2' },

        { class: 'banco-logradouro', texto: 'Rua Sergio Fernandes Borges Soares' },
        { class: 'banco-numero', texto: '1000' },
        { class: 'banco-bairro', texto: 'Distrito Industrial' },
        { class: 'banco-cidade', texto: 'Campinas' },
        { class: 'banco-estado', texto: 'São Paulo' },
        { class: 'banco-uf', texto: 'SP' },
        { class: 'banco-cep', texto: '13054-709' },

        { class: 'banco-diretor', texto: 'Daniel Monteiro de Farias' },
    ];

    elementosTexto.forEach(item => {
        const elementos = document.querySelectorAll(`.${item.class}`);
        elementos.forEach(el => {
            el.dataset.originalText = el.textContent;
            el.textContent = item.texto;
        });
    });
});