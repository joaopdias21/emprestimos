import { mostrarAlertaError, mostrarAlertaWarning, formatarMoeda } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const valorInput = document.getElementById('valor');
  const parcelasInput = document.getElementById('parcelas');
  const infoValores = document.getElementById('infoValores');

  if (!valorInput || !parcelasInput || !infoValores) {
    console.error('Algum elemento para cálculo de parcelas não encontrado.');
    return;
  }

  valorInput.addEventListener('input', atualizarValorTotal);
  parcelasInput.addEventListener('input', atualizarValorTotal);

  function atualizarValorTotal() {
    const valor = parseFloat(valorInput.value.replace(',', '.')) || 0;
    const parcelas = parseInt(parcelasInput.value) || 1;
    const taxa = 0.2;
    const valorTotal = valor * Math.pow(1 + taxa, parcelas);
    infoValores.textContent = `Total a pagar: ${formatarMoeda(valorTotal)}`;
  }
});
