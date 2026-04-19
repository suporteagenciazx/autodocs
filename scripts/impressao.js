document.addEventListener('DOMContentLoaded', function () {
    const exportar = document.getElementById('exportar');

    const navdrawer = document.getElementById('navdrawer');
    const sistema = document.getElementById('conteudo');
    const documento = document.getElementById('documento');

    function base() {
        navdrawer.style.display = 'flex';
        sistema.style.display = 'flex';
    }

    function doc() {
        documento.style.display = 'none';
    }

    base();
    doc();

    function basePRINT() {
        navdrawer.style.display = 'none';
        sistema.style.display = 'none';
    }

    function docPRINT() {
        documento.style.display = 'flex';
    }

    if (exportar) {
        exportar.addEventListener('click', () => {
            if (exportar.classList.contains('ativo')) {
                
                basePRINT();
                docPRINT();

                window.print();

                setTimeout(() => {
                    base();
                    doc();
                }, 200); // tempo um pouco maior para evitar problemas

            } else {
                alert('Verifique se todos os campos foram preenchidos e marque a caixinha para liberar a exportação.');
                return;
            }
        });
    }
});
