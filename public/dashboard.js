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
    mostrarAlertaError('Informe o intervalo de datas');
    return;
  }

  try {
    const res = await fetch(`${URL_SERVICO}/relatorio/pagamentos?inicio=${inicio}&fim=${fim}`);
    const dados = await res.json();

const container = document.getElementById('resultadoExtracao');
container.innerHTML = `
  <div class="resumo-total">
    <strong>Total recebido:</strong> R$ ${dados.totalPago.toFixed(2)}
  </div>
  
`;

dados.emprestimos.forEach(e => {
  const div = document.createElement('div');
  div.classList.add('card-cliente');

  div.innerHTML = `
    <h4>Cliente: ${e.nomeCliente}</h4>
    <ul>
      ${e.pagamentos.map(p => `
        <li>
          Parcela <strong>${p.parcela}</strong> • 
          ${new Date(p.dataPagamento).toLocaleDateString()} • 
          <strong>R$ ${p.valor.toFixed(2)}</strong>
        </li>`).join('')}
    </ul>
  `;
  container.appendChild(div);
});


  } catch (err) {
    console.error(err);
    mostrarAlertaError('Erro ao buscar dados de pagamento');
  }
});





document.getElementById('btnExportarPDF').addEventListener('click', async () => {
  const original = document.getElementById('resultadoExtracao');

  if (!original || original.innerHTML.trim() === '') {
    mostrarAlertaError('Nenhum dado para exportar');
    return;
  }

  const dataInicio = document.getElementById('dataInicio').value;
  const dataFim = document.getElementById('dataFim').value;

  if (!dataInicio || !dataFim) {
    mostrarAlertaError('Informe o intervalo de datas para exportar o PDF');
    return;
  }

  // Logo URL (troque para sua logo)
  const logoUrl = 'wbanco.png';

  // Cria container temporário para renderização
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '800px';
  container.style.background = '#fff';
  container.style.color = '#000';
  container.style.padding = '20px';
  container.style.zIndex = 9999;
  container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

  // Cabeçalho fixo com logo e datas
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.marginBottom = '20px';
  header.style.borderBottom = '2px solid #4caf50';
  header.style.paddingBottom = '10px';

  const img = document.createElement('img');
  img.src = logoUrl;
  img.style.height = '40px';
  img.style.marginRight = '15px';
  img.alt = 'Logo';

  const headerText = document.createElement('div');
  headerText.style.fontSize = '16px';
  headerText.style.color = '#222';
  function formatarDataLocalISO(isoDate) {
    const date = new Date(isoDate + 'T00:00:00'); // corrige UTC para local
    return date.toLocaleDateString('pt-BR');
  }

  headerText.innerHTML = `
    <strong>Relatório de Pagamentos</strong><br/>
    Período: ${formatarDataLocalISO(dataInicio)} até ${formatarDataLocalISO(dataFim)}
  `;


  header.appendChild(img);
  header.appendChild(headerText);

  // Clona o conteúdo para manter visualização correta
  const clone = original.cloneNode(true);
  clone.style.background = '#fff';
  clone.style.color = '#000';
  clone.style.width = '100%';

  // Monta container para renderizar o header + conteúdo
  container.appendChild(header);
  container.appendChild(clone);

  document.body.appendChild(container);

  try {
    // Aguarda o render completo
    await new Promise(resolve => setTimeout(resolve, 300));

    // Faz captura com html2canvas
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 1.0);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 0;
    let heightLeft = imgHeight;

    // Se a imagem couber numa página só
    if (imgHeight < pageHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      // Conteúdo longo com paginação
      while (heightLeft > 0) {
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        position -= pageHeight;

        if (heightLeft > 0) {
          pdf.addPage();
        }
      }
    }

    pdf.save(`pagamentos_${dataInicio}_a_${dataFim}.pdf`);
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
  } finally {
    document.body.removeChild(container);
  }
});







