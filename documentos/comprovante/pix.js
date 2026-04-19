document.addEventListener("DOMContentLoaded", function () {
    const chkPix = document.getElementById("checkbox-chavepix");
    const h2Ativar = document.getElementById("h2-chavepix");
    const chavePixBox = document.getElementById("chavepix");
    const comprovanteConta = document.getElementById("comprovante-conta");
    const comprovantePix = document.getElementById("comprovante-pix");
    const inputPix = document.getElementById("i-pix");
    const spanPix = document.getElementById("pix");

    function atualizarPixTexto() {
        const valor = inputPix.value.trim();
        spanPix.textContent = valor ? valor : "[CHAVE PIX]";
    }

    function atualizarEstado() {
        if (chkPix.checked) {
            h2Ativar.classList.add("ativo");
            chavePixBox.style.display = "flex";
            comprovantePix.style.display = "flex";
            comprovantePix.classList.add("final");
            comprovanteConta.classList.remove("final");
            atualizarPixTexto();
        } else {
            h2Ativar.classList.remove("ativo");
            chavePixBox.style.display = "none";
            comprovantePix.style.display = "none";
            comprovantePix.classList.remove("final");
            comprovanteConta.classList.add("final");
        }
    }

    inputPix.addEventListener("input", function () {
        if (chkPix.checked) {
            atualizarPixTexto();
        }
    });

    chkPix.addEventListener("change", atualizarEstado);

    chkPix.checked = false;
    atualizarEstado();
});