import { URL_SERVICO } from './config.js';
import { mostrarAlerta, mostrarAlertaError, formatarMoeda } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('emprestimoForm');
  const infoValores = document.getElementById('infoValores');


  if (!form) {
    console.error('Formulário não encontrado no DOM');
    return;
  }


  function formatarInputMoeda(input) {
  input.addEventListener('input', () => {
    let valor = input.value.replace(/\D/g, '');

    if (valor.length === 0) {
      input.value = 'R$ 0,00';
      return;
    }

    valor = (parseInt(valor, 10) / 100).toFixed(2) + '';
    valor = valor.replace('.', ',');
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');

    input.value = 'R$ ' + valor;
  });

  input.addEventListener('focus', () => {
    if (input.value.trim() === '') {
      input.value = 'R$ 0,00';
    }
  });

  input.addEventListener('blur', () => {
    if (input.value === 'R$ 0,00') {
      input.value = '';
    }
  });
}


  const jurosInput = document.createElement('input');
  jurosInput.type = 'number';
  jurosInput.id = 'taxaJuros'; // usar mesmo id que você usa para pegar o valor depois
  jurosInput.placeholder = 'Porcentagem de juros';
  jurosInput.min = 0;
  jurosInput.max = 100;
  jurosInput.step = 1;
  jurosInput.value = 20; // valor default 20%
  form.insertBefore(jurosInput, infoValores);

  jurosInput.addEventListener('input', atualizarResumoValores);
  const valorInput = document.getElementById('valor');
  formatarInputMoeda(valorInput);
  const parcelasInput = document.getElementById('parcelas');

 // Função para atualizar o resumo e tabela
  function atualizarResumoValores() {
    const valorNumerico = parseFloat(valorInput.value.replace(/[^\d]/g, '')) / 100;
    const qtdParcelas = parseInt(parcelasInput.value);

    let taxaJuros = parseFloat(jurosInput.value);
    if (isNaN(taxaJuros) || taxaJuros === '') {
      taxaJuros = 20; // default
    }
    taxaJuros = taxaJuros / 100;

    const tabelaParcelas = document.getElementById('tabelaParcelas');
    tabelaParcelas.innerHTML = '';

    if (isNaN(valorNumerico) || isNaN(qtdParcelas) || qtdParcelas <= 0) {
      infoValores.innerHTML = '';
      return;
    }

    const valorComJuros = valorNumerico * (1 + taxaJuros);
    const valorParcela = valorComJuros / qtdParcelas;

    // Exibe o resumo
    infoValores.innerHTML = `
      <p>Valor original: <strong>${formatarMoeda(valorNumerico)}</strong></p>
      <p>Valor com juros (${(taxaJuros * 100).toFixed(0)}%): <strong>${formatarMoeda(valorComJuros)}</strong></p>
      <p>${qtdParcelas}x de <strong>${formatarMoeda(valorParcela)}</strong></p>
    `;

    // Cria a tabela com datas
    const hoje = new Date();

    let tabelaHTML = `
      <table class="tabela-parcelas">
        <thead>
          <tr>
            <th>Parcela</th>
            <th>Valor</th>
            <th>Vencimento</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (let i = 0; i < qtdParcelas; i++) {
      const vencimento = new Date(hoje);
      vencimento.setMonth(vencimento.getMonth() + i + 1); // começa um mês à frente

      const dataFormatada = vencimento.toISOString().split('T')[0];

      tabelaHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${formatarMoeda(valorParcela)}</td>
          <td><input type="date" value="${dataFormatada}" class="input-data-parcela" data-index="${i}"></td>
        </tr>
      `;
    }

    tabelaHTML += `
        </tbody>
      </table>
    `;
    tabelaParcelas.innerHTML = tabelaHTML;
  }

  // Eventos para atualizar resumo ao mudar valor, parcelas ou juros
  valorInput.addEventListener('input', atualizarResumoValores);
  parcelasInput.addEventListener('input', atualizarResumoValores);
  jurosInput.addEventListener('input', atualizarResumoValores);

  // Chama ao carregar para mostrar valores default
  atualizarResumoValores();

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append('nome', document.getElementById('nome').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('telefone', document.getElementById('telefone').value);
    formData.append('cpf', document.getElementById('cpf').value);
    formData.append('endereco', document.getElementById('endereco').value);
    formData.append('cidade', document.getElementById('cidade').value);
    formData.append('estado', document.getElementById('estado').value);
    formData.append('cep', document.getElementById('cep').value);
    formData.append('numero', document.getElementById('numero').value);
    formData.append('complemento', document.getElementById('complemento').value);

    // Corrigir valor
    const valor = +document.getElementById('valor').value.replace(/\D/g, '') / 100;
    formData.append('valor', valor);

    // Parcelas
    const parcelas = parseInt(document.getElementById('parcelas').value);
    formData.append('parcelas', parcelas);

    // Taxa de juros
  let taxa = parseFloat(jurosInput.value);
  if (isNaN(taxa)) taxa = 20;
  formData.append('taxaJuros', taxa);

    // Datas de vencimento (múltiplas)
    const vencimentos = Array.from(document.querySelectorAll('.input-data-parcela'))
      .map(input => input.value)
      .filter(data => data !== '');
    vencimentos.forEach(data => formData.append('datasVencimentos', data));

    // Arquivos (múltiplos)
    const arquivos = document.getElementById('anexos').files;
    for (let i = 0; i < arquivos.length; i++) {
      formData.append('anexos', arquivos[i]);
    }

    try {
      const res = await fetch(`${URL_SERVICO}/emprestimos`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const erroTexto = await res.text();
        throw new Error(erroTexto);
      }

      mostrarAlerta('Empréstimo cadastrado com sucesso!');
      form.reset();
      infoValores.textContent = '';
      atualizarResumoValores();

    } catch (err) {
      console.error('Erro ao salvar:', err);
      mostrarAlertaError(`Erro ao cadastrar empréstimo: ${err.message}`);
    }
  });
});
