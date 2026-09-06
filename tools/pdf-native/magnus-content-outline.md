# Magnus Laudo — Content Outline

Gerado em: 2026-09-05T05:32:00.000Z

## Summary

- **Document:** Laudo de avaliação econômica MAGNUS / **VALUATION EMPRESARIAL**
- **Brand:** MAGNUS Relações Empresariais (Grupo Magnus Relações Empresariais Ltda)
- **Pages:** **4**
- **Page 1 is cover:** **yes** (logo + título; sem placeholders)
- **Page 4 is closing:** yes (“AGRADECEMOS A SUA PREFERÊNCIA.”)
- **PDF:** image-based (pdf-parse: sem texto extraível). Texto obtido por render (pdf.js) + OCR/visão.
- **Figma `.fig`:** ZIP com `canvas.fig` + 30 imagens embutidas + `meta.json`. Conteúdo tipográfico está **rasterizado** nas páginas (não há camadas de texto editáveis úteis com `{PLACEHOLDER}` no kiwi). `fig-to-json` estoura memória (~4GB+) neste ficheiro; import ESM de `fig-to-json` foi corrigido em `tools/figma-package/parse-fig.mjs` para usos futuros.
- **meta.json render board:** 2459×842 (quadro horizontal ~4 páginas lado a lado)
- **Assets de marca disponíveis:** `CAPA.png`, `MDA.png` (fundo geométrico + barra verde + rodapé “VALUATION EMPRESARIAL”)

## Unique `{PLACEHOLDER}` variables (explicit in design)

Encontrados na **página 2** (OCR + leitura visual das páginas renderizadas):

| Placeholder | Onde | Notas |
|---|---|---|
| `{RAZAO-SOCIAL}` | P2 header | Nome da empresa avaliada |
| `{CNPJ}` | P2 header | OCR leu `{CNP}` uma vez; visual confirma `{CNPJ}` |
| `{EMAIL-CNPJ}` | P2 contatos | E-mail |
| `{TELEFONE}` | P2 contatos | Telefone(s) |
| `{ENDERECO-CNPJ}` | P2 endereço | Endereço / local |
| `{CNAE}` | P2 atividades | Atividades / CNAEs |
| `{FUNCIONARIOS}` | P2 métrica | Nº de funcionários |
| `{CAPITAL-SOCIAL}` | P2 métrica | Capital social |
| `{DATA-ABERTURA}` | P2 métrica | Data de abertura |
| `{PORTE}` | P2 métrica | Porte da empresa |

**Lista única (canónica):**

1. `{RAZAO-SOCIAL}`
2. `{CNPJ}`
3. `{EMAIL-CNPJ}`
4. `{TELEFONE}`
5. `{ENDERECO-CNPJ}`
6. `{CNAE}`
7. `{FUNCIONARIOS}`
8. `{CAPITAL-SOCIAL}`
9. `{DATA-ABERTURA}`
10. `{PORTE}`

## Suggested additional fields (sample values on page 3 / chart — not braced in art)

Para template nativo tipo Contrato Sofisa, converter valores de exemplo em spans:

| Suggested token | Sample in PDF | Group |
|---|---|---|
| `{TAXA-DESCONTO}` | 20,00% | premissas |
| `{CRESCIMENTO-PERPETUIDADE}` | 3,00% | premissas |
| `{IPCA-PROJETADO}` | 5,00% | premissas |
| `{VALOR-5-ANOS}` | R$ 1.851.777,17 | valores |
| `{VALOR-TOTAL-EMPRESA}` | R$ 1.970.134,12 | valores |
| `{VALOR-PERPETUIDADE}` | R$ 2.183.456,78 | valores |
| `{FATURAMENTO-MES-1}` / `MES-2` / `MES-3` | 119.972,91 / 198.691,04 / 245.147,43 (aprox.) | faturamento |
| `{FATURAMENTO-LABEL-1..3}` | Maio / Junho / Julho | faturamento |
| `{ECONOMISTA-NOME}` | Economista Afonso Reis Duarte | responsavel_tecnico |
| `{ECONOMISTA-COFECON}` | COFECON 15813 | responsavel_tecnico |
| `{MAGNUS-CNPJ}` | 14.668.756/0001-53 | documento / emissor |

## Suggested form field groups

### empresa_avaliada (cliente / alvo)

- `{RAZAO-SOCIAL}`
- `{CNPJ}`
- `{CNAE}`
- `{FUNCIONARIOS}`
- `{CAPITAL-SOCIAL}`
- `{DATA-ABERTURA}`
- `{PORTE}`

### contatos_endereco

- `{EMAIL-CNPJ}`
- `{TELEFONE}`
- `{ENDERECO-CNPJ}`

### faturamento (sugerido)

- `{FATURAMENTO-LABEL-1}` … `{FATURAMENTO-LABEL-3}`
- `{FATURAMENTO-MES-1}` … `{FATURAMENTO-MES-3}`

### premissas_valuation (sugerido)

- `{TAXA-DESCONTO}`
- `{CRESCIMENTO-PERPETUIDADE}`
- `{IPCA-PROJETADO}`

### valores_resultado (sugerido)

- `{VALOR-5-ANOS}`
- `{VALOR-PERPETUIDADE}`
- `{VALOR-TOTAL-EMPRESA}`

### responsavel_tecnico (sugerido)

- `{ECONOMISTA-NOME}`
- `{ECONOMISTA-COFECON}`

### documento / emissor (estático ou configurável)

- Marca MAGNUS / Grupo Magnus Relações Empresariais Ltda
- `{MAGNUS-CNPJ}`
- Selos COFECON / CORECON-SP

---

## Pages (reading order)

### Página 1 — Capa (CAPA)

- **Role:** cover
- **Placeholders:** none
- **Visual:** fundo branco; logo MAGNUS (M + check verde) + “Relações Empresariais”; título **VALUATION EMPRESARIAL**
- **Text:**

```
MAGNUS
Relações Empresariais

VALUATION EMPRESARIAL
```

### Página 2 — Resumo da empresa (MDA)

- **Role:** body / company summary
- **Background:** MDA (padrão geométrico + barra verde + rodapé)
- **Explicit placeholders:** todos os 10 `{…}` canónicos
- **Text (estrutura):**

```
RESUMO DA EMPRESA

{RAZAO-SOCIAL}
{CNPJ} |

CONTATOS
E-MAIL: {EMAIL-CNPJ}
TELEFONE(S): {TELEFONE}

ATIVIDADES - CNAES
{CNAE}

ENDEREÇO / LOCAL
{ENDERECO-CNPJ}

FUNCIONÁRIOS          CAPITAL SOCIAL
{FUNCIONARIOS}        {CAPITAL-SOCIAL}

DATA DE ABERTURA      PORTE
{DATA-ABERTURA}       {PORTE}

FATURAMENTO DOS ÚLTIMOS 3 (TRÊS) MESES
[gráfico de linha — valores de exemplo Maio/Junho/Julho]
  ~119.972,91 → ~198.691,04 → ~245.147,43

VALUATION EMPRESARIAL
```

### Página 3 — Cálculo DCF / resultado (MDA)

- **Role:** valuation results + disclaimer + signature
- **Explicit `{…}`:** none in art (valores hardcoded no PDF de exemplo)
- **Text:**

```
CÁLCULO BASEADO EM FLUXO DE CAIXA

CÁLCULO DE FLUXO DE CAIXA DESCONTADO

TAXA DE DESCONTO: 20,00%
CRESCIMENTO DA PERPETUIDADE: 3,00%
IPCA PROJETADO: 5,00%

VALOR DOS 5 ANOS
R$ 1.851.777,17

VALOR TOTAL DA EMPRESA
R$ 1.970.134,12

VALOR DE PERPETUIDADE
R$ 2.183.456,78

[carimbo/assinatura]
MAGNUS RELAÇÕES EMPRESARIAIS
14.668.756/0001-53
Economista Afonso Reis Duarte
COFECON 15813
[logos COFECON / CORECON-SP]

NA GRUPO MAGNUS RELAÇÕES EMPRESARIAIS LTDA, PREZAMOS PELA TRANSPARÊNCIA E
AGILIDADE EM NOSSOS SERVIÇOS. É IMPORTANTE SALIENTAR QUE, NO PROCESSO DE
AVALIAÇÃO DA SUA EMPRESA, A RESPONSABILIDADE PELA VERACIDADE DAS
INFORMAÇÕES FORNECIDAS É DE CARÁTER ANALÍTICO DO CLIENTE, SUA COMPREENSÃO E
COLABORAÇÃO PARA GARANTIR A EFICIÊNCIA E PRECISÃO EM NOSSO TRABALHO.

VALUATION EMPRESARIAL
```

### Página 4 — Encerramento

- **Role:** closing / back cover
- **Placeholders:** none
- **Text:**

```
MAGNUS
Relações Empresariais

AGRADECEMOS A SUA PREFERÊNCIA.
```

---

## Notes for AutoDocs HTML template (Contrato Sofisa pattern)

1. **Structure:** `.capa` (p1) + 2× `.pagina` com MDA (p2–p3) + `.pagina` final sem MDA / cor clara (p4), A4 792×1120.
2. **Native text:** recriar tipografia HTML; não usar overlay sobre PNG das páginas do PDF.
3. **Bind:** `inputs.js` com `i-razao-social` → `#razao-social` etc. para os 10 placeholders explícitos; opcionalmente os campos sugeridos da p3/gráfico.
4. **OpenCNPJ:** `{RAZAO-SOCIAL}`, `{CNPJ}`, `{EMAIL-CNPJ}`, `{TELEFONE}`, `{ENDERECO-CNPJ}`, `{CNAE}`, `{CAPITAL-SOCIAL}`, `{DATA-ABERTURA}`, `{PORTE}` alinham bem com autofill OpenCNPJ já usado no projeto.
5. **Gráfico de faturamento:** na Fase 1 pode ser estático SVG/CSS ou 3 campos numéricos; chart dinâmico é Fase 2+.
6. **Fonte da verdade:** páginas renderizadas em `tools/pdf-native/magnus-assets/ocr/page-0N.png` + este outline. O `.fig` é sobretudo asset board (imagens), não texto kiwi utilizável.

## Extraction methodology

| Step | Result |
|---|---|
| `pdf-parse` | 4 páginas, texto vazio (scan) |
| `fig-to-json` via `parse-fig.mjs` | OOM; ESM import corrigido |
| String scan `.fig` ZIP | só meta.json + ruído; placeholders vivem no raster |
| pdf.js render + tesseract.js | texto parcial; `{PLACEHOLDER}` na p2 |
| Vision read das PNGs renderizadas | estrutura completa p1–p4 |

## Artefacts

- `tools/pdf-native/magnus-content-outline.md` (este ficheiro)
- `tools/pdf-native/magnus-texts.json`
- `tools/pdf-native/magnus-fig.json`
- `tools/pdf-native/magnus-assets/ocr/page-0{1-4}.png` / `.txt` / `pdf-ocr.json`
- `tools/pdf-native/magnus-assets/origem.pdf`
- Fixed loader: `tools/figma-package/parse-fig.mjs`
