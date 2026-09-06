/**
 * Exportação PNG para páginas com body[data-export="png"].
 * Substitui o fluxo de impressão (impressao.js) nestas páginas —
 * captura #tela-aprovacao-sheet (ou o primeiro filho de #documento)
 * via html2canvas e dispara o download.
 */
(function () {
  const MSG_CONFIRMAR =
    'Verifique se todos os campos foram preenchidos e marque a caixinha para liberar a exportação.';

  let bound = false;
  let busy = false;

  function sheetEl() {
    return (
      document.getElementById('tela-aprovacao-sheet') ||
      document.querySelector('#documento > .tela-aprovacao') ||
      document.querySelector('#documento > :first-child')
    );
  }

  function fileName() {
    const titular = document.getElementById('i-titular');
    const cnpj = document.getElementById('i-cnpj');
    const base =
      (titular && titular.value.trim()) ||
      (cnpj && cnpj.value.trim()) ||
      'tela-aprovacao';
    return (
      'tela-aprovacao-' +
      base
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) +
      '.png'
    );
  }

  async function runPngExport() {
    if (busy) return;
    const sheet = sheetEl();
    if (!sheet) return;
    if (typeof html2canvas !== 'function') {
      window.alert('Biblioteca de captura PNG indisponível.');
      return;
    }

    busy = true;
    const btn = document.getElementById('exportar');
    const prev = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="material-symbols-rounded">hourglass_top</span>A gerar PNG…';
    }

    try {
      const canvas = await html2canvas(sheet, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: sheet.offsetWidth,
        height: sheet.offsetHeight,
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Falha ao gerar o PNG.');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (window.AutoDocsToast) window.AutoDocsToast.ok('PNG baixado.');
    } catch (err) {
      console.error(err);
      window.alert('Não foi possível gerar o PNG. Tente novamente.');
    } finally {
      busy = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = prev;
      }
    }
  }

  function onDocumentClick(e) {
    const btn = e.target.closest('#exportar');
    if (!btn) return;
    if (!document.body || document.body.getAttribute('data-export') !== 'png') return;
    if (!document.getElementById('documento')) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (btn.classList.contains('ativo')) {
      runPngExport();
    } else {
      window.alert(MSG_CONFIRMAR);
    }
  }

  function bindExport() {
    if (bound) return;
    if (!document.body || document.body.getAttribute('data-export') !== 'png') return;
    if (!document.getElementById('documento')) return;
    // Captura na fase de captura para prevalecer sobre impressao.js, se ambos forem carregados.
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
})();
