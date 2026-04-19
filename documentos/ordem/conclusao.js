document.addEventListener('DOMContentLoaded', () => {
    const checkbox = document.getElementById('checkbox-conclusao');
    const h2Conclusao = document.getElementById('h2-conclusao');
    const boxConclusao = document.getElementById('box-conclusao');
    const inputConclusao = document.getElementById('i-conclusao');
    const spanConclusao = document.getElementById('conclusao');

    // Estado padrão: não checked
    h2Conclusao.classList.remove('ativo');
    boxConclusao.style.display = 'none';
    spanConclusao.style.display = 'none';

    // Função para atualizar visuais e texto
    function atualizarConclusao() {
        if (checkbox.checked) {
            h2Conclusao.classList.add('ativo');
            boxConclusao.style.display = 'flex';
            spanConclusao.style.display = 'inline'; // ou block se preferir
            spanConclusao.textContent = inputConclusao.value;
        } else {
            h2Conclusao.classList.remove('ativo');
            boxConclusao.style.display = 'none';
            spanConclusao.style.display = 'none';
        }
    }

    // Escuta alterações do checkbox
    checkbox.addEventListener('change', atualizarConclusao);

    // Escuta digitação no input para atualizar o span em tempo real
    inputConclusao.addEventListener('input', () => {
        if (checkbox.checked) {
            spanConclusao.textContent = inputConclusao.value;
        }
    });
});
