/**
 * Helpers de API (CSRF + credentials).
 * Depende de window.__autodocsCsrf definido após auth-me / login.
 */
(function (global) {
  function getCsrf() {
    return global.__autodocsCsrf || '';
  }

  function setCsrf(token) {
    if (typeof token === 'string' && token) {
      global.__autodocsCsrf = token;
    }
  }

  function headers(extra) {
    const h = Object.assign(
      {
        Accept: 'application/json',
        'X-AutoDocs-CSRF': getCsrf(),
      },
      extra || {}
    );
    return h;
  }

  function apiFetch(url, opts) {
    opts = opts || {};
    const method = (opts.method || 'GET').toUpperCase();
    const next = Object.assign({}, opts, {
      credentials: 'same-origin',
      headers: headers(
        Object.assign(
          {},
          opts.headers || {},
          method !== 'GET' && !(opts.body instanceof FormData)
            ? { 'Content-Type': opts.headers && opts.headers['Content-Type'] ? opts.headers['Content-Type'] : undefined }
            : {}
        )
      ),
    });
    // Limpar Content-Type undefined
    if (next.headers['Content-Type'] === undefined) {
      delete next.headers['Content-Type'];
    }
    if (method !== 'GET' && !(opts.body instanceof FormData) && !next.headers['Content-Type'] && opts.body) {
      next.headers['Content-Type'] = 'application/json';
    }
    return fetch(url, next).then(async res => {
      try {
        const clone = res.clone();
        const data = await clone.json();
        if (data && typeof data.csrfToken === 'string') setCsrf(data.csrfToken);
      } catch (_) {
        /* ignore */
      }
      return res;
    });
  }

  global.AutoDocsApi = { getCsrf, setCsrf, headers, apiFetch };
})(typeof window !== 'undefined' ? window : globalThis);
