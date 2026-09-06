(function () {
  function resolveBasePath() {
    if (typeof window.getAutoDocsBasePath === 'function') {
      const bp = window.getAutoDocsBasePath();
      if (bp) return bp.endsWith('/') ? bp : bp + '/';
    }
    let p = location.pathname.replace(/\\/g, '/');
    p = p.replace(/\/?index\.html?$/i, '');
    if (!p.endsWith('/')) p += '/';
    const lower = p.toLowerCase();
    const markers = [
      '/documentos/',
      '/consulta/',
      '/documentacoes/',
      '/tags/',
      '/usuarios/',
      '/designer/',
      '/integracoes/',
      '/suporte/',
      '/ajuda/',
      '/configuracoes/',
      '/login/',
      '/cadastro/',
      '/install/',
    ];
    for (let i = 0; i < markers.length; i++) {
      const idx = lower.indexOf(markers[i]);
      if (idx !== -1) return p.slice(0, idx + 1);
    }
    return p;
  }

  function sistemaCssFailed() {
    const link = document.querySelector('link[rel="stylesheet"][href*="sistema.css"]');
    if (!link) return false;
    if (link.sheet == null) return true;
    try {
      const rules = link.sheet.cssRules || link.sheet.rules;
      return !rules || rules.length === 0;
    } catch (_) {
      return true;
    }
  }

  function showBanner(html) {
    if (document.getElementById('autodocs-css-guard')) return;
    const el = document.createElement('div');
    el.id = 'autodocs-css-guard';
    el.setAttribute('role', 'alert');
    el.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:rgba(17,17,17,.92);color:#fff;font:14px/1.5 Inter,system-ui,sans-serif;text-align:center';
    el.innerHTML =
      '<div style="max-width:420px">' +
      html +
      '</div>';
    document.body.appendChild(el);
  }

  async function run() {
    if (!/AutoDocs/i.test(document.title || '')) return;

    const base = resolveBasePath();
    let meta = null;
    try {
      const res = await fetch(base + 'api/app-meta.php', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) meta = await res.json();
    } catch (_) {
      /* ignore */
    }

    const expectedPort = meta && meta.port ? String(meta.port) : '8088';
    const expectedUrl = (meta && meta.url) || 'http://localhost:' + expectedPort + '/';
    const currentPort = location.port || (location.protocol === 'https:' ? '443' : '80');
    const onLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);

    if (sistemaCssFailed()) {
      let html =
        '<h2 style="margin:0 0 12px;font-size:20px">Estilos não carregaram</h2>' +
        '<p style="margin:0 0 16px;color:#ddd">Os ficheiros CSS do AutoDocs não foram encontrados nesta URL.</p>';
      if (onLocalhost && currentPort === '8080' && expectedPort !== '8080') {
        html +=
          '<p style="margin:0 0 16px;color:#f5c26b">A porta <strong>8080</strong> nesta máquina é outro serviço (Evolution API), não o AutoDocs Docker.</p>';
      }
      html +=
        '<p style="margin:0 0 16px">Abra o AutoDocs em:</p>' +
        '<p style="margin:0"><a href="' +
        expectedUrl +
        '" style="color:#7ec8ff;font-weight:600">' +
        expectedUrl +
        '</a></p>';
      showBanner(html);
      return;
    }

    if (onLocalhost && currentPort === '8080' && expectedPort !== '8080') {
      showBanner(
        '<h2 style="margin:0 0 12px;font-size:20px">Porta incorreta</h2>' +
          '<p style="margin:0 0 16px;color:#f5c26b">Em <strong>localhost:8080</strong> corre outro serviço, não o AutoDocs.</p>' +
          '<p style="margin:0 0 16px">Use:</p>' +
          '<p style="margin:0"><a href="' +
          expectedUrl +
          '" style="color:#7ec8ff;font-weight:600">' +
          expectedUrl +
          '</a></p>'
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.setTimeout(run, 120);
    });
  } else {
    window.setTimeout(run, 120);
  }
})();
