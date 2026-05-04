(function () {
  function getBasePath() {
    let p = location.pathname.replace(/\\/g, '/');
    p = p.replace(/\/?index\.html?$/i, '');
    if (!p.endsWith('/')) p += '/';
    const lower = p.toLowerCase();
    const idx = lower.indexOf('/cadastro/');
    if (idx !== -1) return p.slice(0, idx + 1);
    return '/';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const basePath = getBasePath();
    const form = document.getElementById('form-cadastro');
    const msg = document.getElementById('cadastro-msg');
    const bloq = document.getElementById('cadastro-bloqueado');

    try {
      const me = await fetch(basePath + 'api/auth-me.php', { credentials: 'same-origin' });
      if (me.ok) {
        location.href = basePath;
        return;
      }
    } catch (_) {
      /* continuar */
    }

    let open = false;
    try {
      const st = await fetch(basePath + 'api/register-status.php', { credentials: 'same-origin' });
      const data = await st.json().catch(() => ({}));
      if (!st.ok) {
        if (msg) msg.textContent = data.error || 'Serviço indisponível. Configure a base de dados e api/private/config.local.json.';
        return;
      }
      open = !!data.registrationOpen;
    } catch (_) {
      if (msg) msg.textContent = 'Não foi possível contactar a API.';
      return;
    }

    if (!open) {
      if (bloq) bloq.hidden = false;
      if (form) form.hidden = true;
      return;
    }

    if (bloq) bloq.hidden = true;
    if (form) form.hidden = false;

    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (msg) msg.textContent = '';
      const email = (document.getElementById('cadastro-email') || {}).value || '';
      const password = (document.getElementById('cadastro-password') || {}).value || '';
      try {
        const res = await fetch(basePath + 'api/auth-register.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (msg) msg.textContent = data.error || 'Registo falhou.';
          return;
        }
        location.href = basePath;
      } catch (_) {
        if (msg) msg.textContent = 'Erro de rede.';
      }
    });
  });
})();
