export function mostrarAlerta(msg, cor = '#4caf50') {
  const alerta = document.getElementById('alertaCustom');
  alerta.textContent = msg;
  alerta.style.backgroundColor = cor;
  alerta.style.display = 'block';
  setTimeout(() => alerta.style.display = 'none', 3000);
}

export function mostrarAlertaError(msg) {
  mostrarAlerta(msg, '#f44336');
}

export function mostrarAlertaWarning(msg) {
  mostrarAlerta(msg, '#ffc107');
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}
