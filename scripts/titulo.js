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
    const trustLaudo = document.getElementById('trust-laudo');
    const cortezLaudo = document.getElementById('cortez-laudo');
    const villelaLaudo = document.getElementById('villela-laudo');
    const valuationAguia = document.getElementById('valuation-aguia');
    const orcamentoAguia = document.getElementById('orcamento-aguia');
    const orcamentoMagnus = document.getElementById('orcamento-magnus');
    const orcamentoTrust = document.getElementById('orcamento-trust');
    const orcamentoCortez = document.getElementById('orcamento-cortez');
    const orcamentoVillela = document.getElementById('orcamento-villela');
    const laeDvego = document.getElementById('lae-dvego');
    const laeDvegoMagnus = document.getElementById('lae-dvego-magnus');
    const laeDvegoTrust = document.getElementById('lae-dvego-trust');
    const laeDvegoCortez = document.getElementById('lae-dvego-cortez');
    const laeDvegoVillela = document.getElementById('lae-dvego-villela');
    const nfeMagnus = document.getElementById('nfe-magnus');
    const nfeTrust = document.getElementById('nfe-trust');
    const nfeCortez = document.getElementById('nfe-cortez');
    const nfeVillela = document.getElementById('nfe-villela');
    const nfeAguia = document.getElementById('nfe-aguia');
    const reciboMagnus = document.getElementById('recibo-magnus');
    const reciboTrust = document.getElementById('recibo-trust');
    const reciboCortez = document.getElementById('recibo-cortez');
    const reciboVillela = document.getElementById('recibo-villela');
    const reciboAguia = document.getElementById('recibo-aguia');
    const telaAuditoria = document.getElementById('tela-auditoria-fiscal');
    const scoreBusiness = document.getElementById('score-business');
    const varreduraExpansao = document.getElementById('varredura-expansao');
    const cceBacen = document.getElementById('cce-bacen');
    const cdlBacen = document.getElementById('cdl-bacen');
    const cceAguia = document.getElementById('cce-aguia');
    const cceMagnus = document.getElementById('cce-magnus');
    const cceTrust = document.getElementById('cce-trust');
    const cceCortez = document.getElementById('cce-cortez');
    const cceVillela = document.getElementById('cce-villela');
    const eveAguia = document.getElementById('eve-aguia');
    const eveMagnus = document.getElementById('eve-magnus');
    const eveTrust = document.getElementById('eve-trust');
    const eveCortez = document.getElementById('eve-cortez');
    const eveVillela = document.getElementById('eve-villela');
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
    } else if (trustLaudo) {
        var razaoTrust = document.getElementById('i-razao');
        if (razaoTrust) {
            razaoTrust.addEventListener('input', function() {
                var rs = this.value;
                document.title = rs
                    ? 'Trust Laudo - ' + rs
                    : 'Trust Laudo - Valuation Empresarial';
            });
        }
    } else if (cortezLaudo) {
        var razaoCortez = document.getElementById('i-razao');
        if (razaoCortez) {
            razaoCortez.addEventListener('input', function() {
                var rs = this.value;
                document.title = rs
                    ? 'Cortez Laudo - ' + rs
                    : 'Cortez Laudo - Valuation Empresarial';
            });
        }
    } else if (villelaLaudo) {
        var razaoVillela = document.getElementById('i-razao');
        if (razaoVillela) {
            razaoVillela.addEventListener('input', function() {
                var rs = this.value;
                document.title = rs
                    ? 'Villela Laudo - ' + rs
                    : 'Villela Laudo - Valuation Empresarial';
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
    } else if (orcamentoTrust) {
        var razaoOrcTru = document.getElementById('i-razao');
        var syncOrcTruTitle = function() {
            var rs = razaoOrcTru && razaoOrcTru.value.trim();
            document.title = rs
                ? 'Orçamento Trust - ' + rs
                : 'Orçamento - Trust Assessoria Empresarial';
        };
        if (razaoOrcTru) razaoOrcTru.addEventListener('input', syncOrcTruTitle);
        syncOrcTruTitle();
    } else if (orcamentoCortez) {
        var razaoOrcCor = document.getElementById('i-razao');
        var syncOrcCorTitle = function() {
            var rs = razaoOrcCor && razaoOrcCor.value.trim();
            document.title = rs
                ? 'Orçamento Cortez - ' + rs
                : 'Orçamento - Cortez Consultoria Empresarial';
        };
        if (razaoOrcCor) razaoOrcCor.addEventListener('input', syncOrcCorTitle);
        syncOrcCorTitle();
    } else if (orcamentoVillela) {
        var razaoOrcVil = document.getElementById('i-razao');
        var syncOrcVilTitle = function() {
            var rs = razaoOrcVil && razaoOrcVil.value.trim();
            document.title = rs
                ? 'Orçamento Villela - ' + rs
                : 'Orçamento - Villela Assessoria Empresarial';
        };
        if (razaoOrcVil) razaoOrcVil.addEventListener('input', syncOrcVilTitle);
        syncOrcVilTitle();
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
    } else if (laeDvegoTrust) {
        var razaoLaeTru = document.getElementById('i-razao');
        var syncLaeTruTitle = function() {
            var rs = razaoLaeTru && razaoLaeTru.value.trim();
            document.title = rs ? 'LAE/DVEGO Trust - ' + rs : 'LAE/DVEGO - Trust Assessoria Empresarial';
        };
        if (razaoLaeTru) razaoLaeTru.addEventListener('input', syncLaeTruTitle);
        syncLaeTruTitle();
    } else if (laeDvegoCortez) {
        var razaoLaeCor = document.getElementById('i-razao');
        var syncLaeCorTitle = function() {
            var rs = razaoLaeCor && razaoLaeCor.value.trim();
            document.title = rs ? 'LAE/DVEGO Cortez - ' + rs : 'LAE/DVEGO - Cortez Consultoria Empresarial';
        };
        if (razaoLaeCor) razaoLaeCor.addEventListener('input', syncLaeCorTitle);
        syncLaeCorTitle();
    } else if (laeDvegoVillela) {
        var razaoLaeVil = document.getElementById('i-razao');
        var syncLaeVilTitle = function() {
            var rs = razaoLaeVil && razaoLaeVil.value.trim();
            document.title = rs ? 'LAE/DVEGO Villela - ' + rs : 'LAE/DVEGO - Villela Assessoria Empresarial';
        };
        if (razaoLaeVil) razaoLaeVil.addEventListener('input', syncLaeVilTitle);
        syncLaeVilTitle();
    } else if (nfeMagnus) {
        var razaoNfe = document.getElementById('i-razao');
        var syncNfeTitle = function() {
            var rs = razaoNfe && razaoNfe.value.trim();
            document.title = rs ? 'NF-e Magnus - ' + rs : 'NF-e - Magnus RelaÃ§Ãµes Empresariais';
        };
        if (razaoNfe) razaoNfe.addEventListener('input', syncNfeTitle);
        syncNfeTitle();
    } else if (nfeTrust) {
        var razaoNfeTru = document.getElementById('i-razao');
        var syncNfeTruTitle = function() {
            var rs = razaoNfeTru && razaoNfeTru.value.trim();
            document.title = rs ? 'NF-e Trust - ' + rs : 'NF-e - Trust Assessoria Empresarial';
        };
        if (razaoNfeTru) razaoNfeTru.addEventListener('input', syncNfeTruTitle);
        syncNfeTruTitle();
    } else if (nfeCortez) {
        var razaoNfeCor = document.getElementById('i-razao');
        var syncNfeCorTitle = function() {
            var rs = razaoNfeCor && razaoNfeCor.value.trim();
            document.title = rs ? 'NF-e Cortez - ' + rs : 'NF-e - Cortez Consultoria Empresarial';
        };
        if (razaoNfeCor) razaoNfeCor.addEventListener('input', syncNfeCorTitle);
        syncNfeCorTitle();
    } else if (nfeVillela) {
        var razaoNfeVil = document.getElementById('i-razao');
        var syncNfeVilTitle = function() {
            var rs = razaoNfeVil && razaoNfeVil.value.trim();
            document.title = rs ? 'NF-e Villela - ' + rs : 'NF-e - Villela Assessoria Empresarial';
        };
        if (razaoNfeVil) razaoNfeVil.addEventListener('input', syncNfeVilTitle);
        syncNfeVilTitle();
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
    } else if (reciboTrust) {
        var razaoRecTru = document.getElementById('i-razao');
        var syncRecTru = function() {
            var rs = razaoRecTru && razaoRecTru.value.trim();
            document.title = rs ? 'Recibo Trust - ' + rs : 'Recibo de Pagamento - Trust';
        };
        if (razaoRecTru) razaoRecTru.addEventListener('input', syncRecTru);
        syncRecTru();
    } else if (reciboCortez) {
        var razaoRecCor = document.getElementById('i-razao');
        var syncRecCor = function() {
            var rs = razaoRecCor && razaoRecCor.value.trim();
            document.title = rs ? 'Recibo Cortez - ' + rs : 'Recibo de Pagamento - Cortez';
        };
        if (razaoRecCor) razaoRecCor.addEventListener('input', syncRecCor);
        syncRecCor();
    } else if (reciboVillela) {
        var razaoRecVil = document.getElementById('i-razao');
        var syncRecVil = function() {
            var rs = razaoRecVil && razaoRecVil.value.trim();
            document.title = rs ? 'Recibo Villela - ' + rs : 'Recibo de Pagamento - Villela';
        };
        if (razaoRecVil) razaoRecVil.addEventListener('input', syncRecVil);
        syncRecVil();
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
    } else if (scoreBusiness) {
        var razaoSb = document.getElementById('i-razao');
        var syncSb = function() {
            var rs = razaoSb && razaoSb.value.trim();
            document.title = rs ? 'Score Business - ' + rs : 'Score Business';
        };
        if (razaoSb) razaoSb.addEventListener('input', syncSb);
        syncSb();
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
            document.title = rs ? 'CDL - ' + rs : 'CDL';
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
    } else if (cceTrust) {
        var razaoCceT = document.getElementById('i-razao');
        var syncCceT = function() {
            var rs = razaoCceT && razaoCceT.value.trim();
            document.title = rs ? 'CCE Trust - ' + rs : 'CCE Trust';
        };
        if (razaoCceT) razaoCceT.addEventListener('input', syncCceT);
        syncCceT();
    } else if (cceCortez) {
        var razaoCceC = document.getElementById('i-razao');
        var syncCceC = function() {
            var rs = razaoCceC && razaoCceC.value.trim();
            document.title = rs ? 'CCE Cortez - ' + rs : 'CCE Cortez';
        };
        if (razaoCceC) razaoCceC.addEventListener('input', syncCceC);
        syncCceC();
    } else if (cceVillela) {
        var razaoCceV = document.getElementById('i-razao');
        var syncCceV = function() {
            var rs = razaoCceV && razaoCceV.value.trim();
            document.title = rs ? 'CCE Villela - ' + rs : 'CCE Villela';
        };
        if (razaoCceV) razaoCceV.addEventListener('input', syncCceV);
        syncCceV();
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
    } else if (eveTrust) {
        var razaoEveT = document.getElementById('i-razao');
        var syncEveT = function() {
            var rs = razaoEveT && razaoEveT.value.trim();
            document.title = rs ? 'EVE Trust - ' + rs : 'EVE - Trust Assessoria Empresarial';
        };
        if (razaoEveT) razaoEveT.addEventListener('input', syncEveT);
        syncEveT();
    } else if (eveCortez) {
        var razaoEveC = document.getElementById('i-razao');
        var syncEveC = function() {
            var rs = razaoEveC && razaoEveC.value.trim();
            document.title = rs ? 'EVE Cortez - ' + rs : 'EVE - Cortez Consultoria Empresarial';
        };
        if (razaoEveC) razaoEveC.addEventListener('input', syncEveC);
        syncEveC();
    } else if (eveVillela) {
        var razaoEveV = document.getElementById('i-razao');
        var syncEveV = function() {
            var rs = razaoEveV && razaoEveV.value.trim();
            document.title = rs ? 'EVE Villela - ' + rs : 'EVE - Villela Assessoria Empresarial';
        };
        if (razaoEveV) razaoEveV.addEventListener('input', syncEveV);
        syncEveV();
    }
});