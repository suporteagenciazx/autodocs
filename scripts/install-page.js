(function () {
  function getBasePath() {
    let p = location.pathname.replace(/\\/g, '/');
    p = p.replace(/\/?index\.html?$/i, '');
    if (!p.endsWith('/')) p += '/';
    const lower = p.toLowerCase();
    const idx = lower.indexOf('/install/');
    if (idx !== -1) return p.slice(0, idx + 1);
    return '/';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const basePath = getBasePath();
    const form = document.getElementById('form-install');
    const msg = document.getElementById('install-msg');
    const ok = document.getElementById('install-ok');

    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (msg) msg.textContent = '';
      if (ok) {
        ok.hidden = true;
        ok.textContent = '';
      }
      const email = (document.getElementById('install-email') || {}).value || '';
      const password = (document.getElementById('install-password') || {}).value || '';
      try {
        const res = await fetch(basePath + 'api/install-bootstrap.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          if (msg) msg.textContent = data.error || 'Instalação já concluída.';
          return;
        }
        if (!res.ok) {
          if (msg) msg.textContent = data.error || 'Falha na instalação. Verifique a base de dados e a configuração.';
          return;
        }
        if (ok) {
          ok.textContent = data.message || 'Conta criada. A redirecionar…';
          ok.hidden = false;
        }
        location.href = basePath;
      } catch (_) {
        if (msg) msg.textContent = 'Erro de rede ou API indisponível.';
      }
    });
  });
})();
