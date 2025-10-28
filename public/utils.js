export function mostrarAlerta(msg, cor = 'linear-gradient(45deg, #4caf50, #43a047)', icone = '✔️') {
  const alerta = document.getElementById('alertaCustom');
  const progresso = alerta.querySelector('.alerta-progresso');

  alerta.innerHTML = `<span>${icone}</span> ${msg} <div class="alerta-progresso"></div>`;
  alerta.style.background = cor;

  alerta.classList.remove('show');
  void alerta.offsetWidth; // força reflow
  alerta.classList.add('show');

  setTimeout(() => {
    alerta.classList.remove('show');
  }, 3000);
}

export function mostrarAlertaError(msg) {
  mostrarAlerta(msg, 'linear-gradient(45deg, #f44336, #d32f2f)', '❌');
}

export function mostrarAlertaWarning(msg) {
  mostrarAlerta(msg, 'linear-gradient(45deg, #ff9800, #f57c00)', '⚠️');
}

export function mostrarAlertaInfo(msg) {
  mostrarAlerta(msg, 'linear-gradient(45deg, #2196f3, #1976d2)', 'ℹ️');
}

export function formatarMoeda(valor) {
  if (typeof valor !== 'number') return 'R$ 0,00';

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}




export function formatarMoedaLista(valor) {
  if (typeof valor !== 'number') return 'R$ 0,00';
  
  // Formata com 2 casas decimais sem arredondar valores inteiros
  const partes = valor.toFixed(2).split('.');
  return `${partes[0]}`;
}




export function formatarDataParaBR(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}
