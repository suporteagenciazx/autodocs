(function () {
  const LS_TAGS = 'autodocs.tags.list';
  const LS_LINKS = 'autodocs.tags.docLinks';
  const SOFISA_ACCENT = '#006157';
  const USO_GERAL_ACCENT = '#5c6b73';
  const USO_GERAL_TAG_ID = 'tag-uso-geral';
  const LEGACY_SOFISA_BLUE = '#025aa4';
  let syncPromise = null;
  let lastPushError = null;

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v != null ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function newId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return prefix + crypto.randomUUID().slice(0, 8);
    }
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function isValidHex(v) {
    return typeof v === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v.trim());
  }

  function normalizeHex(v) {
    if (!v || typeof v !== 'string') return '';
    const t = v.trim();
    if (!isValidHex(t)) return '';
    if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
      const r = t[1];
      const g = t[2];
      const b = t[3];
      return '#' + r + r + g + g + b + b;
    }
    return t.toLowerCase();
  }

  function fallbackAccentFromTheme() {
    if (typeof document === 'undefined') return SOFISA_ACCENT;
    const v = getComputedStyle(document.documentElement).getPropertyValue('--cor-accent').trim();
    return isValidHex(v) ? normalizeHex(v) : SOFISA_ACCENT;
  }

  function dispatchTagsSynced(ok) {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(
      new CustomEvent('autodocs-tags-synced', { detail: { ok: !!ok } })
    );
  }

  function dispatchPushError(message) {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(
      new CustomEvent('autodocs-tags-push-error', { detail: { message: message || '' } })
    );
  }

  function migrateTagColors(tags) {
    const fb = fallbackAccentFromTheme();
    let changed = false;
    const next = tags.map(t => {
      if (t.accentColor && isValidHex(t.accentColor)) {
        const hex = normalizeHex(t.accentColor);
        if (t.id === 'tag-sofisa' && hex === LEGACY_SOFISA_BLUE) {
          changed = true;
          return { ...t, accentColor: SOFISA_ACCENT };
        }
        return t;
      }
      changed = true;
      const col = t.id === 'tag-sofisa' ? SOFISA_ACCENT : fb;
      return { ...t, accentColor: normalizeHex(col) || col };
    });
    return { tags: next, changed };
  }

  function isAdminUser() {
    const a = window.__autodocsAuth;
    return !!(a && a.user && a.user.role === 'admin');
  }

  function applyServerPayload(data) {
    if (!data || typeof data !== 'object') return false;
    const tags = Array.isArray(data.tags) ? data.tags : [];
    if (!tags.length) return false;
    const links = data.docLinks && typeof data.docLinks === 'object' ? data.docLinks : {};
    const mig = migrateTagColors(tags);
    localStorage.setItem(LS_TAGS, JSON.stringify(mig.tags));
    localStorage.setItem(LS_LINKS, JSON.stringify(links));
    return true;
  }

  function hasLocalTagsState() {
    try {
      const raw = localStorage.getItem(LS_TAGS);
      const tags = raw ? JSON.parse(raw) : [];
      return Array.isArray(tags) && tags.length > 0;
    } catch (_) {
      return false;
    }
  }

  async function fetchTagsJson(basePath) {
    if (location.protocol === 'file:') return null;
    const bp = basePath || (typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/');
    try {
      const res = await fetch(bp + 'api/autodocs-tags.php', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data && typeof data === 'object' ? data : null;
    } catch (_) {
      return null;
    }
  }

  async function pushTagsToServer(basePath) {
    lastPushError = null;
    if (location.protocol === 'file:') {
      lastPushError = 'Gravação no servidor indisponível em file://.';
      return { ok: false, error: lastPushError };
    }
    if (!isAdminUser()) {
      lastPushError = 'Apenas administradores podem gravar tags no servidor.';
      return { ok: false, error: lastPushError };
    }
    const bp = basePath || (typeof window.getAutoDocsBasePath === 'function' ? window.getAutoDocsBasePath() : '/');
    try {
      const res = await fetch(bp + 'api/autodocs-tags.php', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: window.AutoDocsTags.getTags(),
          docLinks: window.AutoDocsTags.getLinks(),
        }),
      });
      if (res.ok) {
        dispatchTagsSynced(true);
        return { ok: true, error: null };
      }
      let msg = 'Não foi possível gravar as tags no servidor (HTTP ' + res.status + ').';
      try {
        const err = await res.json();
        if (err && err.error) msg = String(err.error);
      } catch (_) {
        /* ignore */
      }
      lastPushError = msg;
      dispatchPushError(msg);
      return { ok: false, error: msg };
    } catch (_) {
      lastPushError = 'Falha de rede ao gravar tags no servidor.';
      dispatchPushError(lastPushError);
      return { ok: false, error: lastPushError };
    }
  }

  window.AutoDocsTags = {
    getTags() {
      const raw = localStorage.getItem(LS_TAGS);
      const tags = safeParse(raw, []);
      return Array.isArray(tags) ? tags : [];
    },

    setTags(tags) {
      localStorage.setItem(LS_TAGS, JSON.stringify(tags));
    },

    setTagsLocal(tags) {
      this.setTags(tags);
    },

    getLinks() {
      const raw = localStorage.getItem(LS_LINKS);
      const links = safeParse(raw, {});
      return links && typeof links === 'object' ? links : {};
    },

    setLinks(links) {
      localStorage.setItem(LS_LINKS, JSON.stringify(links));
    },

    setLinksLocal(links) {
      this.setLinks(links);
    },

    getLastPushError() {
      return lastPushError;
    },

    /** Carrega tags/docLinks do servidor para o localStorage (todos os utilizadores). */
    async syncFromServer(basePath) {
      if (syncPromise) return syncPromise;
      syncPromise = (async () => {
        const data = await fetchTagsJson(basePath);
        if (!data) return false;
        const persisted = !!data.persisted;
        if (!persisted && isAdminUser() && hasLocalTagsState()) {
          const result = await pushTagsToServer(basePath);
          return result.ok;
        }
        if (applyServerPayload(data)) return true;
        return false;
      })();
      try {
        const ok = await syncPromise;
        dispatchTagsSynced(ok);
        return ok;
      } finally {
        syncPromise = null;
      }
    },

    /** Admin: envia estado atual ao servidor (único ponto de POST). */
    async saveToServer(basePath) {
      return pushTagsToServer(basePath);
    },

    clearLastPushError() {
      lastPushError = null;
    },

    usoGeralTagId() {
      return USO_GERAL_TAG_ID;
    },

    ensureUsoGeralTag(tags) {
      if (tags.some(t => t.id === USO_GERAL_TAG_ID)) {
        return tags;
      }
      return tags.concat([
        { id: USO_GERAL_TAG_ID, name: 'Uso Geral', accentColor: USO_GERAL_ACCENT },
      ]);
    },

    /** Garante tags padrão, Uso Geral e vínculos para cada id do catálogo. */
    ensureDefaults(catalogDocIds) {
      let tags = this.getTags();
      if (!tags.length) {
        tags = [
          { id: 'tag-sofisa', name: 'Sofisa', accentColor: SOFISA_ACCENT },
          { id: USO_GERAL_TAG_ID, name: 'Uso Geral', accentColor: USO_GERAL_ACCENT },
        ];
        localStorage.setItem(LS_TAGS, JSON.stringify(tags));
      } else {
        const mig = migrateTagColors(tags);
        tags = mig.tags;
        let needsWrite = mig.changed;
        tags = tags.map(t => {
          if (t.id === 'tag-sofisa' && normalizeHex(t.accentColor || '') === LEGACY_SOFISA_BLUE) {
            needsWrite = true;
            return { ...t, accentColor: SOFISA_ACCENT };
          }
          return t;
        });
        if (needsWrite) {
          localStorage.setItem(LS_TAGS, JSON.stringify(tags));
        }
      }
      const beforeLen = tags.length;
      tags = this.ensureUsoGeralTag(tags);
      if (tags.length !== beforeLen) {
        localStorage.setItem(LS_TAGS, JSON.stringify(tags));
      }
      const defaultTagId =
        tags.find(t => t.id === USO_GERAL_TAG_ID)?.id || tags[0].id;
      const links = this.getLinks();
      let changed = false;
      catalogDocIds.forEach(id => {
        if (links[id] == null || links[id] === '') {
          links[id] = defaultTagId;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(LS_LINKS, JSON.stringify(links));
      }
      return tags;
    },

    createTag(name, accentColor) {
      const n = (name || '').trim();
      if (!n) return null;
      const tags = this.getTags();
      if (tags.some(t => t.name.toLowerCase() === n.toLowerCase())) return null;
      let hex = normalizeHex(accentColor || '');
      if (!hex) hex = fallbackAccentFromTheme();
      if (!isValidHex(hex)) hex = SOFISA_ACCENT;
      const tag = {
        id: newId('tag-'),
        name: n,
        createdAt: Date.now(),
        accentColor: hex,
      };
      tags.push(tag);
      this.setTags(tags);
      return tag.id;
    },

    setTagAccent(tagId, accentColor) {
      const hex = normalizeHex(accentColor || '');
      if (!hex || !isValidHex(hex)) return false;
      const tags = this.getTags();
      const ix = tags.findIndex(t => t.id === tagId);
      if (ix === -1) return false;
      tags[ix].accentColor = hex;
      this.setTags(tags);
      return true;
    },

    renameTag(tagId, name) {
      const n = (name || '').trim();
      if (!n) return false;
      const tags = this.getTags();
      const ix = tags.findIndex(t => t.id === tagId);
      if (ix === -1) return false;
      if (tags.some((t, i) => i !== ix && t.name.toLowerCase() === n.toLowerCase())) return false;
      tags[ix].name = n;
      this.setTags(tags);
      return true;
    },

    deleteTag(tagId) {
      let tags = this.getTags();
      if (tags.length <= 1) return false;
      const ix = tags.findIndex(t => t.id === tagId);
      if (ix === -1) return false;
      if (tagId === USO_GERAL_TAG_ID) return false;
      const fallback =
        tags.find(t => t.id === USO_GERAL_TAG_ID)?.id ||
        tags.filter(t => t.id !== tagId)[0]?.id;
      if (!fallback) return false;
      tags = tags.filter(t => t.id !== tagId);
      this.setTags(tags);
      const links = this.getLinks();
      Object.keys(links).forEach(docId => {
        if (links[docId] === tagId) links[docId] = fallback;
      });
      this.setLinks(links);
      return true;
    },

    setDocTag(docId, tagId) {
      const tags = this.getTags();
      if (!tags.some(t => t.id === tagId)) return false;
      const links = this.getLinks();
      links[docId] = tagId;
      this.setLinks(links);
      return true;
    },

    tagById(tagId) {
      return this.getTags().find(t => t.id === tagId) || null;
    },

    tagNameForDoc(docId) {
      const tagId = this.getLinks()[docId];
      const t = this.tagById(tagId);
      return t ? t.name : '';
    },

    docsForTag(tagId, catalogIds) {
      const links = this.getLinks();
      return (catalogIds || []).filter(id => links[id] === tagId);
    },

    /** Cor de ênfase da marca para a documentação (hex). */
    accentForDoc(docId) {
      const tagId = this.getLinks()[docId];
      const t = this.tagById(tagId);
      if (!t) return SOFISA_ACCENT;
      if (t.accentColor && isValidHex(t.accentColor)) {
        const hex = normalizeHex(t.accentColor);
        if (t.id === 'tag-sofisa' && hex === LEGACY_SOFISA_BLUE) {
          return SOFISA_ACCENT;
        }
        return hex;
      }
      return t.id === 'tag-sofisa' ? SOFISA_ACCENT : fallbackAccentFromTheme();
    },

    countDocsForTag(tagId, catalogIds) {
      const links = this.getLinks();
      return catalogIds.filter(id => links[id] === tagId).length;
    },
  };
})();
