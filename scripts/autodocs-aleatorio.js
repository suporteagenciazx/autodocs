/*
 * Botão de aleatorização de campos numéricos.
 *
 * Marque o input no formulário e o botão aparece sozinho ao lado do rótulo:
 *
 *   <input class="input" id="i-taxa" value="20,00%" data-aleatorio
 *          data-aleatorio-variacao="0.12" data-aleatorio-min="8" data-aleatorio-max="35">
 *
 *   data-aleatorio-base      valor de partida quando o campo está vazio
 *   data-aleatorio-variacao  amplitude do sorteio, em fração (0.12 = ±12%); padrão 0.1
 *   data-aleatorio-min       piso do número sorteado, na unidade do campo
 *   data-aleatorio-max       teto do número sorteado, na unidade do campo
 *   data-aleatorio-passo     arredondamento final (ex.: 50 sorteia múltiplos de 50)
 *
 * O sorteio copia a forma do valor de partida: prefixo (R$), sufixo (%),
 * casas decimais e separador de milhar são preservados tal como estavam.
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    /* Prefixo lento para o "-" de negativo ficar junto do símbolo de moeda. */
    const NUMERO = /^(\D*?)(\d[\d.,]*)(.*)$/;

    function analisar(bruto) {
        const texto = String(bruto == null ? '' : bruto).trim();
        const partes = texto.match(NUMERO);
        if (!partes) return null;

        const [, prefixo, corpo, sufixo] = partes;
        const virgula = corpo.lastIndexOf(',');
        const inteiro = (virgula >= 0 ? corpo.slice(0, virgula) : corpo).replace(/\./g, '');
        const decimais = virgula >= 0 ? corpo.slice(virgula + 1).replace(/\D/g, '') : '';

        const valor = Number(inteiro + '.' + (decimais || '0'));
        if (!Number.isFinite(valor)) return null;

        return {
            valor: prefixo.includes('-') ? -valor : valor,
            casas: decimais.length,
            agrupado: (virgula >= 0 ? corpo.slice(0, virgula) : corpo).includes('.'),
            prefixo,
            sufixo,
        };
    }

    function formatar(valor, molde) {
        const fixo = Math.abs(valor).toFixed(molde.casas);
        const ponto = fixo.indexOf('.');
        let inteiro = ponto >= 0 ? fixo.slice(0, ponto) : fixo;
        const decimais = ponto >= 0 ? fixo.slice(ponto + 1) : '';

        if (molde.agrupado || inteiro.length > 4) {
            inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }

        return molde.prefixo + inteiro + (decimais ? ',' + decimais : '') + molde.sufixo;
    }

    function numeroDe(input, atributo) {
        const bruto = input.getAttribute(atributo);
        if (bruto == null || bruto === '') return null;
        const n = Number(String(bruto).replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    }

    function sortear(input, ancora) {
        const variacao = numeroDe(input, 'data-aleatorio-variacao') ?? 0.1;
        const min = numeroDe(input, 'data-aleatorio-min');
        const max = numeroDe(input, 'data-aleatorio-max');
        const passo = numeroDe(input, 'data-aleatorio-passo');

        let valor = ancora.valor * (1 + (Math.random() * 2 - 1) * variacao);

        if (passo) valor = Math.round(valor / passo) * passo;
        if (min != null) valor = Math.max(min, valor);
        if (max != null) valor = Math.min(max, valor);

        return valor;
    }

    /*
     * O sorteio pode cair no mesmo texto do valor atual — sobretudo em campos
     * com poucas casas decimais ou muito perto de um limite. Repetir algumas
     * vezes evita a impressão de que o botão não fez nada; quando o intervalo
     * útil é mesmo estreito, aceita-se o resultado repetido.
     */
    function proximoValor(input, ancora, atual) {
        for (let i = 0; i < 12; i++) {
            const texto = formatar(sortear(input, ancora), ancora);
            if (texto !== atual) return texto;
        }
        return formatar(sortear(input, ancora), ancora);
    }

    function moldeDe(input) {
        return analisar(input.value) || analisar(input.getAttribute('data-aleatorio-base'));
    }

    function ligar(input, rotulo) {
        /*
         * Cada sorteio parte da âncora, nunca do resultado do sorteio anterior:
         * encadear sorteios sobre o valor já sorteado é um passeio aleatório e
         * ao fim de meia dúzia de cliques o campo estaria longe do valor de
         * referência. Se o utilizador escrever um valor à mão, é esse que passa
         * a ser a referência.
         */
        let ancora = moldeDe(input);
        let aPreencher = false;

        input.addEventListener('input', () => {
            if (aPreencher) return;
            ancora = moldeDe(input) || ancora;
        });

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'campo-aleatorio';
        botao.title = 'Gerar um valor aproximado ao de referência';
        botao.setAttribute('aria-label', 'Gerar valor aleatório para este campo');
        botao.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">casino</span>';

        botao.addEventListener('click', () => {
            if (!ancora) return;

            aPreencher = true;
            input.value = proximoValor(input, ancora, input.value.trim());
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            aPreencher = false;
        });

        rotulo.insertAdjacentElement('afterend', botao);
    }

    document.querySelectorAll('input[data-aleatorio]').forEach(input => {
        if (!input.id || !moldeDe(input)) return;

        const rotulo = document.querySelector('label[for="' + CSS.escape(input.id) + '"]');
        if (rotulo) ligar(input, rotulo);
    });
});
