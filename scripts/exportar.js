(function () {
  function isPngExport() {
    if (!document.body) return false;
    if (document.body.getAttribute('data-export') === 'png') return true;
    return !!document.querySelector('script[src*="exportar-png"]');
  }

  /** Texto "Exportar" + ícone PDF ou PNG conforme o destino da documentação. */
  function padronizarBotaoExportar() {
    const exportar = document.getElementById('exportar');
    if (!exportar) return;

    const png = isPngExport();
    const iconName = png ? 'image' : 'picture_as_pdf';
    exportar.setAttribute('data-export-format', png ? 'png' : 'pdf');
    exportar.setAttribute('aria-label', png ? 'Exportar PNG' : 'Exportar PDF');
    exportar.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">' +
      iconName +
      '</span><span class="exportar-label">Exportar</span>';
  }

  function bindConfirmacao() {
    const confirmacao = document.getElementById('confirmacao');
    const exportar = document.getElementById('exportar');
    if (!confirmacao || !exportar) return;

    function atualizarBotao() {
      if (confirmacao.checked) {
        exportar.classList.add('ativo');
      } else {
        exportar.classList.remove('ativo');
      }
    }

    confirmacao.addEventListener('change', atualizarBotao);
    atualizarBotao();
  }

  function init() {
    padronizarBotaoExportar();
    bindConfirmacao();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
