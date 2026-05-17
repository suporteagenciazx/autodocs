document.addEventListener('DOMContentLoaded', function () {
    const documento = document.getElementById('documento');
    if (!documento) {
        return;
    }

    let exportBound = false;

    function initExportPrint() {
        if (exportBound) return;

        const exportar = document.getElementById('exportar');
        if (!exportar) return;

        const navdrawer = document.getElementById('navdrawer');
        const sistema = document.getElementById('conteudo');

        function base() {
            if (navdrawer) navdrawer.style.display = 'flex';
            if (sistema) sistema.style.display = 'flex';
        }

        function docPrint() {
            documento.style.display = 'flex';
        }

        base();

        exportar.addEventListener(
            'click',
            () => {
                if (exportar.classList.contains('ativo')) {
                    if (navdrawer) navdrawer.style.display = 'none';
                    if (sistema) sistema.style.display = 'none';
                    docPrint();

                    window.print();

                    setTimeout(() => {
                        base();
                        documento.style.removeProperty('display');
                    }, 200);
                } else {
                    alert(
                        'Verifique se todos os campos foram preenchidos e marque a caixinha para liberar a exportação.'
                    );
                }
            },
            { once: false }
        );

        exportBound = true;
    }

    function tryInit() {
        if (exportBound) return true;
        if (!document.getElementById('exportar')) return false;
        initExportPrint();
        return exportBound;
    }

    document.addEventListener('autodocs-auth-ready', () => tryInit(), { once: true });

    if (tryInit()) return;

    const observer = new MutationObserver(() => {
        if (tryInit()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
});
