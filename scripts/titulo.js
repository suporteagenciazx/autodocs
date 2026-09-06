document.addEventListener('DOMContentLoaded', () => {
    const contrato = document.getElementById('contrato');
    const comprovante = document.getElementById('comprovante');
    const declaracao = document.getElementById('declaracao');
    const garantia = document.getElementById('garantia');
    const termo = document.getElementById('termo');
    const ordem = document.getElementById('ordem');
    const aprovacao = document.getElementById('aprovacao');
    const telaAprovacao = document.getElementById('tela-aprovacao')
    const telaComprovante = document.getElementById('tela-comprovante')
    const magnusLaudo = document.getElementById('magnus-laudo');
    const valuationAguia = document.getElementById('valuation-aguia');
    const orcamentoAguia = document.getElementById('orcamento-aguia');
    const orcamentoMagnus = document.getElementById('orcamento-magnus');
    const laeDvego = document.getElementById('lae-dvego');
    const laeDvegoMagnus = document.getElementById('lae-dvego-magnus');
    const nfeMagnus = document.getElementById('nfe-magnus');
    const nfeAguia = document.getElementById('nfe-aguia');
    const reciboMagnus = document.getElementById('recibo-magnus');
    const reciboAguia = document.getElementById('recibo-aguia');
    const telaAuditoria = document.getElementById('tela-auditoria-fiscal');
    const varreduraExpansao = document.getElementById('varredura-expansao');
    const cceBacen = document.getElementById('cce-bacen');
    const cdlBacen = document.getElementById('cdl-bacen');
    const cceAguia = document.getElementById('cce-aguia');
    const cceMagnus = document.getElementById('cce-magnus');
    const eveAguia = document.getElementById('eve-aguia');
    const eveMagnus = document.getElementById('eve-magnus');
    const aprovacaoDaycoval = document.getElementById('aprovacao-daycoval');
    const contratoDaycoval = document.getElementById('contrato-daycoval');
    const comprovanteDaycoval = document.getElementById('comprovante-daycoval');
    const termoDaycoval = document.getElementById('termo-daycoval');
    const declaracaoDaycoval = document.getElementById('declaracao-daycoval');
    const ordemDaycoval = document.getElementById('ordem-daycoval');
    const garantiaDaycoval = document.getElementById('garantia-daycoval');
    const telaAprovacaoDaycoval = document.getElementById('tela-aprovacao-daycoval');

    if (contrato) {
        document.getElementById('i-razao').addEventListener('input', function() {
            var rs = this.value;
            document.title = "Contrato de CrÃ©dito [Banco Sofisa S.A.] - " + rs;
        });
    } else if (comprovante) {
        document.getElementById('i-cpfcnpj').addEventListener('input', function() {
            var cnpj = this.value;
            document.title = "Comprovante - " + cnpj;
        });
    } else if (declaracao) {
        document.getElementById('i-razao').addEventListener('input', function() {
            var rs = this.value;
            document.title = "DeclaraÃ§Ã£o de QuitaÃ§Ã£o de PendÃªncia [Banco Sofisa S.A. e BACEN] - " + rs;
        });
    } else if (garantia) {
        document.getElementById('i-cliente').addEventListener('input', function() {
            var cliente = this.value;
            document.title = "Garantia de LiberaÃ§Ã£o [Banco Sofisa S.A.] - " + cliente;
        });
    } else if  (termo) {
        document.getElementById('i-razao').addEventListener('input', function() {
            var rs = this.value;
            document.title = "Termo de Responsabilidade [Banco Sofisa S.A.] - " + rs;
        });
    } else if (ordem) {
        document.getElementById('i-razao').addEventListener('input', function() {
            var rs = this.value;
            document.title = "Ordem de Pagamento [Banco Sofisa S.A.] - " + rs;
        });
    } else if (aprovacao) {
        document.getElementById('i-cnpj').addEventListener('input', function() {
            var cnpj = this.value;
            document.title = "Banco Sofisa S.A. - AprovaÃ§Ã£o [" + cnpj + "]";
        });
    } else if (telaAprovacao) {
        var titularInput = document.getElementById('i-titular');
        var syncTitle = function() {
            var nome = titularInput && titularInput.value.trim();
            document.title = nome
                ? "Tela de AprovaÃ§Ã£o Sofisa - " + nome
                : "Tela de AprovaÃ§Ã£o Sofisa";
        };
        if (titularInput) titularInput.addEventListener('input', syncTitle);
        syncTitle();
    } else if (contratoDaycoval) {
        document.getElementById('i-razao').addEventListener('input', function() {
            document.title = 'Contrato de Crédito [Banco Daycoval S.A.] - ' + this.value;
        });
    } else if (comprovanteDaycoval) {
        document.getElementById('i-cpfcnpj').addEventListener('input', function() {
            document.title = 'Comprovante Daycoval - ' + this.value;
        });
    } else if (declaracaoDaycoval) {
        document.getElementById('i-razao').addEventListener('input', function() {
            document.title = 'Declaração de Quitação [Banco Daycoval S.A. e BACEN] - ' + this.value;
        });
    } else if (garantiaDaycoval) {
        document.getElementById('i-cliente').addEventListener('input', function() {
            document.title = 'Garantia de Liberação [Banco Daycoval S.A.] - ' + this.value;
        });
    } else if (termoDaycoval) {
        document.getElementById('i-razao').addEventListener('input', function() {
            document.title = 'Termo de Responsabilidade [Banco Daycoval S.A.] - ' + this.value;
        });
    } else if (ordemDaycoval) {
        document.getElementById('i-razao').addEventListener('input', function() {
            document.title = 'Ordem de Pagamento [Banco Daycoval S.A.] - ' + this.value;
        });
    } else if (aprovacaoDaycoval) {
        document.getElementById('i-cnpj').addEventListener('input', function() {
            document.title = 'Banco Daycoval S.A. - Aprovação [' + this.value + ']';
        });
    } else if (telaAprovacaoDaycoval) {
        var titularDc = document.getElementById('i-titular');
        var syncDc = function() {
            var nome = titularDc && titularDc.value.trim();
            document.title = nome ? 'Tela de Aprovação Daycoval - ' + nome : 'Tela de Aprovação Daycoval';
        };
        if (titularDc) titularDc.addEventListener('input', syncDc);
        syncDc();
    } else if (magnusLaudo) {
        var razaoInput = document.getElementById('i-razao');
        if (razaoInput) {
            razaoInput.addEventListener('input', function() {
                var rs = this.value;
                document.title = rs
                    ? "Magnus Laudo - " + rs
                    : "Magnus Laudo - Valuation Empresarial";
            });
        }
    } else if (valuationAguia) {
        var razaoAguia = document.getElementById('i-razao');
        if (razaoAguia) {
            razaoAguia.addEventListener('input', function() {
                var rs = this.value;
                document.title = rs
                    ? "Valuation Empresarial - " + rs
                    : "Valuation Empresarial - Ãguia Consultoria";
            });
        }
        document.title = "Valuation Empresarial - Ãguia Consultoria";
    } else if (orcamentoAguia) {
        var razaoOrc = document.getElementById('i-razao');
        var syncOrcTitle = function() {
            var rs = razaoOrc && razaoOrc.value.trim();
            document.title = rs
                ? "OrÃ§amento Ãguia - " + rs
                : "OrÃ§amento - Ãguia Consultoria";
        };
        if (razaoOrc) razaoOrc.addEventListener('input', syncOrcTitle);
        syncOrcTitle();
    } else if (orcamentoMagnus) {
        var razaoOrcMag = document.getElementById('i-razao');
        var syncOrcMagTitle = function() {
            var rs = razaoOrcMag && razaoOrcMag.value.trim();
            document.title = rs
                ? 'OrÃ§amento Magnus - ' + rs
                : 'OrÃ§amento - Magnus RelaÃ§Ãµes Empresariais';
        };
        if (razaoOrcMag) razaoOrcMag.addEventListener('input', syncOrcMagTitle);
        syncOrcMagTitle();
    } else if (laeDvego) {
        var razaoLae = document.getElementById('i-razao');
        var syncLaeTitle = function() {
            var rs = razaoLae && razaoLae.value.trim();
            document.title = rs ? 'LAE/DVEGO - ' + rs : 'LAE/DVEGO - Ãguia Consultoria';
        };
        if (razaoLae) razaoLae.addEventListener('input', syncLaeTitle);
        syncLaeTitle();
    } else if (laeDvegoMagnus) {
        var razaoLaeMag = document.getElementById('i-razao');
        var syncLaeMagTitle = function() {
            var rs = razaoLaeMag && razaoLaeMag.value.trim();
            document.title = rs ? 'LAE/DVEGO Magnus - ' + rs : 'LAE/DVEGO - Magnus RelaÃ§Ãµes Empresariais';
        };
        if (razaoLaeMag) razaoLaeMag.addEventListener('input', syncLaeMagTitle);
        syncLaeMagTitle();
    } else if (nfeMagnus) {
        var razaoNfe = document.getElementById('i-razao');
        var syncNfeTitle = function() {
            var rs = razaoNfe && razaoNfe.value.trim();
            document.title = rs ? 'NF-e Magnus - ' + rs : 'NF-e - Magnus RelaÃ§Ãµes Empresariais';
        };
        if (razaoNfe) razaoNfe.addEventListener('input', syncNfeTitle);
        syncNfeTitle();
    } else if (nfeAguia) {
        var razaoNfeAguia = document.getElementById('i-razao');
        var syncNfeAguiaTitle = function() {
            var rs = razaoNfeAguia && razaoNfeAguia.value.trim();
            document.title = rs ? 'NF-e Ãguia - ' + rs : 'NF-e - Ãguia Consultoria';
        };
        if (razaoNfeAguia) razaoNfeAguia.addEventListener('input', syncNfeAguiaTitle);
        syncNfeAguiaTitle();
    } else if (reciboMagnus) {
        var razaoRecMag = document.getElementById('i-razao');
        var syncRecMag = function() {
            var rs = razaoRecMag && razaoRecMag.value.trim();
            document.title = rs ? 'Recibo Magnus - ' + rs : 'Recibo de Pagamento - Magnus';
        };
        if (razaoRecMag) razaoRecMag.addEventListener('input', syncRecMag);
        syncRecMag();
    } else if (reciboAguia) {
        var razaoRecAguia = document.getElementById('i-razao');
        var syncRecAguia = function() {
            var rs = razaoRecAguia && razaoRecAguia.value.trim();
            document.title = rs ? 'Recibo Ãguia - ' + rs : 'Recibo de Pagamento - Ãguia';
        };
        if (razaoRecAguia) razaoRecAguia.addEventListener('input', syncRecAguia);
        syncRecAguia();
    } else if (telaAuditoria) {
        var razaoAf = document.getElementById('i-razao');
        var syncAf = function() {
            var rs = razaoAf && razaoAf.value.trim();
            document.title = rs ? 'Auditoria Fiscal - ' + rs : 'Auditoria Fiscal';
        };
        if (razaoAf) razaoAf.addEventListener('input', syncAf);
        syncAf();
    } else if (varreduraExpansao) {
        var titularVx = document.getElementById('i-titular');
        var syncVx = function() {
            var t = titularVx && titularVx.value.trim();
            document.title = t ? 'Varredura de Expansão - ' + t : 'Varredura de Expansão';
        };
        if (titularVx) titularVx.addEventListener('input', syncVx);
        syncVx();
    } else if (cceBacen) {
        var razaoCce = document.getElementById('i-razao');
        var syncCce = function() {
            var rs = razaoCce && razaoCce.value.trim();
            document.title = rs ? 'CCE BACEN - ' + rs : 'CCE BACEN';
        };
        if (razaoCce) razaoCce.addEventListener('input', syncCce);
        syncCce();
    } else if (cdlBacen) {
        var razaoCdl = document.getElementById('i-razao');
        var syncCdl = function() {
            var rs = razaoCdl && razaoCdl.value.trim();
            document.title = rs ? 'Conciliação Digital de Liquidez - ' + rs : 'Conciliação Digital de Liquidez';
        };
        if (razaoCdl) razaoCdl.addEventListener('input', syncCdl);
        syncCdl();
    } else if (cceAguia) {
        var razaoCceA = document.getElementById('i-razao');
        var syncCceA = function() {
            var rs = razaoCceA && razaoCceA.value.trim();
            document.title = rs ? 'CCE Águia - ' + rs : 'CCE Águia';
        };
        if (razaoCceA) razaoCceA.addEventListener('input', syncCceA);
        syncCceA();
    } else if (cceMagnus) {
        var razaoCceM = document.getElementById('i-razao');
        var syncCceM = function() {
            var rs = razaoCceM && razaoCceM.value.trim();
            document.title = rs ? 'CCE Magnus - ' + rs : 'CCE Magnus';
        };
        if (razaoCceM) razaoCceM.addEventListener('input', syncCceM);
        syncCceM();
    } else if (eveAguia) {
        var razaoEveA = document.getElementById('i-razao');
        var syncEveA = function() {
            var rs = razaoEveA && razaoEveA.value.trim();
            document.title = rs ? 'EVE Águia - ' + rs : 'EVE - Águia Consultoria';
        };
        if (razaoEveA) razaoEveA.addEventListener('input', syncEveA);
        syncEveA();
    } else if (eveMagnus) {
        var razaoEveM = document.getElementById('i-razao');
        var syncEveM = function() {
            var rs = razaoEveM && razaoEveM.value.trim();
            document.title = rs ? 'EVE Magnus - ' + rs : 'EVE - Magnus';
        };
        if (razaoEveM) razaoEveM.addEventListener('input', syncEveM);
        syncEveM();
    }
});