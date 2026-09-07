(function () {
  function basePath() {
    return typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
  }

  async function load() {
    const enabled = document.getElementById('seguranca-idle-enabled');
    const minutes = document.getElementById('seguranca-idle-minutos');
    const msg = document.getElementById('seguranca-msg');
    try {
      const res = await fetch(basePath() + 'api/autodocs-security.php', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (msg) msg.textContent = data.error || 'Não foi possível carregar.';
        return;
      }
      if (enabled) enabled.checked = data.idleLockEnabled !== false;
      if (minutes) minutes.value = String(data.idleMinutes || 15);
    } catch (_) {
      if (msg) msg.textContent = 'Erro de rede.';
    }
  }

  function bind() {
    const form = document.getElementById('form-seguranca-idle');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = document.getElementById('seguranca-msg');
      const enabled = document.getElementById('seguranca-idle-enabled');
      const minutes = document.getElementById('seguranca-idle-minutos');
      if (msg) {
        msg.textContent = '';
        msg.style.color = '';
      }
      try {
        const res = await fetch(basePath() + 'api/autodocs-security.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: Object.assign(
            { 'Content-Type': 'application/json', Accept: 'application/json' },
            window.__autodocsCsrf ? { 'X-AutoDocs-CSRF': window.__autodocsCsrf } : {}
          ),
          body: JSON.stringify({
            idleLockEnabled: !!(enabled && enabled.checked),
            idleMinutes: minutes ? parseInt(minutes.value, 10) : 15,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (msg) {
            msg.style.color = '#b00020';
            msg.textContent = data.error || 'Falha ao guardar.';
          }
          return;
        }
        if (minutes && data.idleMinutes) minutes.value = String(data.idleMinutes);
        if (enabled) enabled.checked = data.idleLockEnabled !== false;
        if (msg) {
          msg.style.color = '#0f7a4a';
          msg.textContent = 'Configuração guardada.';
        }
        if (window.AutoDocsToast) window.AutoDocsToast.ok('Segurança atualizada.');
      } catch (_) {
        if (msg) {
          msg.style.color = '#b00020';
          msg.textContent = 'Erro de rede.';
        }
      }
    });
  }

  function start() {
    if (!document.getElementById('form-seguranca-idle')) return;
    bind();
    load();
  }

  document.addEventListener('DOMContentLoaded', start);
  document.addEventListener('autodocs-page-ready', start);
  document.addEventListener('autodocs-auth-ready', start);
})();
