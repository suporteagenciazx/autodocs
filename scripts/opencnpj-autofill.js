(function () {
  const DEBOUNCE_MS = 500;
  const timers = new WeakMap();
  const lastFetched = new WeakMap();

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

  function onlyDigits(v) {
    return String(v || '').replace(/\D/g, '');
  }

  function formatCnpjDigits(digits) {
    const d = digits.slice(0, 14);
    let out = d.substring(0, 2);
    if (d.length > 2) out += '.' + d.substring(2, 5);
    if (d.length > 5) out += '.' + d.substring(5, 8);
    if (d.length > 8) out += '/' + d.substring(8, 12);
    if (d.length > 12) out += '-' + d.substring(12, 14);
    return out;
  }

  function formatCpfCnpjDigits(digits) {
    const d = digits.slice(0, 14);
    if (d.length <= 11) {
      let out = d.substring(0, 3);
      if (d.length > 3) out += '.' + d.substring(3, 6);
      if (d.length > 6) out += '.' + d.substring(6, 9);
      if (d.length > 9) out += '-' + d.substring(9, 11);
      return out;
    }
    return formatCnpjDigits(d);
  }

  function toDateInput(iso) {
    if (!iso || typeof iso !== 'string') return '';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
  }

  function formatCep(cep) {
    const d = onlyDigits(cep);
    if (d.length !== 8) return cep || '';
    return d.slice(0, 5) + '-' + d.slice(5);
  }

  function setInputValue(input, value) {
    if (!input || value == null) return;
    const v = String(value).trim();
    if (v === '') return;
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function ensureSpinner(input) {
    let wrap = input.closest('.autodocs-cnpj-wrap');
    if (!wrap) {
      const parent = input.parentNode;
      if (!parent) return null;
      wrap = document.createElement('div');
      wrap.className = 'autodocs-cnpj-wrap';
      parent.insertBefore(wrap, input);
      wrap.appendChild(input);
      const spin = document.createElement('span');
      spin.className = 'autodocs-cnpj-spinner';
      spin.hidden = true;
      spin.setAttribute('aria-hidden', 'true');
      wrap.appendChild(spin);
    }
    return wrap.querySelector('.autodocs-cnpj-spinner');
  }

  function setLoading(input, on) {
    const spin = ensureSpinner(input);
    if (!spin) return;
    spin.hidden = !on;
    input.classList.toggle('is-cnpj-loading', !!on);
    input.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function digitsOnly(s) {
    return String(s || '').replace(/\D+/g, '');
  }

  function formatCnaeCode(code) {
    const d = digitsOnly(code);
    if (d.length === 7) {
      return d.slice(0, 2) + '.' + d.slice(2, 4) + '-' + d.slice(4, 5) + '-' + d.slice(5, 7);
    }
    return String(code || '').trim();
  }

  function formatCnae(data) {
    if (!data || typeof data !== 'object') return '';

    // Prefer structured principal from cnaes[] (ignore secundários).
    if (Array.isArray(data.cnaes) && data.cnaes.length) {
      const principal =
        data.cnaes.find(c => c && (c.is_principal === true || c.principal === true)) || null;
      if (principal) {
        const code = String(principal.codigo || principal.code || principal.cnae || '').trim();
        const desc = String(principal.descricao || principal.description || '').trim();
        if (code || desc) {
          return [code ? formatCnaeCode(code) : '', desc].filter(Boolean).join(' — ');
        }
      }
    }

    let code = '';
    let desc = '';

    const principalRaw = data.cnae_principal || data.atividade_principal || null;
    if (principalRaw && typeof principalRaw === 'object') {
      code = String(principalRaw.codigo || principalRaw.code || principalRaw.cnae || '').trim();
      desc = String(principalRaw.descricao || principalRaw.description || '').trim();
    } else if (typeof principalRaw === 'string' && principalRaw.trim()) {
      const s = principalRaw.trim();
      if (/\d/.test(s) && /\s[-–—]\s/.test(s)) return s;
      const onlyDigits = digitsOnly(s);
      if (onlyDigits.length >= 4 && onlyDigits.length <= 7 && /^[\d.\-\/\s]+$/.test(s)) {
        code = onlyDigits;
      } else {
        desc = s;
      }
    }

    if (!code) {
      code = String(data.cnae_fiscal || data.cnae || data.codigo_cnae || '').trim();
    }
    if (!desc) {
      desc = String(
        data.cnae_fiscal_descricao ||
          data.descricao_cnae ||
          data.cnae_descricao ||
          data.atividade_principal_descricao ||
          ''
      ).trim();
    }

    if (!code && !desc) return '';
    const prettyCode = code ? formatCnaeCode(code) : '';
    if (prettyCode && desc) return prettyCode + ' — ' + desc;
    return prettyCode || desc;
  }

  async function enrichCnaeDescription(data) {
    const current = formatCnae(data);
    if (!current || /\s—\s/.test(current)) return current;
    const code = digitsOnly(data.cnae_principal || data.cnae_fiscal || data.cnae || current);
    if (code.length !== 7) return current;
    try {
      const res = await fetch(
        'https://servicodados.ibge.gov.br/api/v2/cnae/subclasses/' + encodeURIComponent(code),
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) return current;
      const json = await res.json();
      const item = Array.isArray(json) ? json[0] : json;
      const desc = item && (item.descricao || item.descricaoSubclasse || item.nome);
      if (!desc) return current;
      return formatCnaeCode(code) + ' — ' + String(desc).trim();
    } catch (_) {
      return current;
    }
  }

  function buildFillers(data) {
    const razao = data.razao_social || '';
    const logradouro = [data.tipo_logradouro, data.logradouro].filter(Boolean).join(' ').trim();
    return {
      'i-razao': razao,
      'i-cliente': razao,
      'i-nome': data.nome_fantasia || razao,
      'i-fantasia': data.nome_fantasia,
      'i-abertura': toDateInput(data.data_inicio_atividade),
      'i-titular': data.QSA && data.QSA[0] ? data.QSA[0].nome_socio : '',
      'i-cep': formatCep(data.cep),
      'i-logradouro': logradouro,
      'i-bairro': data.bairro,
      'i-cidade': data.municipio,
      'i-uf': data.uf,
      'i-numero': data.numero,
      'i-complemento': data.complemento,
      'i-email-cnpj': data.email || data.correio_eletronico || '',
      'i-telefone': (data.ddd_telefone_1 || data.telefone || data.telefones && data.telefones[0]) || '',
      'i-endereco-cnpj': [logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf, formatCep(data.cep)]
        .filter(Boolean)
        .join(', '),
      'i-cnae': formatCnae(data),
      'i-capital-social': data.capital_social != null ? String(data.capital_social) : '',
      'i-porte': data.porte || data.porte_empresa || data.opcao_pelo_simples || '',
    };
  }

  async function applyAutofill(data) {
    const fillers = buildFillers(data);
    Object.keys(fillers).forEach(id => {
      const el = document.getElementById(id);
      if (el) setInputValue(el, fillers[id]);
    });
    const cnaeEl = document.getElementById('i-cnae');
    if (cnaeEl) {
      const enriched = await enrichCnaeDescription(data);
      if (enriched) setInputValue(cnaeEl, enriched);
    }
  }

  async function fetchCnpj(digits) {
    const base = resolveBasePath();
    const res = await fetch(base + 'api/opencnpj-lookup.php?cnpj=' + encodeURIComponent(digits), {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      const err = new Error((json && json.error) || 'Falha na consulta OpenCNPJ.');
      err.status = res.status;
      throw err;
    }
    return json.data;
  }

  function isOpenCnpjEnabled() {
    if (window.AutoDocsIntegrations && typeof window.AutoDocsIntegrations.isEnabled === 'function') {
      return window.AutoDocsIntegrations.isEnabled('opencnpj', true);
    }
    try {
      const raw = localStorage.getItem('autodocs.integrations');
      if (!raw) return true;
      const state = JSON.parse(raw);
      return state.opencnpj !== false;
    } catch {
      return true;
    }
  }

  function notifyError(message) {
    if (window.AutoDocsToast) {
      window.AutoDocsToast.error(message, 4500);
      return;
    }
    console.warn('[OpenCNPJ]', message);
  }

  async function runLookup(input, digits) {
    if (!input || digits.length !== 14) return;
    if (!isOpenCnpjEnabled()) {
      setLoading(input, false);
      return;
    }
    if (lastFetched.get(input) === digits) return;
    setLoading(input, true);
    try {
      const data = await fetchCnpj(digits);
      lastFetched.set(input, digits);
      await applyAutofill(data);
    } catch (e) {
      if (e && e.status === 401) {
        notifyError('Sessão expirada. Atualize a página e entre novamente.');
      } else if (!e || e.status !== 404) {
        notifyError((e && e.message) || 'Não foi possível consultar o CNPJ.');
      }
    } finally {
      setLoading(input, false);
    }
  }

  function scheduleLookup(input, digits) {
    const prev = timers.get(input);
    if (prev) window.clearTimeout(prev);
    if (digits.length !== 14) {
      setLoading(input, false);
      if (digits.length < 14) lastFetched.delete(input);
      return;
    }
    const t = window.setTimeout(() => {
      const current = onlyDigits(input.value);
      if (current.length !== 14) return;
      runLookup(input, current);
    }, DEBOUNCE_MS);
    timers.set(input, t);
  }

  function handleMaskedInput(input, maskFn) {
    if (!input) return;
    const digits = onlyDigits(input.value).slice(0, 14);
    const formatted = maskFn(digits);
    if (input.value !== formatted) {
      input.value = formatted;
      input.maxLength = maskFn === formatCpfCnpjDigits ? 18 : 18;
    }
    scheduleLookup(input, digits);
  }

  function bindCnpjInput(input, maskFn) {
    if (!input || input.dataset.opencnpjBound === '1') return;
    input.dataset.opencnpjBound = '1';
    input.maxLength = 18;
    input.addEventListener('input', () => handleMaskedInput(input, maskFn));
    input.addEventListener('paste', () => {
      window.setTimeout(() => handleMaskedInput(input, maskFn), 0);
    });
    input.addEventListener('blur', () => {
      const digits = onlyDigits(input.value);
      if (digits.length === 14) runLookup(input, digits);
    });
  }

  function init() {
    bindCnpjInput(document.getElementById('i-cnpj'), formatCnpjDigits);
    bindCnpjInput(document.getElementById('i-cpfcnpj'), formatCpfCnpjDigits);
  }

  window.AutoDocsOpenCnpj = {
    init,
    bindCnpjInput,
    applyAutofill,
    resolveBasePath,
    formatCnpjDigits,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('autodocs-auth-ready', init);

  document.addEventListener('autodocs-integration-changed', e => {
    if (!e.detail || e.detail.id !== 'opencnpj' || e.detail.enabled) return;
    document.querySelectorAll('[data-opencnpj-bound="1"]').forEach(input => {
      setLoading(input, false);
      const prev = timers.get(input);
      if (prev) window.clearTimeout(prev);
    });
  });
})();
