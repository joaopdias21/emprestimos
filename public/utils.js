export function mostrarAlerta(msg, cor = '#4caf50', icone = '✔️') {
  const alerta = document.getElementById('alertaCustom');
  alerta.innerHTML = `<span style="margin-right: 8px;">${icone}</span> ${msg}`;
  alerta.style.backgroundColor = cor;
  alerta.style.display = 'block';

  // Reinicia animações
  alerta.classList.remove('alerta-custom');
  void alerta.offsetWidth; // força reflow
  alerta.classList.add('alerta-custom');

  setTimeout(() => {
    alerta.style.display = 'none';
  }, 3000);
}

export function mostrarAlertaError(msg) {
  mostrarAlerta(msg, '#f44336', '❌');
}

export function mostrarAlertaWarning(msg) {
  mostrarAlerta(msg, '#ffc107', '⚠️');
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}


export function formatarDataParaBR(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}
