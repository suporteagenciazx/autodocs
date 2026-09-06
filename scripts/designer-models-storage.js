(function () {
  const LS_MODELS = 'autodocs.designer.models';
  const LS_ARCHIVED = 'autodocs.designer.archived';
  const LS_OVERRIDES = 'autodocs.designer.catalogOverrides';

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v != null ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function newId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'designer-' + crypto.randomUUID().slice(0, 8);
    }
    return 'designer-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function normalizeSource(source) {
    if (source === 'figma') return 'figma';
    if (source === 'pdf') return 'pdf';
    return 'native';
  }

  function normalizeModel(m) {
    return {
      id: String(m.id),
      catalogId: m.catalogId || null,
      title: String(m.title),
      blurb: m.blurb ? String(m.blurb) : '',
      href: m.href ? String(m.href) : '',
      source: normalizeSource(m.source),
      tagId: m.tagId ? String(m.tagId) : '',
      figmaUrl: m.figmaUrl ? String(m.figmaUrl) : '',
      isCatalog: !!m.isCatalog,
      updatedAt: m.updatedAt || null,
      archivedAt: m.archivedAt || null,
    };
  }

  function getCatalogOverrides() {
    const raw = localStorage.getItem(LS_OVERRIDES);
    const map = safeParse(raw, {});
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  }

  function setCatalogOverrides(map) {
    localStorage.setItem(LS_OVERRIDES, JSON.stringify(map));
  }

  function catalogAsModels() {
    const catalog = window.AUTODOCS_DOCS_CATALOG || [];
    const overrides = getCatalogOverrides();
    return catalog.map(doc => {
      const over = overrides[doc.id] && typeof overrides[doc.id] === 'object' ? overrides[doc.id] : {};
      return {
        id: 'catalog-' + doc.id,
        catalogId: doc.id,
        title: over.title ? String(over.title) : doc.title,
        blurb: over.blurb != null ? String(over.blurb) : doc.blurb || '',
        href: doc.href,
        source: 'native',
        isCatalog: true,
      };
    });
  }

  function getArchivedRaw() {
    const raw = localStorage.getItem(LS_ARCHIVED);
    const models = safeParse(raw, []);
    if (!Array.isArray(models)) return [];
    return models
      .filter(m => m && typeof m === 'object' && m.id && m.title)
      .map(normalizeModel);
  }

  function setArchivedRaw(models) {
    localStorage.setItem(LS_ARCHIVED, JSON.stringify(models));
  }

  function archivedIdSet() {
    return new Set(getArchivedRaw().map(m => m.id));
  }

  window.AutoDocsDesignerModels = {
    /** Overrides locais de título/descrição de docs do catálogo (editados no Designer). */
    getCatalogOverrides() {
      return getCatalogOverrides();
    },

    /** Aplica overrides do Designer sobre um item do catálogo (id/href intactos). */
    resolveCatalogDoc(doc) {
      if (!doc || !doc.id) return doc;
      const over = getCatalogOverrides()[doc.id];
      if (!over || typeof over !== 'object') return doc;
      return Object.assign({}, doc, {
        title: over.title ? String(over.title) : doc.title,
        blurb: over.blurb != null ? String(over.blurb) : doc.blurb || '',
      });
    },

    getCustomModels() {
      const raw = localStorage.getItem(LS_MODELS);
      const models = safeParse(raw, []);
      if (!Array.isArray(models)) return [];
      return models
        .filter(m => m && typeof m === 'object' && m.id && m.title)
        .map(normalizeModel);
    },

    setCustomModels(models) {
      localStorage.setItem(LS_MODELS, JSON.stringify(models));
    },

    getArchivedModels() {
      return getArchivedRaw().sort((a, b) => {
        const ta = a.archivedAt || '';
        const tb = b.archivedAt || '';
        return tb.localeCompare(ta);
      });
    },

    getAllModels() {
      const archived = archivedIdSet();
      return catalogAsModels()
        .concat(this.getCustomModels())
        .filter(m => !archived.has(m.id));
    },

    upsertModel(payload) {
      if (!payload || !payload.id || !payload.title) return null;
      const model = normalizeModel(payload);
      model.isCatalog = false;
      const list = this.getCustomModels();
      const idx = list.findIndex(m => m.id === model.id);
      if (idx >= 0) {
        list[idx] = Object.assign({}, list[idx], model);
      } else {
        list.push(model);
      }
      this.setCustomModels(list);
      // se estava arquivado, tirar do arquivo
      setArchivedRaw(getArchivedRaw().filter(m => m.id !== model.id));
      return model;
    },

    /**
     * Atualiza nome, descrição e tag de um modelo activo (catálogo ou custom).
     * Modelos do catálogo guardam título/descrição em overrides locais; a tag
     * vai para AutoDocsTags.docLinks. Modelos custom actualizam o próprio registo.
     */
    updateModelMeta(modelId, payload) {
      const title = payload && payload.title ? String(payload.title).trim() : '';
      if (!title) return { ok: false, error: 'Informe o nome da documentação.' };
      const blurb = payload && payload.blurb != null ? String(payload.blurb).trim() : '';
      const tagId = payload && payload.tagId ? String(payload.tagId).trim() : '';

      const found = this.getAllModels().find(m => m.id === modelId);
      if (!found) return { ok: false, error: 'Documentação não encontrada.' };

      if (found.isCatalog && found.catalogId) {
        const overrides = getCatalogOverrides();
        overrides[found.catalogId] = { title, blurb };
        setCatalogOverrides(overrides);
        if (tagId && window.AutoDocsTags) {
          window.AutoDocsTags.setDocTag(found.catalogId, tagId);
        }
        return {
          ok: true,
          model: Object.assign({}, found, { title, blurb, tagId: tagId || found.tagId || '' }),
          catalog: true,
        };
      }

      const list = this.getCustomModels();
      const idx = list.findIndex(m => m.id === modelId);
      if (idx < 0) return { ok: false, error: 'Documentação não encontrada.' };
      list[idx] = Object.assign({}, list[idx], {
        title,
        blurb,
        tagId,
        updatedAt: new Date().toISOString(),
      });
      this.setCustomModels(list);
      return { ok: true, model: list[idx], catalog: false };
    },

    addModel(payload) {
      const title = payload && payload.title ? String(payload.title).trim() : '';
      if (!title) return null;
      const model = {
        id: newId(),
        catalogId: null,
        title,
        blurb: payload.blurb ? String(payload.blurb).trim() : '',
        href: payload.href ? String(payload.href) : '',
        source: normalizeSource(payload.source),
        tagId: payload.tagId ? String(payload.tagId) : '',
        figmaUrl: payload.figmaUrl ? String(payload.figmaUrl).trim() : '',
        isCatalog: false,
        updatedAt: new Date().toISOString(),
      };
      const next = this.getCustomModels().concat(model);
      this.setCustomModels(next);
      return model;
    },

    archiveModel(modelId) {
      if (!modelId) return false;
      const active = this.getAllModels();
      const found = active.find(m => m.id === modelId);
      if (!found) return false;
      const archived = getArchivedRaw().filter(m => m.id !== modelId);
      archived.push(
        Object.assign({}, found, {
          archivedAt: new Date().toISOString(),
        })
      );
      setArchivedRaw(archived);
      if (!found.isCatalog) {
        this.setCustomModels(this.getCustomModels().filter(m => m.id !== modelId));
      }
      return true;
    },

    restoreModel(modelId) {
      if (!modelId) return false;
      const archived = getArchivedRaw();
      const found = archived.find(m => m.id === modelId);
      if (!found) return false;
      setArchivedRaw(archived.filter(m => m.id !== modelId));
      if (!found.isCatalog && found.catalogId == null) {
        const customs = this.getCustomModels().filter(m => m.id !== modelId);
        const restored = Object.assign({}, found);
        delete restored.archivedAt;
        customs.push(restored);
        this.setCustomModels(customs);
      }
      return true;
    },

    /**
     * Remove do arquivo (e da lista custom). Para importados, o caller deve apagar ficheiros via API.
     */
    permanentlyDelete(modelId) {
      if (!modelId) return null;
      const archived = getArchivedRaw();
      const found = archived.find(m => m.id === modelId) || this.getCustomModels().find(m => m.id === modelId);
      if (!found) return null;
      if (found.isCatalog) {
        return { ok: false, error: 'Modelos nativos do catálogo não podem ser eliminados.', model: found };
      }
      setArchivedRaw(archived.filter(m => m.id !== modelId));
      this.setCustomModels(this.getCustomModels().filter(m => m.id !== modelId));
      return { ok: true, model: found };
    },

    isImportedHref(href) {
      return typeof href === 'string' && /documentos\/importados\//i.test(href);
    },
  };
})();
