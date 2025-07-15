import { mostrarAlerta, mostrarAlertaError, mostrarAlertaWarning, formatarMoeda } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // Pega os elementos do DOM, só depois do carregamento da página
  const consultarCepBtn = document.getElementById('consultarCep');
  const cepInput = document.getElementById('cep');
  const enderecoInput = document.getElementById('endereco');
  const cidadeInput = document.getElementById('cidade');
  const estadoInput = document.getElementById('estado');

  if (!consultarCepBtn || !cepInput || !enderecoInput || !cidadeInput || !estadoInput) {
    console.error('Algum input do CEP não foi encontrado no DOM');
    return;
  }

  consultarCepBtn.addEventListener('click', async () => {
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) {
      mostrarAlertaWarning('CEP inválido');
      return;
    }

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();

      if (data.erro) {
        mostrarAlertaError('CEP não encontrado');
        return;
      }

      enderecoInput.value = data.logradouro || '';
      cidadeInput.value = data.localidade || '';
      estadoInput.value = data.uf || '';
      mostrarAlerta('Endereço preenchido com sucesso!');
    } catch (err) {
      mostrarAlertaError('Erro ao buscar o CEP');
      console.error(err);
    }
  });

  cepInput.addEventListener('input', () => {
    if (cepInput.value.replace(/\D/g, '').length !== 8) {
      enderecoInput.value = '';
      cidadeInput.value = '';
      estadoInput.value = '';
    }
  });
});
