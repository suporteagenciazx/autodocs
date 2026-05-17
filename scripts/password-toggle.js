(function () {
  function resetPasswordWrap(wrap) {
    if (!wrap) return;
    const input = wrap.querySelector('input');
    const btn = wrap.querySelector('.password-toggle-btn');
    const icon = btn ? btn.querySelector('.material-symbols-rounded') : null;
    if (input) input.type = 'password';
    if (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Mostrar palavra-passe');
    }
    if (icon) icon.textContent = 'visibility';
  }

  function initWrap(wrap) {
    if (!wrap || wrap.dataset.passwordToggleBound === '1') return;
    const input = wrap.querySelector('input');
    const btn = wrap.querySelector('.password-toggle-btn');
    if (!input || !btn) return;

    wrap.dataset.passwordToggleBound = '1';
    const icon = btn.querySelector('.material-symbols-rounded');

    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe');
      if (icon) icon.textContent = show ? 'visibility_off' : 'visibility';
    });
  }

  function initAll(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.password-field-wrap').forEach(initWrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  window.initPasswordToggles = initAll;
  window.resetPasswordToggle = resetPasswordWrap;
})();
