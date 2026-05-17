/**
 * Exportação (impressão/PDF) das páginas com #documento.
 * Usa delegação no document — não depende da ordem navdrawer / autodocs-auth-ready.
 */
(function () {
  const MSG_CONFIRMAR =
    'Verifique se todos os campos foram preenchidos e marque a caixinha para liberar a exportação.';

  let bound = false;

  function runPrint() {
    const documento = document.getElementById('documento');
    const navdrawer = document.getElementById('navdrawer');
    const sistema = document.getElementById('conteudo');
    if (!documento) return;

    function base() {
      if (navdrawer) navdrawer.style.display = 'flex';
      if (sistema) sistema.style.display = 'flex';
    }

    base();
    if (navdrawer) navdrawer.style.display = 'none';
    if (sistema) sistema.style.display = 'none';
    documento.style.display = 'flex';

    window.print();

    setTimeout(function () {
      base();
      documento.style.removeProperty('display');
    }, 200);
  }

  function onDocumentClick(e) {
    const btn = e.target.closest('#exportar');
    if (!btn) return;
    if (!document.getElementById('documento')) return;

    if (btn.classList.contains('ativo')) {
      runPrint();
    } else {
      window.alert(MSG_CONFIRMAR);
    }
  }

  function bindExport() {
    if (bound) return;
    if (!document.getElementById('documento')) return;
    document.addEventListener('click', onDocumentClick, true);
    bound = true;
  }

  function boot() {
    bindExport();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('autodocs-auth-ready', boot);
  window.initAutoDocsExport = bindExport;
})();
