(function () {
  const LS_TAGS = 'autodocs.tags.list';
  const LS_LINKS = 'autodocs.tags.docLinks';

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
    return t;
  }

  function fallbackAccentFromTheme() {
    if (typeof document === 'undefined') return '#025aa4';
    const v = getComputedStyle(document.documentElement).getPropertyValue('--cor-accent').trim();
    return isValidHex(v) ? normalizeHex(v) : '#025aa4';
  }

  function migrateTagColors(tags) {
    const fb = fallbackAccentFromTheme();
    let changed = false;
    const next = tags.map(t => {
      if (t.accentColor && isValidHex(t.accentColor)) return t;
      changed = true;
      const defaultSofisa = '#025aa4';
      const col =
        t.id === 'tag-sofisa' ? defaultSofisa : fb;
      return { ...t, accentColor: normalizeHex(col) || col };
    });
    return { tags: next, changed };
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

    getLinks() {
      const raw = localStorage.getItem(LS_LINKS);
      const links = safeParse(raw, {});
      return links && typeof links === 'object' ? links : {};
    },

    setLinks(links) {
      localStorage.setItem(LS_LINKS, JSON.stringify(links));
    },

    /** Garante tag padrão Sofisa, cores nas tags e vínculos para cada id do catálogo. */
    ensureDefaults(catalogDocIds) {
      let tags = this.getTags();
      if (!tags.length) {
        tags = [{ id: 'tag-sofisa', name: 'Sofisa', accentColor: '#025aa4' }];
        this.setTags(tags);
      } else {
        const mig = migrateTagColors(tags);
        if (mig.changed) this.setTags(mig.tags);
        tags = mig.tags;
      }
      const defaultTagId = tags[0].id;
      const links = this.getLinks();
      let changed = false;
      catalogDocIds.forEach(id => {
        if (links[id] == null || links[id] === '') {
          links[id] = defaultTagId;
          changed = true;
        }
      });
      if (changed) this.setLinks(links);
      return tags;
    },

    createTag(name, accentColor) {
      const n = (name || '').trim();
      if (!n) return null;
      const tags = this.getTags();
      if (tags.some(t => t.name.toLowerCase() === n.toLowerCase())) return null;
      let hex = normalizeHex(accentColor || '');
      if (!hex) hex = fallbackAccentFromTheme();
      if (!isValidHex(hex)) hex = '#025aa4';
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
      const fallback = tags.filter(t => t.id !== tagId)[0].id;
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
      const links = this.getLinks();
      const tagId = links[docId];
      const t = this.tagById(tagId);
      return t ? t.name : '';
    },

    /** Cor de ênfase da marca para a documentação (hex). */
    accentForDoc(docId) {
      const links = this.getLinks();
      const t = this.tagById(links[docId]);
      if (!t) return fallbackAccentFromTheme();
      if (t.accentColor && isValidHex(t.accentColor)) return normalizeHex(t.accentColor);
      return fallbackAccentFromTheme();
    },

    countDocsForTag(tagId, catalogIds) {
      const links = this.getLinks();
      return catalogIds.filter(id => links[id] === tagId).length;
    },
  };
})();
