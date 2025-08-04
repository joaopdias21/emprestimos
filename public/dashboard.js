import { URL_SERVICO } from './config.js';
import { mostrarAlertaError } from './utils.js';

let tipoSelecionado = 'ativos';
let graficoEmprestimos;
let graficoJuros;
let graficoVencimentos;

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

// --- FUNÇÃO PARA CARREGAR OS GRÁFICOS E DADOS DETALHADOS POR MÊS ---
async function carregarDashboard(mesSelecionado = null) {
  try {
    let url = `${URL_SERVICO}/dashboard/dados`;

    if (mesSelecionado) {
      url += `?mes=${mesSelecionado}`;
    }

    const res = await fetch(url);
    const dados = await res.json();

    // NÃO ATUALIZAR OS CONTADORES GERAIS AQUI — MANTER RESUMO GERAL SEPARADO
    // document.getElementById('ativosCount').textContent = dados.ativos;
    // document.getElementById('quitadosCount').textContent = dados.quitados;
    // document.getElementById('inadimplentesCount').textContent = dados.inadimplentes;

    // Destrói gráficos anteriores se existirem
    if (graficoEmprestimos) graficoEmprestimos.destroy();
    if (graficoJuros) graficoJuros.destroy();
    if (graficoVencimentos) graficoVencimentos.destroy();

    // Gráfico Total Emprestado por Mês
    const meses = Object.keys(dados.porMes);
    const valores = meses.map(m => dados.porMes[m]);
    const ctxEmprestimos = document.getElementById('graficoEmprestimosMes').getContext('2d');
    graficoEmprestimos = new Chart(ctxEmprestimos, {
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
        onClick: async (evt, elements) => {
          if (elements.length > 0) {
            const mesSelecionado = graficoEmprestimos.data.labels[elements[0].index];
            await mostrarDadosDoMes(mesSelecionado, 'emprestimos');
          }
        },
        plugins: { title: { display: true, text: 'Total Emprestado por Mês' } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Gráfico Juros a Receber por Mês
    const jurosMes = Object.keys(dados.jurosMes);
    const valoresJuros = jurosMes.map(m => dados.jurosMes[m]);
    const ctxJuros = document.getElementById('graficoJurosMes').getContext('2d');
    graficoJuros = new Chart(ctxJuros, {
      type: 'line',
      data: {
        labels: jurosMes,
        datasets: [{
          label: 'Juros a Receber (R$)',
          data: valoresJuros,
          borderColor: '#fbc02d',
          fill: false,
          tension: 0.1
        }]
      },
      options: {
        plugins: { title: { display: true, text: 'Juros a Receber por Mês' } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Gráfico Parcelas com Vencimento por Mês
    const vencimentosMes = Object.keys(dados.parcelasVencimento);
    const valoresVencimentos = vencimentosMes.map(m => dados.parcelasVencimento[m]);
    const ctxVencimentos = document.getElementById('graficoVencimentosMes').getContext('2d');
    graficoVencimentos = new Chart(ctxVencimentos, {
      type: 'bar',
      data: {
        labels: vencimentosMes,
        datasets: [{
          label: 'Parcelas com Vencimento (R$)',
          data: valoresVencimentos,
          backgroundColor: '#ff9800'
        }]
      },
      options: {
        onClick: async (evt, elements) => {
          if (elements.length > 0) {
            const mesSelecionado = graficoVencimentos.data.labels[elements[0].index];
            await mostrarDadosDoMes(mesSelecionado, 'parcelas');
          }
        },
        plugins: { title: { display: true, text: 'Parcelas com Vencimento no Mês' } },
        scales: { y: { beginAtZero: true } }
      }
    });

  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
}

// --- FUNÇÃO PARA INICIALIZAR OS DOIS PAINÉIS ---
async function inicializarDashboard() {
  const inputMes = document.getElementById('mesSelecionado');
  const mesAtual = new Date().toISOString().slice(0, 7);

  // Define valor padrão do input mesSelecionado
  inputMes.value = mesAtual;

  // Carrega resumo geral (ativos, quitados, inadimplentes)
  await carregarEstatisticas();

  // Carrega gráficos e dados do mês atual
  await carregarDashboard(mesAtual);

  // Configura listener para mudar o mês e atualizar só os gráficos
  inputMes.addEventListener('change', async (e) => {
    const mesSelecionado = e.target.value;
    if (mesSelecionado) {
      await carregarDashboard(mesSelecionado);
    }
  });
}

// Executa a inicialização ao carregar o script
inicializarDashboard();


async function mostrarDadosDoMes(mes, tipo) {
  const container = document.getElementById('dadosDetalhadosMes');
  const secao = document.getElementById('dadosGraficoMesSelecionado');
  container.innerHTML = '<p>Carregando...</p>';
  secao.style.display = 'block';

  try {
    // Ajusta o formato de mes para o esperado na URL (MM-AAAA)
    const mesAno = mes.replace('/', '-');

    const res = await fetch(`${URL_SERVICO}/dashboard/detalhes/${tipo}/${mesAno}`);
    const dados = await res.json();

    let html = '';

    if (tipo === 'emprestimos') {
      // Soma total no frontend (caso queira mostrar)
      const total = dados.reduce((acc, e) => acc + (e.valorOriginal || 0), 0);
      html += `<h4>Total Emprestado no mês: R$ ${total.toFixed(2)}</h4>`;

      dados.forEach(e => {
        html += `
          <div class="card-cliente">
          <div id="corContainer">
            <strong>Cliente:</strong> ${e.nome}<br>
            Valor: R$ ${e.valorOriginal.toFixed(2)}<br>
            Parcelas: ${e.parcelas}<br>
         </div></div><br>`;
      });

    } else if (tipo === 'parcelas') {
      html += `<h4>Total de Parcelas no mês: ${dados.length}</h4>`;
      dados.forEach(p => {
        html += `
          <div class="card-cliente">
          <div id="corContainer">
            <strong>Cliente:</strong> ${p.nome}<br>
            Parcela ${p.parcela} de ${p.totalParcelas || 'N/A'}<br>
            Valor: R$ ${p.valorPrevisto.toFixed(2)}<br>
            Vencimento: ${new Date(p.dataVencimento).toLocaleDateString('pt-BR')}
          </div></div><br>`;
      });
    }

    container.innerHTML = html;

    // Salva dados para PDF, se usar depois
    window.ultimoMesSelecionado = { mes, tipo, html };
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Erro ao carregar dados do mês</p>';
  }
}


document.getElementById('btnExportarPDFGrafico').addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const container = document.getElementById('dadosDetalhadosMes');

  if (!window.ultimoMesSelecionado || !container || container.innerHTML.trim() === '') {
    mostrarAlertaError('Nenhum dado carregado para exportar');
    return;
  }

  const { mes, tipo } = window.ultimoMesSelecionado;

  const clone = container.cloneNode(true);
  clone.style.width = '800px';
  clone.style.padding = '20px';
  clone.style.color = '#000';
  clone.style.background = '#fff';

  document.body.appendChild(clone);

  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    const canvas = await html2canvas(clone, { scale: 2 });
    const imgData = canvas.toDataURL('image/jpeg', 1.0);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let position = 0;
    let heightLeft = imgHeight;

    if (imgHeight < pageHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight);
    } else {
      while (heightLeft > 0) {
        pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
        position -= pageHeight;
        if (heightLeft > 0) pdf.addPage();
      }
    }

    const nomeArquivo = `${tipo}_${mes.replaceAll('/', '-')}.pdf`;
    pdf.save(nomeArquivo);
  } catch (err) {
    console.error('Erro ao exportar PDF:', err);
  } finally {
    document.body.removeChild(clone);
  }
});



// EXTRAÇÃO DE PAGAMENTOS
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
        ${e.pagamentos.map(p => `
          <div id="corContainer">
            <strong>Parcela ${p.parcela}</strong><br>
            Data do pagamento: ${new Date(p.dataPagamento).toLocaleDateString('pt-BR')}<br>
            Valor: <strong>R$ ${p.valor.toFixed(2)}</strong><br>
            Recebido por: <em>${p.recebidoPor || 'N/A'}</em>
          </div>
        `).join('')}
      `;

      container.appendChild(div);
    });

    container.style.display = 'block';

    // Mostra o botão de exportar PDF
    document.getElementById('btnExportarPDF').style.display = 'inline-block';

  } catch (err) {
    console.error(err);
    mostrarAlertaError('Erro ao buscar dados de pagamento');
  }
});






function splitCanvasToImages(canvas, pageWidthMM, pageHeightMM, scale = 2) {
  const pxPerMM = 96 / 25.4; // aproximado: 96dpi / 25.4mm
  const pageWidthPx = Math.floor(pageWidthMM * pxPerMM * scale);
  const pageHeightPx = Math.floor(pageHeightMM * pxPerMM * scale);

  const images = [];
  let y = 0;

  while (y < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - y);

    // Cria um canvas temporário para o pedaço
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvas.width;
    tmpCanvas.height = sliceHeight;

    const ctx = tmpCanvas.getContext('2d');
    // Desenha no canvas temporário só o pedaço desejado
    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    const imgData = tmpCanvas.toDataURL('image/jpeg', 1.0);
    images.push({ imgData, heightPx: sliceHeight });

    y += sliceHeight;
  }

  return images;
}


// EXPORTAR PDF
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

  const logoUrl = 'wbanco.png';

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
    const date = new Date(isoDate + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  }

  headerText.innerHTML = `
    <strong>Relatório de Pagamentos</strong><br/>
    Período: ${formatarDataLocalISO(dataInicio)} até ${formatarDataLocalISO(dataFim)}
  `;

  header.appendChild(img);
  header.appendChild(headerText);

  const clone = original.cloneNode(true);
  clone.style.background = '#fff';
  clone.style.color = '#000';
  clone.style.width = '100%';

  container.appendChild(header);
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    await new Promise(resolve => setTimeout(resolve, 300));
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

    if (imgHeight < pageHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
            const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const images = splitCanvasToImages(canvas, pageWidth, pageHeight, 2);

      let position = 0;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const imgHeightMM = (img.heightPx * pageWidth) / canvas.width / 2; // dividir por 2 pois scale=2

        pdf.addImage(img.imgData, 'JPEG', 0, 0, pageWidth, imgHeightMM);

        if (i < images.length - 1) {
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



// Pega o mês atual no formato yyyy-MM e define como valor padrão do input
const inputMes = document.getElementById('mesSelecionado');
const mesAtual = new Date().toISOString().slice(0, 7);
inputMes.value = mesAtual;

inputMes.addEventListener('click', () => {
  if (inputMes.showPicker) {
    inputMes.showPicker();
  }
});
// Carrega inicialmente com o mês atual
carregarDashboard(mesAtual);

// Quando o usuário mudar o mês, recarrega os dados
inputMes.addEventListener('change', (e) => {
  const mesSelecionado = e.target.value; // yyyy-MM
  if (mesSelecionado) {
    carregarDashboard(mesSelecionado);
  }
});

document.getElementById('btnLimparExtracao').addEventListener('click', () => {
  document.getElementById('dataInicio').value = '';
  document.getElementById('dataFim').value = '';
  document.getElementById('resultadoExtracao').innerHTML = '';
  document.getElementById('btnExportarPDF').style.display = 'none'; // Esconde o botão
});

