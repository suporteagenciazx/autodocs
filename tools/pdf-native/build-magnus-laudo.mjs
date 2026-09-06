import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('c:/xampp/htdocs/AutoDocsv7-docker');
const dir = path.join(root, 'documentos/magnus-laudo');
fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });

const css = `/* Magnus Laudo — estilos do documento */
#magnus-laudo #documento .capa {
  width: 792px;
  height: 1121px;
  background-image: url(./assets/capa.png);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

#magnus-laudo #documento .pagina.magnus-mda {
  width: 792px;
  height: 1120px;
  background-image: url(./assets/mda.png);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

#magnus-laudo #documento .pagina.magnus-final {
  width: 792px;
  height: 1120px;
  background-image: none;
  background-color: #ffffff;
}

#magnus-laudo .magnus-conteudo {
  padding: 150px 72px 100px 72px;
  box-sizing: border-box;
  height: 100%;
  font-family: 'Inter', sans-serif;
  color: #1a1a1a;
}

#magnus-laudo .magnus-kicker {
  margin: 0 0 18px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #1b4d3e;
}

#magnus-laudo .magnus-empresa-nome {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.15;
  color: #111;
}

#magnus-laudo .magnus-empresa-cnpj {
  margin: 0 0 28px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

#magnus-laudo .magnus-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px 28px;
  margin-bottom: 28px;
}

#magnus-laudo .magnus-bloco h3 {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1b4d3e;
}

#magnus-laudo .magnus-bloco p,
#magnus-laudo .magnus-linha {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 1.45;
  color: #222;
}

#magnus-laudo .magnus-label {
  font-weight: 600;
  color: #666;
  margin-right: 4px;
}

#magnus-laudo .magnus-metricas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 28px;
  margin: 8px 0 28px;
}

#magnus-laudo .magnus-metrica {
  padding: 14px 16px;
  border: 1px solid #e6ebe8;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
}

#magnus-laudo .magnus-metrica .magnus-metrica-label {
  display: block;
  margin-bottom: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1b4d3e;
}

#magnus-laudo .magnus-metrica .magnus-metrica-valor {
  font-size: 18px;
  font-weight: 700;
  color: #111;
}

#magnus-laudo .magnus-chart {
  margin-top: 8px;
  padding: 16px 18px 14px;
  border: 1px solid #e6ebe8;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
}

#magnus-laudo .magnus-chart-title {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1b4d3e;
}

#magnus-laudo .magnus-chart-bars {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: end;
  min-height: 140px;
}

#magnus-laudo .magnus-bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

#magnus-laudo .magnus-bar {
  width: 100%;
  max-width: 64px;
  border-radius: 8px 8px 4px 4px;
  background: linear-gradient(180deg, #2f6b54 0%, #1b4d3e 100%);
  min-height: 24px;
}

#magnus-laudo .magnus-bar-value {
  font-size: 11px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

#magnus-laudo .magnus-bar-label {
  font-size: 11px;
  font-weight: 700;
  color: #1b4d3e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

#magnus-laudo .magnus-premissas {
  display: grid;
  gap: 8px;
  margin: 0 0 24px;
}

#magnus-laudo .magnus-premissa {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid #e6ebe8;
  font-size: 13px;
}

#magnus-laudo .magnus-valores {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

#magnus-laudo .magnus-valor-card {
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid #dfe8e3;
}

#magnus-laudo .magnus-valor-card.is-destaque {
  border-color: #1b4d3e;
  background: color-mix(in srgb, #1b4d3e 8%, white);
}

#magnus-laudo .magnus-valor-card .lbl {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1b4d3e;
}

#magnus-laudo .magnus-valor-card .val {
  font-size: 26px;
  font-weight: 700;
  color: #111;
}

#magnus-laudo .magnus-assinatura {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid #dde5e0;
}

#magnus-laudo .magnus-assinatura .org {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: #1b4d3e;
}

#magnus-laudo .magnus-assinatura .meta {
  margin: 0;
  font-size: 12px;
  color: #555;
}

#magnus-laudo .magnus-disclaimer {
  margin-top: 22px;
  font-size: 11px;
  line-height: 1.5;
  color: #666;
  text-align: justify;
}

#magnus-laudo .magnus-final-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 48px;
  box-sizing: border-box;
}

#magnus-laudo .magnus-final-brand {
  margin: 0 0 8px;
  font-size: 42px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #1b4d3e;
}

#magnus-laudo .magnus-final-sub {
  margin: 0 0 48px;
  font-size: 14px;
  font-weight: 500;
  color: #8a7350;
}

#magnus-laudo .magnus-final-msg {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #222;
}
`;

const inputsJs = `document.addEventListener('DOMContentLoaded', () => {
    const configurations = [
        { inputId: 'i-cnpj', targetId: 'cnpj', originalText: '{CNPJ}' },
        { inputId: 'i-razao', targetId: 'razao-social', originalText: '{RAZAO-SOCIAL}' },
        { inputId: 'i-email-cnpj', targetId: 'email-cnpj', originalText: '{EMAIL-CNPJ}' },
        { inputId: 'i-telefone', targetId: 'telefone', originalText: '{TELEFONE}' },
        { inputId: 'i-endereco-cnpj', targetId: 'endereco-cnpj', originalText: '{ENDERECO-CNPJ}' },
        { inputId: 'i-cnae', targetId: 'cnae', originalText: '{CNAE}' },
        { inputId: 'i-funcionarios', targetId: 'funcionarios', originalText: '{FUNCIONARIOS}' },
        { inputId: 'i-capital-social', targetId: 'capital-social', originalText: '{CAPITAL-SOCIAL}' },
        { inputId: 'i-abertura', targetId: 'data-abertura', originalText: '{DATA-ABERTURA}' },
        { inputId: 'i-porte', targetId: 'porte', originalText: '{PORTE}' },
        { inputId: 'i-fat-label-1', targetId: 'fat-label-1', originalText: '{FATURAMENTO-LABEL-1}' },
        { inputId: 'i-fat-label-2', targetId: 'fat-label-2', originalText: '{FATURAMENTO-LABEL-2}' },
        { inputId: 'i-fat-label-3', targetId: 'fat-label-3', originalText: '{FATURAMENTO-LABEL-3}' },
        { inputId: 'i-fat-mes-1', targetId: 'fat-mes-1', originalText: '{FATURAMENTO-MES-1}' },
        { inputId: 'i-fat-mes-2', targetId: 'fat-mes-2', originalText: '{FATURAMENTO-MES-2}' },
        { inputId: 'i-fat-mes-3', targetId: 'fat-mes-3', originalText: '{FATURAMENTO-MES-3}' },
        { inputId: 'i-taxa-desconto', targetId: 'taxa-desconto', originalText: '{TAXA-DESCONTO}' },
        { inputId: 'i-crescimento-perpetuidade', targetId: 'crescimento-perpetuidade', originalText: '{CRESCIMENTO-PERPETUIDADE}' },
        { inputId: 'i-ipca-projetado', targetId: 'ipca-projetado', originalText: '{IPCA-PROJETADO}' },
        { inputId: 'i-valor-5-anos', targetId: 'valor-5-anos', originalText: '{VALOR-5-ANOS}' },
        { inputId: 'i-valor-total-empresa', targetId: 'valor-total-empresa', originalText: '{VALOR-TOTAL-EMPRESA}' },
        { inputId: 'i-valor-perpetuidade', targetId: 'valor-perpetuidade', originalText: '{VALOR-PERPETUIDADE}' },
        { inputId: 'i-economista-nome', targetId: 'economista-nome', originalText: '{ECONOMISTA-NOME}' },
        { inputId: 'i-economista-cofecon', targetId: 'economista-cofecon', originalText: '{ECONOMISTA-COFECON}' },
        { inputId: 'i-magnus-cnpj', targetId: 'magnus-cnpj', originalText: '{MAGNUS-CNPJ}' },
    ];

    function syncChartBars() {
        const vals = [1, 2, 3].map(i => {
            const el = document.getElementById('i-fat-mes-' + i);
            const raw = el ? String(el.value || '').replace(/[^\\d,.-]/g, '').replace(/\\./g, '').replace(',', '.') : '';
            const n = parseFloat(raw);
            return Number.isFinite(n) ? n : 0;
        });
        const max = Math.max(...vals, 1);
        vals.forEach((n, idx) => {
            const bar = document.getElementById('fat-bar-' + (idx + 1));
            if (!bar) return;
            const pct = Math.max(8, Math.round((n / max) * 100));
            bar.style.height = pct + '%';
        });
    }

    configurations.forEach(config => {
        const inputElement = document.getElementById(config.inputId);
        const targetElements = document.querySelectorAll('[id="' + config.targetId + '"]');
        if (!inputElement || !targetElements.length) return;

        const paint = () => {
            const value = inputElement.value.trim() === '' ? config.originalText : inputElement.value;
            targetElements.forEach(targetElement => {
                targetElement.textContent = value;
            });
            if (config.inputId.indexOf('i-fat-mes-') === 0) syncChartBars();
        };

        paint();
        inputElement.addEventListener('input', paint);
        inputElement.addEventListener('change', paint);
    });

    syncChartBars();
});
`;

const html = `<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Magnus Laudo | AutoDocs</title>
    <link rel="icon" href="../../sistema/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="../../estilos/fontes/inter.css">
    <link rel="stylesheet" href="../../estilos/sistema.css">
    <link rel="stylesheet" href="../../estilos/exportar.css">
    <link rel="stylesheet" href="../../estilos/documentos.css">
    <link rel="stylesheet" href="./magnus.css">
    <link rel="stylesheet" href="../../estilos/icones.css">
    <script src="../../scripts/autodocs-page-transition-boot.js"></script>
</head>

<body id="magnus-laudo">
    <div class="conteudo" id="conteudo">
        <header id="pagina">
            <span id="sistema-banco" class="banco-razaosocial"></span>
            <span id="sistema-cnpj" class="banco-cnpj"></span>
        </header>
        <div class="sistema-pagina">
            <h1>Magnus Laudo</h1>
            <div class="formularios">
                <div class="area-boxes">
                    <div class="base-box">
                        <h2>Empresa avaliada</h2>
                        <div class="base-boxcampos">
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-cnpj">CNPJ</label>
                                    <span class="material-symbols-rounded" title="Utilize somente números; a integração OpenCNPJ preenche automaticamente quando ativa.">info</span>
                                </div>
                                <input class="input" id="i-cnpj" placeholder="{CNPJ}" type="text">
                            </div>
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-razao">Razão Social</label>
                                </div>
                                <input class="input" id="i-razao" placeholder="{RAZAO-SOCIAL}" type="text">
                            </div>
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-cnae">CNAE / Atividades</label>
                                </div>
                                <input class="input" id="i-cnae" placeholder="{CNAE}" type="text">
                            </div>
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-funcionarios">Funcionários</label>
                                </div>
                                <input class="input" id="i-funcionarios" placeholder="{FUNCIONARIOS}" type="text">
                            </div>
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-capital-social">Capital Social</label>
                                </div>
                                <input class="input" id="i-capital-social" placeholder="{CAPITAL-SOCIAL}" type="text">
                            </div>
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-abertura">Data de Abertura</label>
                                </div>
                                <input class="input" id="i-abertura" placeholder="{DATA-ABERTURA}" type="date">
                            </div>
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-porte">Porte</label>
                                </div>
                                <input class="input" id="i-porte" placeholder="{PORTE}" type="text">
                            </div>
                        </div>
                    </div>

                    <div class="base-box">
                        <h2>Contatos e endereço</h2>
                        <div class="base-boxcampos">
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-email-cnpj">E-mail</label>
                                </div>
                                <input class="input" id="i-email-cnpj" placeholder="{EMAIL-CNPJ}" type="email">
                            </div>
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-telefone">Telefone(s)</label>
                                </div>
                                <input class="input" id="i-telefone" placeholder="{TELEFONE}" type="text">
                            </div>
                            <div class="campo">
                                <div class="label">
                                    <label class="label-campo" for="i-endereco-cnpj">Endereço / Local</label>
                                </div>
                                <input class="input" id="i-endereco-cnpj" placeholder="{ENDERECO-CNPJ}" type="text">
                            </div>
                        </div>
                    </div>

                    <div class="base-box">
                        <h2>Faturamento (3 meses)</h2>
                        <div class="base-boxcampos">
                            <div class="campo">
                                <label class="label-campo" for="i-fat-label-1">Mês 1 (rótulo)</label>
                                <input class="input" id="i-fat-label-1" placeholder="{FATURAMENTO-LABEL-1}" value="Maio" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-fat-mes-1">Mês 1 (valor)</label>
                                <input class="input" id="i-fat-mes-1" placeholder="{FATURAMENTO-MES-1}" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-fat-label-2">Mês 2 (rótulo)</label>
                                <input class="input" id="i-fat-label-2" placeholder="{FATURAMENTO-LABEL-2}" value="Junho" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-fat-mes-2">Mês 2 (valor)</label>
                                <input class="input" id="i-fat-mes-2" placeholder="{FATURAMENTO-MES-2}" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-fat-label-3">Mês 3 (rótulo)</label>
                                <input class="input" id="i-fat-label-3" placeholder="{FATURAMENTO-LABEL-3}" value="Julho" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-fat-mes-3">Mês 3 (valor)</label>
                                <input class="input" id="i-fat-mes-3" placeholder="{FATURAMENTO-MES-3}" type="text">
                            </div>
                        </div>
                    </div>

                    <div class="base-box">
                        <h2>Premissas e valuation</h2>
                        <div class="base-boxcampos">
                            <div class="campo">
                                <label class="label-campo" for="i-taxa-desconto">Taxa de desconto</label>
                                <input class="input" id="i-taxa-desconto" placeholder="{TAXA-DESCONTO}" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-crescimento-perpetuidade">Crescimento da perpetuidade</label>
                                <input class="input" id="i-crescimento-perpetuidade" placeholder="{CRESCIMENTO-PERPETUIDADE}" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-ipca-projetado">IPCA projetado</label>
                                <input class="input" id="i-ipca-projetado" placeholder="{IPCA-PROJETADO}" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-valor-5-anos">Valor dos 5 anos</label>
                                <input class="input" id="i-valor-5-anos" placeholder="{VALOR-5-ANOS}" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-valor-total-empresa">Valor total da empresa</label>
                                <input class="input" id="i-valor-total-empresa" placeholder="{VALOR-TOTAL-EMPRESA}" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-valor-perpetuidade">Valor de perpetuidade</label>
                                <input class="input" id="i-valor-perpetuidade" placeholder="{VALOR-PERPETUIDADE}" type="text">
                            </div>
                        </div>
                    </div>

                    <div class="base-box">
                        <h2>Responsável técnico</h2>
                        <div class="base-boxcampos">
                            <div class="campo">
                                <label class="label-campo" for="i-economista-nome">Economista</label>
                                <input class="input" id="i-economista-nome" placeholder="{ECONOMISTA-NOME}" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-economista-cofecon">COFECON</label>
                                <input class="input" id="i-economista-cofecon" placeholder="{ECONOMISTA-COFECON}" type="text">
                            </div>
                            <div class="campo">
                                <label class="label-campo" for="i-magnus-cnpj">CNPJ Magnus</label>
                                <input class="input" id="i-magnus-cnpj" placeholder="{MAGNUS-CNPJ}" value="14.668.756/0001-53" type="text">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="menu-inferior">
                    <div class="confirmacao">
                        <label for="confirmacao" class="label-confirmacao">
                            Todos os campos foram preenchidos?<input type="checkbox" id="confirmacao">
                        </label>
                    </div>
                    <button type="button" id="exportar">
                        <span class="material-symbols-rounded">download</span>
                        Exportar
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div id="documento">
        <div class="capa" aria-label="Capa Magnus Valuation"></div>

        <div class="pagina magnus-mda">
            <div class="magnus-conteudo">
                <p class="magnus-kicker">Resumo da empresa</p>
                <h2 class="magnus-empresa-nome"><span id="razao-social">{RAZAO-SOCIAL}</span></h2>
                <p class="magnus-empresa-cnpj"><span id="cnpj">{CNPJ}</span></p>

                <div class="magnus-grid-2">
                    <div class="magnus-bloco">
                        <h3>Contatos</h3>
                        <p><span class="magnus-label">E-mail:</span> <span id="email-cnpj">{EMAIL-CNPJ}</span></p>
                        <p><span class="magnus-label">Telefone(s):</span> <span id="telefone">{TELEFONE}</span></p>
                    </div>
                    <div class="magnus-bloco">
                        <h3>Endereço / Local</h3>
                        <p><span id="endereco-cnpj">{ENDERECO-CNPJ}</span></p>
                    </div>
                </div>

                <div class="magnus-bloco" style="margin-bottom: 22px;">
                    <h3>Atividades — CNAEs</h3>
                    <p><span id="cnae">{CNAE}</span></p>
                </div>

                <div class="magnus-metricas">
                    <div class="magnus-metrica">
                        <span class="magnus-metrica-label">Funcionários</span>
                        <span class="magnus-metrica-valor" id="funcionarios">{FUNCIONARIOS}</span>
                    </div>
                    <div class="magnus-metrica">
                        <span class="magnus-metrica-label">Capital Social</span>
                        <span class="magnus-metrica-valor" id="capital-social">{CAPITAL-SOCIAL}</span>
                    </div>
                    <div class="magnus-metrica">
                        <span class="magnus-metrica-label">Data de Abertura</span>
                        <span class="magnus-metrica-valor" id="data-abertura">{DATA-ABERTURA}</span>
                    </div>
                    <div class="magnus-metrica">
                        <span class="magnus-metrica-label">Porte</span>
                        <span class="magnus-metrica-valor" id="porte">{PORTE}</span>
                    </div>
                </div>

                <div class="magnus-chart">
                    <p class="magnus-chart-title">Faturamento dos últimos 3 (três) meses</p>
                    <div class="magnus-chart-bars">
                        <div class="magnus-bar-col">
                            <span class="magnus-bar-value" id="fat-mes-1">{FATURAMENTO-MES-1}</span>
                            <div class="magnus-bar" id="fat-bar-1" style="height: 40%;"></div>
                            <span class="magnus-bar-label" id="fat-label-1">{FATURAMENTO-LABEL-1}</span>
                        </div>
                        <div class="magnus-bar-col">
                            <span class="magnus-bar-value" id="fat-mes-2">{FATURAMENTO-MES-2}</span>
                            <div class="magnus-bar" id="fat-bar-2" style="height: 65%;"></div>
                            <span class="magnus-bar-label" id="fat-label-2">{FATURAMENTO-LABEL-2}</span>
                        </div>
                        <div class="magnus-bar-col">
                            <span class="magnus-bar-value" id="fat-mes-3">{FATURAMENTO-MES-3}</span>
                            <div class="magnus-bar" id="fat-bar-3" style="height: 85%;"></div>
                            <span class="magnus-bar-label" id="fat-label-3">{FATURAMENTO-LABEL-3}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="pagina magnus-mda">
            <div class="magnus-conteudo">
                <p class="magnus-kicker">Cálculo baseado em fluxo de caixa</p>
                <h2 class="magnus-empresa-nome" style="font-size:22px;margin-bottom:22px;">Cálculo de fluxo de caixa descontado</h2>

                <div class="magnus-premissas">
                    <div class="magnus-premissa">
                        <span>Taxa de desconto</span>
                        <strong id="taxa-desconto">{TAXA-DESCONTO}</strong>
                    </div>
                    <div class="magnus-premissa">
                        <span>Crescimento da perpetuidade</span>
                        <strong id="crescimento-perpetuidade">{CRESCIMENTO-PERPETUIDADE}</strong>
                    </div>
                    <div class="magnus-premissa">
                        <span>IPCA projetado</span>
                        <strong id="ipca-projetado">{IPCA-PROJETADO}</strong>
                    </div>
                </div>

                <div class="magnus-valores">
                    <div class="magnus-valor-card">
                        <span class="lbl">Valor dos 5 anos</span>
                        <span class="val" id="valor-5-anos">{VALOR-5-ANOS}</span>
                    </div>
                    <div class="magnus-valor-card is-destaque">
                        <span class="lbl">Valor total da empresa</span>
                        <span class="val" id="valor-total-empresa">{VALOR-TOTAL-EMPRESA}</span>
                    </div>
                    <div class="magnus-valor-card">
                        <span class="lbl">Valor de perpetuidade</span>
                        <span class="val" id="valor-perpetuidade">{VALOR-PERPETUIDADE}</span>
                    </div>
                </div>

                <div class="magnus-assinatura">
                    <p class="org">MAGNUS Relações Empresariais</p>
                    <p class="meta">CNPJ: <span id="magnus-cnpj">{MAGNUS-CNPJ}</span></p>
                    <p class="meta"><span id="economista-nome">{ECONOMISTA-NOME}</span></p>
                    <p class="meta">COFECON <span id="economista-cofecon">{ECONOMISTA-COFECON}</span></p>
                </div>

                <p class="magnus-disclaimer">
                    Na Grupo Magnus Relações Empresariais Ltda, prezamos pela transparência e agilidade em nossos serviços.
                    É importante salientar que, no processo de avaliação da sua empresa, a responsabilidade pela veracidade das
                    informações fornecidas é de caráter analítico do cliente, sua compreensão e colaboração para garantir a
                    eficiência e precisão em nosso trabalho.
                </p>
            </div>
        </div>

        <div class="pagina magnus-final">
            <div class="magnus-final-wrap">
                <p class="magnus-final-brand">MAGNUS</p>
                <p class="magnus-final-sub">Relações Empresariais</p>
                <p class="magnus-final-msg">Agradecemos a sua preferência.</p>
            </div>
        </div>
    </div>

    <script src="../../scripts/navdrawer.js"></script>
    <script src="../../scripts/banco.js"></script>
    <script src="../../scripts/cnpj.js"></script>
    <script src="../../scripts/autodocs-toast.js"></script>
    <script src="../../scripts/opencnpj-autofill.js?v=3"></script>
    <script src="./inputs.js"></script>
    <script src="../../scripts/titulo.js"></script>
    <script src="../../scripts/exportar.js?v=3"></script>
    <script src="../../scripts/impressao.js?v=3"></script>
</body>

</html>
`;

fs.writeFileSync(path.join(dir, 'magnus.css'), css, 'utf8');
fs.writeFileSync(path.join(dir, 'inputs.js'), inputsJs, 'utf8');
fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
console.log('wrote magnus-laudo native files');
