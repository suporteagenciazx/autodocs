(function () {
  const PROFILE_PREFIX = 'autodocs.profile.';

  function userKey() {
    const a = window.__autodocsAuth;
    if (!a || !a.user) return 'anon';
    if (a.user.id != null) return String(a.user.id);
    return String(a.user.email || 'anon').toLowerCase();
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PROFILE_PREFIX + userKey());
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '',
      };
    } catch (_) {
      return { displayName: '' };
    }
  }

  function savePrefs(partial) {
    const next = Object.assign({}, loadPrefs(), partial || {});
    try {
      localStorage.setItem(PROFILE_PREFIX + userKey(), JSON.stringify(next));
    } catch (_) {
      /* ignore */
    }
    return next;
  }

  function fillForm() {
    const nameEl = document.getElementById('perfil-nome');
    const emailEl = document.getElementById('perfil-email');
    const auth = window.__autodocsAuth;
    const prefs = loadPrefs();
    if (emailEl) emailEl.value = (auth && auth.user && auth.user.email) || '';
    if (nameEl) {
      if (prefs.displayName) nameEl.value = prefs.displayName;
      else if (auth && auth.user && auth.user.email) nameEl.value = String(auth.user.email).split('@')[0];
      else nameEl.value = '';
    }
  }

  function bind() {
    const form = document.getElementById('form-perfil');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const nameEl = document.getElementById('perfil-nome');
      const feedback = document.getElementById('perfil-feedback');
      const displayName = nameEl ? nameEl.value.trim() : '';
      savePrefs({ displayName });
      const nameUi = document.querySelector('#navdrawer-profile .navdrawer-profile-name');
      if (nameUi) nameUi.textContent = displayName || (window.__autodocsAuth && window.__autodocsAuth.user && window.__autodocsAuth.user.email) || 'Utilizador';
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Perfil atualizado.';
      }
      if (window.AutoDocsToast) window.AutoDocsToast.ok('Perfil atualizado.');
    });
  }

  function start() {
    if (!document.getElementById('form-perfil')) return;
    fillForm();
    bind();
  }

  if (window.__autodocsAuth !== undefined) start();
  document.addEventListener('autodocs-auth-ready', start);
  document.addEventListener('autodocs-page-ready', start);
})();
