function copiar() {
  var copiar = document.getElementById("copiar");
  var range = document.createRange();
  range.selectNode(copiar); // Seleciona o elemento com o id "copiar"
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  document.execCommand("copy");
  window.getSelection().removeAllRanges();
  alert("Texto copiado!");
}