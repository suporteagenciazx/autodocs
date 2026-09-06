# Importação PDF → modelo nativo AutoDocs

Plano de execução em 3 fases. Objetivo: transformar um PDF (com placeholders já no texto) num documento **nativo** AutoDocs — o mesmo padrão de Contrato/Garantia — **não** híbrido PNG+overlay.

## Definição de modelo nativo

Um documento nativo tem:

| Peça | Função |
|------|--------|
| `index.html` | Formulário (`i-*`) + `#documento` |
| `#documento` | 0..1 `.capa` + N `.pagina` (A4 792×1120) |
| Conteúdo | HTML tipográfico (`.pagina-conteudo` / `.pagina-textos`) |
| Variáveis | `<span id="…">[PLACEHOLDER]</span>` |
| `inputs.js` | Liga `i-*` → spans |
| Fundo | SVG/imagem CSS (`mda`, `capa`) ou cor sólida |
| Catálogo | Entrada no Designer / Documentações |

**Não** é caixa absoluta sobre raster. O PDF é a **fonte**; o resultado é HTML nativo.

---

## Fluxo do utilizador (visão completa)

1. Enviar PDF completo com placeholders (`[CNPJ]`, `[RAZÃO SOCIAL]`, …)
2. Enviar **capa** (opcional) — imagem/SVG
3. Enviar **MDA** (fundo das páginas intermediárias)
4. Definir **cor da última página** (sem MDA)
5. Sistema extrai texto/páginas, propõe spans e formulário
6. Revisão: editar campos, ordem, tipografia mínima
7. Finalizar → grava em `documentos/importados/{slug}/` → abre emissão

---

## Fase 1 — MVP (iniciar agora)

**Meta:** importar PDF e gerar documento nativo usável, com revisão mínima.

### Entregas

- [x] Documento de plano em `/docs` (este ficheiro)
- [x] Opção no Designer: **Importar PDF (nativo)**
- [x] Upload: PDF + título + tag + capa (opc.) + MDA (opc.) + cor última página
- [x] Extração de texto por página (Node/`pdf-parse`)
- [x] Detecção de placeholders `[…]`
- [x] Geração de:
  - `index.html` nativo (form + `#documento`)
  - `inputs.js`
  - assets (`capa`, `mda`)
  - última página com `background-color` sólido
- [x] Registo no storage do Designer (`source: pdf`)
- [x] Abrir documento para emissão após import

### Regras Fase 1

- 1 página PDF → 1 `.pagina`
- Placeholders só se forem **texto real** no PDF (não desenho)
- Sem editor visual de caixas
- Sem reordenação avançada de campos (ordem = ordem de aparição)
- Paginação = páginas do PDF (não reflow automático)

### Stack sugerida

- `api/autodocs-pdf-native-import.php` — endpoint POST (admin)
- `api/autodocs-pdf-native-lib.php` — montagem HTML/JS/assets
- `tools/pdf-native/extract.mjs` — extrai texto por página
- UI em `designer/index.html` + `designer-page.js`

### Critérios de aceite

1. Admin importa PDF com `[CNPJ]` e `[CLIENTE]`
2. Documento aparece no Designer e em Documentações (conforme permissões)
3. Formulário preenche spans no preview
4. Exportar/imprimir funciona como Garantia/Contrato
5. Última página usa cor definida; restantes usam MDA se enviado

---

## Fase 2 — Revisão e controlo

**Meta:** operador afina o modelo antes de publicar.

### Entregas

- [ ] Ecrã de revisão pós-extração (ainda no modal/wizard)
- [ ] Adicionar / remover / renomear campos do formulário
- [ ] Reordenar campos do formulário
- [ ] Escolher fundo por página: MDA | cor sólida | nenhum
- [ ] Marcar página 1 como capa (ou usar upload de capa)
- [ ] Preview HTML nativo lado a lado com aviso de placeholders não mapeados
- [ ] Validação: placeholders órfãos, campos sem span

### Critérios de aceite

1. Utilizador pode alterar ordem dos inputs antes de finalizar
2. Pode forçar última (ou qualquer) página só com cor
3. Pode acrescentar campo manual e mapear a um `[NOVO]` existente no texto

---

## Fase 3 — Fidelidade e produtividade

**Meta:** aproximar layout do PDF e reduzir trabalho manual.

### Entregas

- [ ] Heurísticas de blocos (títulos, parágrafos, assinaturas)
- [ ] Sugestão automática de tipografia (bold / tamanho relativo)
- [ ] Clamp / aviso quando texto excede área útil A4
- [ ] Diff visual opcional (thumbnail PDF vs HTML)
- [ ] Reimportar PDF atualizando só conteúdo (preservar mapeamentos)
- [ ] Biblioteca de placeholders padrão Sofisa/AutoDocs
- [ ] Testes E2E Playwright (import → preencher → export)

### Critérios de aceite

1. Documento de várias páginas (tipo Contrato) importável com qualidade legível
2. Documento de 1 página (tipo Garantia) fiel em tipografia básica
3. Reimport não duplica slug; atualiza modelo existente com confirmação

---

## Fora de âmbito (todas as fases)

- Editor WYSIWYG completo tipo Word
- Conversão pixel-perfect PDF → HTML
- OCR de PDF scaneado (só texto embutido na Fase 1–2)
- Substituir modelos HTML manuais existentes (Contrato Sofisa continua gold standard)

---

## Ordem de implementação

```
Fase 1  →  API + extract + HTML nativo + UI Designer
Fase 2  →  Wizard de revisão (campos/fundos)
Fase 3  →  Heurísticas + reimport + E2E
```

## Estado

| Fase | Estado |
|------|--------|
| 1 — MVP | Em curso (API + UI + extract + geração nativa entregues) |
| 2 — Revisão | Pendente |
| 3 — Fidelidade | Pendente |

### Fase 1 — entregas feitas

- [x] Documento de plano em `/docs`
- [x] Opção no Designer: **Importar PDF (nativo)**
- [x] Upload: PDF + título + tag + capa (opc.) + MDA (opc.) + cor última página
- [x] Extração de texto por página (`tools/pdf-native` + `pdf-parse`)
- [x] Detecção de placeholders `[…]`
- [x] Geração de `index.html` + `inputs.js` + assets + meta
- [x] Registo no Designer (`source: pdf`)
- [x] Abrir documento para emissão após import

Última atualização: 2026-09-03
