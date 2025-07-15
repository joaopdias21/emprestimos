export function aplicarMascaraCPF(valor) {
  valor = valor.replace(/\D/g, '').slice(0, 11);
  return valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") || valor;
}

document.addEventListener('DOMContentLoaded', () => {
  const cpfInput = document.getElementById('cpf');
  const cepInput = document.getElementById('cep');

  if (cpfInput) {
    cpfInput.addEventListener('input', e => {
      e.target.value = aplicarMascaraCPF(e.target.value);
    });
  }

  if (cepInput) {
    cepInput.addEventListener('input', e => {
      let valor = e.target.value.replace(/\D/g, '');
      if (valor.length > 5) valor = valor.slice(0, 5) + '-' + valor.slice(5);
      e.target.value = valor;
    });
  }
});
