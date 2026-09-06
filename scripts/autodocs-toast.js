(function () {
  const DEFAULT_MS = 4200;
  let container = null;

  function ensureContainer() {
    if (container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.id = 'autodocs-toast-stack';
    container.className = 'autodocs-toast-stack';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
    return container;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function show(message, type, durationMs) {
    const msg = message != null ? String(message).trim() : '';
    if (!msg) return;
    const stack = ensureContainer();
    const toast = document.createElement('div');
    const kind = type === 'error' ? 'error' : type === 'ok' ? 'ok' : 'info';
    toast.className = 'autodocs-toast autodocs-toast--' + kind;
    toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    toast.innerHTML =
      '<span class="autodocs-toast-icon material-symbols-rounded" aria-hidden="true">' +
      (kind === 'error' ? 'error' : kind === 'ok' ? 'check_circle' : 'info') +
      '</span><span class="autodocs-toast-text">' +
      escapeHtml(msg) +
      '</span>';
    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    const ms = typeof durationMs === 'number' && durationMs > 0 ? durationMs : DEFAULT_MS;
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 280);
    }, ms);
  }

  window.AutoDocsToast = {
    show,
    ok(message, durationMs) {
      show(message, 'ok', durationMs);
    },
    error(message, durationMs) {
      show(message, 'error', durationMs);
    },
    info(message, durationMs) {
      show(message, 'info', durationMs);
    },
  };
})();
