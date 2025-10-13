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
