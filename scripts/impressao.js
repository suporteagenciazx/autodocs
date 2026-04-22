document.addEventListener('DOMContentLoaded', function () {
    const exportar = document.getElementById('exportar');
    const navdrawer = document.getElementById('navdrawer');
    const sistema = document.getElementById('conteudo');
    const documento = document.getElementById('documento');

    if (!documento) {
        return;
    }

    function base() {
        navdrawer.style.display = 'flex';
        sistema.style.display = 'flex';
    }

    function docPrint() {
        documento.style.display = 'flex';
    }

    base();

    if (exportar) {
        exportar.addEventListener('click', () => {
            if (exportar.classList.contains('ativo')) {
                navdrawer.style.display = 'none';
                sistema.style.display = 'none';
                docPrint();

                window.print();

                setTimeout(() => {
                    base();
                    documento.style.removeProperty('display');
                }, 200);
            } else {
                alert('Verifique se todos os campos foram preenchidos e marque a caixinha para liberar a exportação.');
                return;
            }
        });
    }
});
