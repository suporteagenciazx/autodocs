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

    if (contrato) {
        document.getElementById('i-razao').addEventListener('input', function() {
            var rs = this.value;
            document.title = "Contrato de Crédito [Banco Sofisa S.A.] - " + rs;
        });
    } else if (comprovante) {
        document.getElementById('i-cpfcnpj').addEventListener('input', function() {
            var cnpj = this.value;
            document.title = "Comprovante - " + cnpj;
        });
    } else if (declaracao) {
        document.getElementById('i-razao').addEventListener('input', function() {
            var rs = this.value;
            document.title = "Declaração de Quitação de Pendência [Banco Sofisa S.A. e BACEN] - " + rs;
        });
    } else if (garantia) {
        document.getElementById('i-cliente').addEventListener('input', function() {
            var cliente = this.value;
            document.title = "Garantia de Liberação [Banco Sofisa S.A.] - " + cliente;
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
            document.title = "Banco Sofisa S.A. - Aprovação [" + cnpj + "]";
        });
    }
});