import { URL_SERVICO } from './config.js';
import { mostrarAlertaError } from './utils.js';

let tipoSelecionado = 'ativos';

export async function carregarEstatisticas() {
  try {
    const [ativos, quitados, inadimplentes] = await Promise.all([
      fetch(`${URL_SERVICO}/emprestimos?status=ativo`).then(r => r.json()),
      fetch(`${URL_SERVICO}/emprestimos/quitados`).then(r => r.json()),
      fetch(`${URL_SERVICO}/emprestimos/inadimplentes`).then(r => r.json())
    ]);

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

// Inicializar dashboard
async function inicializarDashboard() {
  await carregarEstatisticas();
}

inicializarDashboard();
