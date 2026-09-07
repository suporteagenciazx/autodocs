(function () {
  const LOCK_KEY = 'autodocs.session.locked';
  const LOADING_MS = 520;
  const UNLOCK_FADE_MS = 380;
  let idleMs = 60 * 1000;
  let idleEnabled = true;
  let timer = null;
  let locked = false;
  let unlocking = false;
  let loadingTimer = null;
  let overlay = null;
  let started = false;

  function basePath() {
    return typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/';
  }

  function ensureCss() {
    if (document.getElementById('autodocs-lock-css')) return;
    const link = document.createElement('link');
    link.id = 'autodocs-lock-css';
    link.rel = 'stylesheet';
    link.href = basePath() + 'estilos/autodocs-lock.css?v=20260907b';
    document.head.appendChild(link);
  }

  function ensurePinScript() {
    if (window.AutoDocsPinInput) return Promise.resolve();
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = basePath() + 'scripts/autodocs-pin-input.js?v=20260907b';
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }

  function authUser() {
    const a = window.__autodocsAuth;
    return a && a.user ? a.user : null;
  }

  function displayName(user) {
    try {
      const key =
        'autodocs.profile.' +
        (user.id != null ? String(user.id) : String(user.email || 'anon').toLowerCase());
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed.displayName) return parsed.displayName;
    } catch (_) {
      /* ignore */
    }
    const email = user.email || '';
    return email.includes('@') ? email.split('@')[0] : email || 'Utilizador';
  }

  function buildOverlay() {
    if (overlay) return overlay;
    ensureCss();
    const el = document.createElement('div');
    el.id = 'autodocs-lock-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Sessão bloqueada');
    el.innerHTML =
      '<div class="autodocs-lock-loading" id="autodocs-lock-loading" aria-live="polite" aria-busy="true">' +
      '<div class="autodocs-lock-spinner" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="autodocs-lock-card" id="autodocs-lock-card" hidden>' +
      '<p class="autodocs-lock-brand">AutoDocs</p>' +
      '<p class="autodocs-lock-status">Sessão bloqueada</p>' +
      '<div class="autodocs-lock-user">' +
      '<div class="autodocs-lock-avatar" id="autodocs-lock-initial">A</div>' +
      '<div><p class="autodocs-lock-user-name" id="autodocs-lock-name">Utilizador</p>' +
      '<p class="autodocs-lock-user-email" id="autodocs-lock-email"></p></div>' +
      '</div>' +
      '<label class="autodocs-lock-label" for="autodocs-lock-pin-0">PIN</label>' +
      '<div class="autodocs-pin-row" id="autodocs-lock-pin-row" data-pin-length="6">' +
      '<input class="autodocs-pin-box" id="autodocs-lock-pin-0" type="password" inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="Dígito 1">' +
      '<input class="autodocs-pin-box" type="password" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="Dígito 2">' +
      '<input class="autodocs-pin-box" type="password" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="Dígito 3">' +
      '<input class="autodocs-pin-box" type="password" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="Dígito 4">' +
      '<input class="autodocs-pin-box" type="password" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="Dígito 5">' +
      '<input class="autodocs-pin-box" type="password" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="Dígito 6">' +
      '</div>' +
      '<p class="autodocs-lock-msg" id="autodocs-lock-msg" role="alert"></p>' +
      '<button type="button" class="autodocs-lock-submit" id="autodocs-lock-unlock">Desbloquear</button>' +
      '<div class="autodocs-lock-links">' +
      '<button type="button" id="autodocs-lock-logout">Mudar de conta</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(el);
    overlay = el;

    el.querySelector('#autodocs-lock-unlock').addEventListener('click', () => unlock());
    el.querySelector('#autodocs-lock-logout').addEventListener('click', logout);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && el.classList.contains('is-ready') && !unlocking) unlock();
    });
    return el;
  }

  function fillUserUi() {
    const user = authUser();
    if (!user) return;
    const name = displayName(user);
    const nameEl = document.getElementById('autodocs-lock-name');
    const emailEl = document.getElementById('autodocs-lock-email');
    const initEl = document.getElementById('autodocs-lock-initial');
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = user.email || '';
    if (initEl) initEl.textContent = (name || 'U').charAt(0).toUpperCase();
  }

  function setLoadingPhase(on) {
    const el = overlay;
    if (!el) return;
    const loading = document.getElementById('autodocs-lock-loading');
    const card = document.getElementById('autodocs-lock-card');
    if (on) {
      if (card) card.hidden = true;
      if (loading) loading.hidden = false;
      el.classList.add('is-loading');
      el.classList.remove('is-ready');
    } else {
      if (loading) loading.hidden = true;
      if (card) card.hidden = false;
      el.classList.remove('is-loading');
      el.classList.add('is-ready');
    }
  }

  function showPinPhase() {
    const el = overlay;
    if (!el) return;
    unlocking = false;
    setLoadingPhase(false);
    fillUserUi();
    ensurePinScript().then(() => {
      const row = document.getElementById('autodocs-lock-pin-row');
      if (window.AutoDocsPinInput) {
        window.AutoDocsPinInput.bindPinRow(row, {
          onComplete: function () {
            unlock();
          },
        });
        window.AutoDocsPinInput.clearPin(row);
      } else {
        const first = document.getElementById('autodocs-lock-pin-0');
        if (first) first.focus();
      }
    });
    const msg = document.getElementById('autodocs-lock-msg');
    if (msg) msg.textContent = '';
  }

  function showLock() {
    if (locked) return;
    if (!authUser()) return;
    locked = true;
    unlocking = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    try {
      sessionStorage.setItem(LOCK_KEY, '1');
    } catch (_) {
      /* ignore */
    }
    // Marca pin_ok=0 no servidor (gate/API passam a exigir unlock).
    try {
      const hdr = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (window.__autodocsCsrf) hdr['X-AutoDocs-CSRF'] = window.__autodocsCsrf;
      fetch(basePath() + 'api/auth-session-lock.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: hdr,
        body: '{}',
      }).catch(() => {});
    } catch (_) {
      /* ignore */
    }
    const el = buildOverlay();
    el.classList.remove('is-leaving');
    el.style.opacity = '';
    setLoadingPhase(true);
    el.classList.add('is-open', 'is-loading');
    document.body.style.overflow = 'hidden';
    if (loadingTimer) clearTimeout(loadingTimer);
    loadingTimer = setTimeout(showPinPhase, LOADING_MS);
  }

  function finishUnlockTransition() {
    locked = false;
    unlocking = false;
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
    try {
      sessionStorage.removeItem(LOCK_KEY);
    } catch (_) {
      /* ignore */
    }
    if (overlay) {
      overlay.classList.remove('is-open', 'is-loading', 'is-ready', 'is-leaving');
      overlay.style.opacity = '';
      const loading = document.getElementById('autodocs-lock-loading');
      const card = document.getElementById('autodocs-lock-card');
      if (loading) loading.hidden = true;
      if (card) card.hidden = true;
    }
    document.body.style.overflow = '';
    bump();
  }

  function hideLockSmooth() {
    const el = overlay;
    if (!el) {
      finishUnlockTransition();
      return;
    }
    setLoadingPhase(true);
    // Allow spinner to paint before fade-out.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add('is-leaving');
      });
    });
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      el.removeEventListener('transitionend', onEnd);
      finishUnlockTransition();
    };
    const onEnd = e => {
      if (e.target !== el || e.propertyName !== 'opacity') return;
      done();
    };
    el.addEventListener('transitionend', onEnd);
    window.setTimeout(done, UNLOCK_FADE_MS + 120);
  }

  async function unlock() {
    if (unlocking || !locked) return;
    const msg = document.getElementById('autodocs-lock-msg');
    const row = document.getElementById('autodocs-lock-pin-row');
    const pin = window.AutoDocsPinInput ? window.AutoDocsPinInput.readPin(row) : '';
    if (!/^\d{6}$/.test(pin)) {
      if (msg) msg.textContent = 'Informe o PIN de 6 dígitos.';
      return;
    }
    unlocking = true;
    setLoadingPhase(true);
    if (msg) msg.textContent = '';
    try {
      const hdr = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (window.__autodocsCsrf) hdr['X-AutoDocs-CSRF'] = window.__autodocsCsrf;
      const res = await fetch(basePath() + 'api/auth-pin-verify.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: hdr,
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.csrfToken) {
        window.__autodocsCsrf = data.csrfToken;
        if (window.AutoDocsApi) window.AutoDocsApi.setCsrf(data.csrfToken);
      }
      if (!res.ok) {
        unlocking = false;
        setLoadingPhase(false);
        if (msg) msg.textContent = data.error || 'PIN inválido.';
        if (window.AutoDocsPinInput) window.AutoDocsPinInput.clearPin(row);
        return;
      }
      // Mantém a bolinha visível um instante antes do fade para o sistema.
      window.setTimeout(hideLockSmooth, 280);
    } catch (_) {
      unlocking = false;
      setLoadingPhase(false);
      if (msg) msg.textContent = 'Erro de rede. Tente novamente.';
    }
  }

  async function logout() {
    try {
      const hdr = { Accept: 'application/json' };
      if (window.__autodocsCsrf) hdr['X-AutoDocs-CSRF'] = window.__autodocsCsrf;
      await fetch(basePath() + 'api/auth-logout.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: hdr,
      });
    } catch (_) {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(LOCK_KEY);
    } catch (_) {
      /* ignore */
    }
    window.__autodocsAuth = null;
    try {
      sessionStorage.removeItem('autodocs.auth.role');
    } catch (_) {
      /* ignore */
    }
    document.documentElement.classList.remove('autodocs-role-admin');
    location.href = basePath() + 'login/';
  }

  function bump() {
    if (!idleEnabled || locked) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(showLock, idleMs);
  }

  function onActivity() {
    if (locked) return;
    bump();
  }

  async function loadSecurity() {
    try {
      const res = await fetch(basePath() + 'api/autodocs-security.php', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data === 'object') {
        idleEnabled = data.idleLockEnabled !== false;
        const m = parseInt(data.idleMinutes, 10);
        if (m >= 1 && m <= 240) idleMs = m * 60 * 1000;
      }
    } catch (_) {
      /* defaults */
    }
  }

  function bindActivity() {
    if (bindActivity.done) return;
    bindActivity.done = true;
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(ev => {
      document.addEventListener(ev, onActivity, { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onActivity();
    });
    document.addEventListener('autodocs-page-ready', onActivity);
  }

  async function start() {
    if (started) return;
    if (location.protocol === 'file:') return;
    if (typeof autodocsIsPublicAuthPath === 'function' && autodocsIsPublicAuthPath()) return;
    if (!authUser()) return;
    started = true;
    ensureCss();
    await loadSecurity();
    bindActivity();
    try {
      if (
        sessionStorage.getItem(LOCK_KEY) === '1' ||
        (window.__autodocsAuth && window.__autodocsAuth.locked)
      ) {
        showLock();
      } else if (idleEnabled) {
        bump();
      }
    } catch (_) {
      if (idleEnabled) bump();
    }
  }

  window.AutoDocsIdleLock = {
    lock: showLock,
    isLocked: function () {
      return locked;
    },
  };

  document.addEventListener('autodocs-lock-request', showLock);
  document.addEventListener('autodocs-auth-ready', start);
  if (window.__autodocsAuth && window.__autodocsAuth.user) {
    start();
  }
})();
