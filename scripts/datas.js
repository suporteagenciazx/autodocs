document.getElementById('i-data').addEventListener('change', function() {
            // Captura a data do input como string
            const inputData = this.value;
            
            // Separa ano, mês e dia da string
            const [ano, mes, dia] = inputData.split('-');
            
            // Array dos meses por extenso
            const meses = [
                'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
            ];
            
            // Obtém o nome do mês correspondente
            const mesExtenso = meses[parseInt(mes, 10) - 1];
            
            // Atualiza os elementos span
            document.getElementById('dia').textContent = dia.padStart(2, '0');
            document.getElementById('mes').textContent = mesExtenso;
            document.getElementById('ano').textContent = ano;
        });