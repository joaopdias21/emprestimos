import { URL_SERVICO } from './config.js';
import { mostrarAlertaError } from './utils.js';

// resto do código do dashboard.js ...



let tipoSelecionado = 'ativos';

export async function carregarEstatisticas() {
  try {
    const resAtivos = await fetch(`${URL_SERVICO}/emprestimos?status=ativo`);
    const ativos = await resAtivos.json();

    const resQuitados = await fetch(`${URL_SERVICO}/emprestimos/quitados`);
    const quitados = await resQuitados.json();

    const resInadimplentes = await fetch(`${URL_SERVICO}/emprestimos/inadimplentes`);
    const inadimplentes = await resInadimplentes.json();

    document.getElementById('ativosCount').textContent = ativos.length;
    document.getElementById('quitadosCount').textContent = quitados.length;
    document.getElementById('inadimplentesCount').textContent = inadimplentes.length;

    window.ativosData = ativos;
    window.quitadosData = quitados;
    window.inadimplentesData = inadimplentes;

    destacarTipoSelecionado();
  } catch (err) {
    mostrarAlertaError('Erro ao carregar estatísticas do dashboard');
    console.error(err);
  }
}

function destacarTipoSelecionado() {
  ['ativos', 'quitados', 'inadimplentes'].forEach(tipo => {
    const el = document.getElementById(tipo);
    if (el) el.classList.toggle('selected', tipo === tipoSelecionado);
  });
}

['ativos', 'quitados', 'inadimplentes'].forEach(tipo => {
  const el = document.getElementById(tipo);
  if (el) {
    el.addEventListener('click', () => {
      tipoSelecionado = tipo;
      destacarTipoSelecionado();
    });
  }
});

async function carregarDashboard() {
    try {
      const res = await fetch(`${URL_SERVICO}/dashboard/dados`);
      const dados = await res.json();

      document.getElementById('ativosCount').textContent = dados.ativos;
      document.getElementById('quitadosCount').textContent = dados.quitados;
      document.getElementById('inadimplentesCount').textContent = dados.inadimplentes;

      // Gráfico de pizza
      new Chart(document.getElementById('graficoDistribuicao'), {
        type: 'pie',
        data: {
          labels: ['Ativos', 'Quitados', 'Inadimplentes'],
          datasets: [{
            data: [dados.ativos, dados.quitados, dados.inadimplentes],
            backgroundColor: ['#2196f3', '#4caf50', '#f44336']
          }]
        },
        options: {
          plugins: {
            title: { display: true, text: 'Distribuição de Empréstimos' }
          }
        }
      });

      // Gráfico de barras
      const meses = Object.keys(dados.porMes).sort();
      const valores = meses.map(m => dados.porMes[m]);

      new Chart(document.getElementById('graficoEmprestimosMes'), {
        type: 'bar',
        data: {
          labels: meses,
          datasets: [{
            label: 'Total Emprestado (R$)',
            data: valores,
            backgroundColor: '#4caf50'
          }]
        },
        options: {
          plugins: {
            title: { display: true, text: 'Total Emprestado por Mês' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    }
  }

  carregarDashboard();



  document.getElementById('btnExtrairPagamentos').addEventListener('click', async () => {
  const inicio = document.getElementById('dataInicio').value;
  const fim = document.getElementById('dataFim').value;

  if (!inicio || !fim) {
    alert('Informe o intervalo de datas');
    return;
  }

  try {
    const res = await fetch(`${URL_SERVICO}/relatorio/pagamentos?inicio=${inicio}&fim=${fim}`);
    const dados = await res.json();

    const container = document.getElementById('resultadoExtracao');
    container.innerHTML = `<p><strong>Total Pago:</strong> R$ ${dados.totalPago.toFixed(2)}</p>`;

    dados.emprestimos.forEach(e => {
      const div = document.createElement('div');
      div.innerHTML = `
        <h4>Cliente: ${e.nomeCliente}</h4>
        <ul>
          ${e.pagamentos.map(p => `<li>Parcela ${p.parcela} - ${new Date(p.dataPagamento).toLocaleDateString()} - R$ ${p.valor.toFixed(2)}</li>`).join('')}
        </ul>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    alert('Erro ao buscar dados de pagamento');
  }
});
