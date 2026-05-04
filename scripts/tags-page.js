(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizePickerHex(hex) {
    if (!hex || typeof hex !== 'string') return '#025aa4';
    const t = hex.trim();
    if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
      const r = t[1];
      const g = t[2];
      const b = t[3];
      return '#' + r + r + g + g + b + b;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    return '#025aa4';
  }

  function defaultAccentForForm() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--cor-accent').trim();
    if (/^#[0-9A-Fa-f]{3,6}$/i.test(v)) return normalizePickerHex(v);
    return '#025aa4';
  }

  function renderTagsList() {
    const ul = document.getElementById('tags-list');
    if (!ul || !window.AutoDocsTags) return;
    const tags = window.AutoDocsTags.getTags();
    const catalog = window.AUTODOCS_DOCS_CATALOG || [];
    const ids = catalog.map(d => d.id);
    ul.innerHTML = '';
    tags.forEach(tag => {
      const n = window.AutoDocsTags.countDocsForTag(tag.id, ids);
      const accent = tag.accentColor || '#025aa4';
      const li = document.createElement('li');
      li.className = 'tags-row';
      li.innerHTML =
        '<input type="color" class="tags-row-color" data-tag-id="' +
        escapeHtml(tag.id) +
        '" value="' +
        escapeHtml(normalizePickerHex(accent)) +
        '" title="Cor da marca" aria-label="Cor da tag ' +
        escapeHtml(tag.name) +
        '">' +
        '<span class="tags-row-name">' +
        escapeHtml(tag.name) +
        '</span>' +
        '<span class="tags-row-meta">' +
        n +
        ' doc.</span>' +
        '<button type="button" class="tags-btn-remove" data-tag-id="' +
        escapeHtml(tag.id) +
        '" title="Excluir tag">×</button>';
      ul.appendChild(li);
    });

    ul.querySelectorAll('.tags-row-color').forEach(inp => {
      inp.addEventListener('input', () => {
        const id = inp.getAttribute('data-tag-id');
        window.AutoDocsTags.setTagAccent(id, inp.value);
      });
    });

    ul.querySelectorAll('.tags-btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-tag-id');
        const tags = window.AutoDocsTags.getTags();
        if (tags.length <= 1) {
          alert('É necessário manter pelo menos uma tag.');
          return;
        }
        if (!confirm('Excluir esta tag? As documentações vinculadas passarão a usar outra tag.')) return;
        if (window.AutoDocsTags.deleteTag(id)) renderAll();
      });
    });
  }

  function renderDocLinks() {
    const tbody = document.getElementById('tags-doc-table');
    if (!tbody || !window.AutoDocsTags || !window.AUTODOCS_DOCS_CATALOG) return;
    const catalog = window.AUTODOCS_DOCS_CATALOG;
    window.AutoDocsTags.ensureDefaults(catalog.map(d => d.id));
    const tags = window.AutoDocsTags.getTags();
    const links = window.AutoDocsTags.getLinks();
    tbody.innerHTML = '';

    catalog.forEach(doc => {
      const tr = document.createElement('tr');
      const current = links[doc.id] || tags[0].id;
      const options = tags
        .map(
          t =>
            '<option value="' +
            escapeHtml(t.id) +
            '"' +
            (t.id === current ? ' selected' : '') +
            '>' +
            escapeHtml(t.name) +
            '</option>'
        )
        .join('');
      tr.innerHTML =
        '<td>' +
        escapeHtml(doc.title) +
        '</td>' +
        '<td><select class="tags-doc-select input" data-doc-id="' +
        escapeHtml(doc.id) +
        '" aria-label="Tag para ' +
        escapeHtml(doc.title) +
        '">' +
        options +
        '</select></td>';
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.tags-doc-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const docId = sel.getAttribute('data-doc-id');
        window.AutoDocsTags.setDocTag(docId, sel.value);
        renderTagsList();
      });
    });
  }

  function renderAll() {
    renderTagsList();
    renderDocLinks();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.AutoDocsTags || !window.AUTODOCS_DOCS_CATALOG) return;
    window.AutoDocsTags.ensureDefaults(window.AUTODOCS_DOCS_CATALOG.map(d => d.id));

    const picker = document.getElementById('nova-tag-cor');
    const textCor = document.getElementById('nova-tag-cor-text');
    const def = defaultAccentForForm();
    if (picker) picker.value = normalizePickerHex(def);
    if (textCor) textCor.value = normalizePickerHex(def);

    if (picker && textCor) {
      picker.addEventListener('input', () => {
        textCor.value = picker.value;
      });
      textCor.addEventListener('input', () => {
        const v = textCor.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/i.test(v)) picker.value = normalizePickerHex(v);
      });
    }

    const form = document.getElementById('form-nova-tag');
    const input = document.getElementById('nova-tag-nome');
    if (form && input) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const cor = textCor ? textCor.value.trim() : picker ? picker.value : '#025aa4';
        const id = window.AutoDocsTags.createTag(input.value, cor);
        if (!id) {
          alert('Nome inválido ou tag já existente.');
          return;
        }
        input.value = '';
        const d = defaultAccentForForm();
        if (picker) picker.value = normalizePickerHex(d);
        if (textCor) textCor.value = normalizePickerHex(d);
        renderAll();
      });
    }

    renderAll();
  });
})();
