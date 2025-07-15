let tipoSelecionado = 'ativos';

// Função para converter dados em CSV
function converterParaCSV(dados) {
  if (!dados || dados.length === 0) return '';

  const colunas = Object.keys(dados[0]);
  const linhas = dados.map(obj =>
    colunas.map(col => `"${(obj[col] ?? '').toString().replace(/"/g, '""')}"`).join(',')
  );

  return [colunas.join(','), ...linhas].join('\r\n');
}

// Função para baixar o CSV
function baixarArquivoCSV(nomeArquivo, conteudo) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', nomeArquivo);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Evento do botão de exportar
document.getElementById('exportCSV').addEventListener('click', () => {
  let dadosExportar = [];
  if (tipoSelecionado === 'ativos') dadosExportar = window.ativosData || [];
  else if (tipoSelecionado === 'quitados') dadosExportar = window.quitadosData || [];
  else if (tipoSelecionado === 'inadimplentes') dadosExportar = window.inadimplentesData || [];

  if (!dadosExportar.length) {
    mostrarAlertaWarning('Nenhum dado para exportar neste tipo');
    return;
  }

  const csv = converterParaCSV(dadosExportar);
  baixarArquivoCSV(`emprestimos_${tipoSelecionado}.csv`, csv);
});

// Carregar estatísticas do dashboard
async function carregarEstatisticas() {
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
    console.error('Erro ao carregar estatísticas:', err);
  }
}

// Destaca visualmente o tipo selecionado no dashboard
function destacarTipoSelecionado() {
  ['ativos', 'quitados', 'inadimplentes'].forEach(tipo => {
    const el = document.getElementById(tipo);
    if (el) {
      if (tipo === tipoSelecionado) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    }
  });
}

// Eventos de clique no dashboard para mudar o tipo selecionado
['ativos', 'quitados', 'inadimplentes'].forEach(tipo => {
  const el = document.getElementById(tipo);
  if (el) {
    el.addEventListener('click', () => {
      tipoSelecionado = tipo;
      destacarTipoSelecionado();
    });
  }
});

// Estilo visual do dashboard item (ativa classe "ativo" no clique)
document.addEventListener("DOMContentLoaded", function () {
  const dashboardItems = document.querySelectorAll(".dashboard-item");

  dashboardItems.forEach(item => {
    item.addEventListener("click", () => {
      dashboardItems.forEach(i => i.classList.remove("ativo"));
      item.classList.add("ativo");
    });
  });
});
