/* eslint-disable no-unused-vars */
import { URL_SERVICO } from './config.js';
import {
  mostrarAlerta,
  mostrarAlertaError,
  mostrarAlertaWarning,
  formatarMoeda
} from './utils.js';
import {
  modal,
  modalCorpo,
  modalFechar,
  modalRecebedor,
  inputRecebedor,
  btnCancelarRecebedor,
  btnConfirmarRecebedor
} from './dom.js';

let emprestimoSelecionado = null;
let parcelaSelecionada = null;
let termoAtual = '';
let scrollPos = 0;

function preencherDatasPadraoFrontend(datasVencimentos, parcelas) {
  if (!Array.isArray(datasVencimentos)) {
    datasVencimentos = [];
  }

  for (let i = 0; i < parcelas; i++) {
    if (!datasVencimentos[i]) {
      const data = new Date();
      data.setMonth(data.getMonth() + i + 1);
      const yyyy = data.getFullYear();
      const mm = String(data.getMonth() + 1).padStart(2, '0');
      const dd = String(data.getDate()).padStart(2, '0');
      datasVencimentos[i] = `${yyyy}-${mm}-${dd}`;
    }
  }

  return datasVencimentos;
}


// === MÁSCARA DE FORMATAÇÃO PARA INPUT DE MOEDA (R$) ===
const inputValorRecebido = document.getElementById('valorRecebido');

inputValorRecebido.addEventListener('input', (e) => {
  let valor = e.target.value.replace(/\D/g, '');

  let valorNum = parseInt(valor, 10);
  if (isNaN(valorNum)) {
    e.target.value = '';
    return;
  }

  valorNum = valorNum / 100;

  e.target.value = valorNum.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
});

async function realizarBusca(termo) {
  try {
    const res = await fetch(`${URL_SERVICO}/emprestimos?termo=${termo}`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Erro ao buscar empréstimos: ${errorText}`);
    }
    const dados = await res.json();

    const termoNormalizado = termo.toLowerCase();

    const filtrado = dados.filter(e => {
      const nome = e.nome ? e.nome.toLowerCase() : '';
      const cpf = e.cpf ? e.cpf.toLowerCase() : '';
      return nome.includes(termoNormalizado) || cpf.includes(termoNormalizado);
    });

    resultado.innerHTML = '';

    if (filtrado.length === 0) {
      resultado.innerHTML = '<li>Nenhum resultado encontrado</li>';
      return;
    }

    filtrado.forEach(e => {
      const li = document.createElement('li');
      li.classList.add('card-vencimento');
      li.innerHTML = `
        <h3>${e.nome}</h3>
        <p><strong>Valor:</strong> ${formatarMoeda(e.valorOriginal)} | <strong>Parcelas:</strong> ${e.parcelas}</p>
        <p><strong>Endereço:</strong> ${e.endereco}, ${e.numero}${e.complemento ? ' - ' + e.complemento : ''}</p>
        <p><strong>Cidade:</strong> ${e.cidade} - ${e.estado} | <strong>CEP:</strong> ${e.cep}</p>
      `;

      // Abrir modal ao clicar no item
      li.addEventListener('click', (event) => {
        abrirModal(e);
      });

      resultado.appendChild(li);
      setTimeout(() => {
        li.classList.add('mostrar');
      }, 10);
    });
  } catch (err) {
    mostrarAlertaError(`Erro ao realizar busca: ${err.message}`);
    console.error('Erro na busca:', err); // Log para depuração
  }
}
// ====== Fechar modal principal ======
modalFechar.addEventListener('click', (e) => {
  console.log('[DEBUG] Modal principal fechado manualmente');
  e.preventDefault();
  modal.style.display = 'none';
  document.body.classList.remove('modal-aberto');
  document.body.style.top = '';
  window.scrollTo(0, scrollPos);
});

// ====== Cancelar recebedor ======
btnCancelarRecebedor.addEventListener('click', () => {
modalRecebedor.style.display = 'none';
inputValorRecebido.value = '';

parcelaSelecionada = null;
atualizarVisualParcelas(emprestimoSelecionado);

});

// ====== Confirmar parcela paga ======
btnConfirmarRecebedor.addEventListener('click', async () => {
  const nome = inputRecebedor.value.trim();
  if (!nome) {
    mostrarAlertaWarning('Selecione o nome de quem recebeu.');
    return;
  }

  const { emprestimo, indice, checkbox } = parcelaSelecionada;
  const dataPagamento = new Date().toISOString();
  const valorRecebidoRaw = document.getElementById('valorRecebido').value;
    const valorLimpoString = valorRecebidoRaw.replace(/\D/g, ''); // remove tudo que não for dígito
    const valorRecebido = parseFloat(valorLimpoString) / 100;

    if (isNaN(valorRecebido) || valorRecebido <= 0) {
      mostrarAlertaWarning('Informe um valor válido para o pagamento.');
      return;
    }


  try {
    const response = await fetch(`${URL_SERVICO}/emprestimos/${emprestimo.id}/parcela/${indice}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataPagamento,
        nomeRecebedor: nome,
        valorRecebido
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro do servidor: ${errorText}`);
    }

    const emprestimoAtualizado = await response.json();
    Object.assign(emprestimo, emprestimoAtualizado);

    // Garante arrays locais
    if (!emprestimo.statusParcelas) emprestimo.statusParcelas = [];
    if (!emprestimo.datasPagamentos) emprestimo.datasPagamentos = [];
    if (!emprestimo.recebidoPor) emprestimo.recebidoPor = [];
    if (!emprestimo.valoresRecebidos) emprestimo.valoresRecebidos = [];

    // Atualiza dados da parcela
    emprestimo.statusParcelas[indice] = true;
    emprestimo.datasPagamentos[indice] = dataPagamento;
    emprestimo.recebidoPor[indice] = nome;
    emprestimo.valoresRecebidos[indice] = valorRecebido;

    // Atualiza UI
    checkbox.checked = true;
    checkbox.disabled = true;

    const label = checkbox.nextElementSibling;
    if (label) {
      const data = new Date(dataPagamento).toLocaleDateString('pt-BR');
      const horario = new Date(dataPagamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const valorOriginal = emprestimo.valorParcela;
      const diferenca = valorRecebido - valorOriginal;

      let info = `
        <br><strong>✅ Paga em:</strong> ${data}<br>
        <strong>🙍‍♂️ Recebido por:</strong> ${nome} às ${horario}<br>
        <strong>💵 Valor Recebido:</strong> ${formatarMoeda(valorRecebido)}<br>`;

      if (Math.abs(diferenca) >= 0.01) {
        info += `<strong style="color:${diferenca > 0 ? 'green' : 'red'};">${
          diferenca > 0 ? '📈 Pagou mais que o valor original' : '📉 Pagou menos que o valor original'
        }</strong><br>`;
      }

      label.innerHTML += info;
      checkbox.parentElement.classList.add('parcela-paga');
    }

    mostrarAlerta(`Parcela ${indice + 1} marcada como paga por ${nome}`);
  } catch (err) {
    mostrarAlertaError(`Erro ao marcar parcela como paga: ${err.message}`);
    console.error('Erro ao marcar parcela como paga:', err);
    checkbox.checked = false;
  }

  modalRecebedor.style.display = 'none';
  inputValorRecebido.value = '';

  parcelaSelecionada = null;
  atualizarVisualParcelas(emprestimoSelecionado);
});


// ====== Abrir modal principal ======
export async function abrirModal(emprestimo) {
  scrollPos = window.scrollY || document.documentElement.scrollTop;
  document.body.classList.add('modal-aberto');
  document.body.style.top = `-${scrollPos}px`;

  emprestimoSelecionado = emprestimo;
  modal.style.display = 'flex';

  const taxa = typeof emprestimo.taxaJuros === 'number' ? emprestimo.taxaJuros : 0;
  const taxaFormatada = taxa.toFixed(0);

  modalCorpo.innerHTML = `
    <div class="modal-layout">
      <div id="detalhesEmprestimo" class="detalhes-emprestimo" style="flex: 1;">
        <h3>📄 Dados do Empréstimo</h3>
        <div class="grid-detalhes">
          <div><strong>Nome:</strong> ${emprestimo.nome}</div>
          <div><strong>Email:</strong> ${emprestimo.email}</div>
          <div><strong>Telefone:</strong> ${emprestimo.telefone}</div>
          <div><strong>CPF:</strong> ${emprestimo.cpf}</div>
          <div><strong>CEP:</strong> ${emprestimo.cep}</div>
          <div><strong>Endereço:</strong> ${emprestimo.endereco}</div>
          <div><strong>Número:</strong> ${emprestimo.numero}</div>
          <div><strong>Complemento:</strong> ${emprestimo.complemento || 'N/A'}</div>
          <div><strong>Cidade:</strong> ${emprestimo.cidade}</div>
          <div><strong>Estado:</strong> ${emprestimo.estado}</div>
        </div>

        <button id="btnEditar" style="margin-top:20px;">Editar Empréstimo</button>
        <div id="editarContainer" style="margin-top: 15px; display:none;">
          <form id="formEditarEmprestimo">
            <label>Nome: <input type="text" name="nome" value="${emprestimo.nome}" required></label><br>
            <label>Email: <input type="email" name="email" value="${emprestimo.email}" required></label><br>
            <label>Telefone: <input type="text" name="telefone" value="${emprestimo.telefone}" required></label><br>
            <label>CPF: <input type="text" name="cpf" value="${emprestimo.cpf}" required></label><br>
            <label>CEP: <input type="text" name="cep" value="${emprestimo.cep}" required></label><br>
            <label>Endereço: <input type="text" name="endereco" value="${emprestimo.endereco}" required></label><br>
            <label>Número: <input type="text" name="numero" value="${emprestimo.numero}" required></label><br>
            <label>Complemento: <input type="text" name="complemento" value="${emprestimo.complemento || ''}"></label><br>
            <label>Cidade: <input type="text" name="cidade" value="${emprestimo.cidade}" required></label><br>
            <label>Estado: <input type="text" name="estado" value="${emprestimo.estado}" maxlength="2" required></label><br>

            <div id="financeiro-edit">
              <label>Valor original: <input type="number" step="0.01" name="valorOriginal" value="${emprestimo.valorOriginal}" required></label><br>
              <label>Taxa de Juros (%): <input type="number" step="0.01" name="taxaJuros" value="${emprestimo.taxaJuros || 0}" required></label><br>
              <label>Parcelas: <input type="number" name="parcelas" value="${emprestimo.parcelas}" min="1" max="100" required></label><br>
            </div>
            
            <div id="valoresCalculados" style="margin-top: 10px;">
                <strong>Valor original:</strong> <span id="displayValorOriginal">${formatarMoeda(emprestimo.valorOriginal)}</span><br>
                <strong>Valor com juros (<span id="displayTaxaJuros">${taxaFormatada}</span>%):</strong> <span id="displayValorComJuros">${formatarMoeda(emprestimo.valorComJuros)}</span><br>
                <strong>Parcelas:</strong> <span id="displayParcelas">${emprestimo.parcelas}</span>x de <span id="displayValorParcela">${formatarMoeda(emprestimo.valorParcela)}</span>
            </div>

            <button type="submit" id="btnSalvarEdicao">Salvar</button>
            <button type="button" id="btnCancelarEdicao">Cancelar</button>
          </form>
        </div>

        <hr /><br>
        <h3>💰 Informações Financeiras</h3>
        <div id="infoFinanceira" class="grid-detalhes">
          <div><strong>Valor original:</strong> ${formatarMoeda(emprestimo.valorOriginal)}</div>
          <div><strong>Valor com juros (${taxaFormatada}%):</strong> ${formatarMoeda(emprestimo.valorComJuros)}</div>
          <div><strong>Parcelas:</strong> ${emprestimo.parcelas}x de ${formatarMoeda(emprestimo.valorParcela)}</div>
          ${emprestimo.quitado ? '<div style="color: green; font-weight: bold;">✅ Empréstimo Quitado</div>' : ''}
        </div>
      </div>
      <div id="parcelasContainer" style="flex: 1;">
        <h3>📆 Parcelas</h3>
        <button id="btnEditarVencimentos" style="margin-bottom: 15px;">Editar Vencimentos</button>
        <div id="containerEditarVencimentos" style="display:none; margin-bottom: 15px;"></div>
      </div>
    </div>
  `;
console.log('Datas de vencimento:', emprestimo.datasVencimentos);

  // Se tiver arquivos
  if (emprestimo.arquivos?.length) {
    const lista = emprestimo.arquivos.map(a =>
      `<li><a href="${URL_SERVICO}${a.caminho}" target="_blank">${a.nomeOriginal}</a></li>`).join('');

    modalCorpo.querySelector('#detalhesEmprestimo').innerHTML += `
      <br><h3>📎 Arquivos Anexados</h3>
      <ul>${lista}</ul>`;
  }

  const btnEditar = document.getElementById('btnEditar');
  const editarContainer = document.getElementById('editarContainer');
  const infoFinanceiraDiv = document.getElementById('infoFinanceira');

  btnEditar.addEventListener('click', () => {
    btnEditar.style.display = 'none';
    infoFinanceiraDiv.style.display = 'none';
    editarContainer.style.display = 'block';
  });

  const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
  btnCancelarEdicao.addEventListener('click', () => {
    editarContainer.style.display = 'none';
    btnEditar.style.display = 'inline-block';
    infoFinanceiraDiv.style.display = 'grid'; // Volta a exibir as informações financeiras
  });


  // ===============================================
  // LÓGICA DE CÁLCULO E ATUALIZAÇÃO DINÂMICA
  // ===============================================
  const formEditarEmprestimo = document.getElementById('formEditarEmprestimo');
  const inputValorOriginal = formEditarEmprestimo.querySelector('input[name="valorOriginal"]');
  const inputTaxaJuros = formEditarEmprestimo.querySelector('input[name="taxaJuros"]');
  const inputParcelas = formEditarEmprestimo.querySelector('input[name="parcelas"]');

  const displayValorOriginal = document.getElementById('displayValorOriginal');
  const displayTaxaJuros = document.getElementById('displayTaxaJuros');
  const displayValorComJuros = document.getElementById('displayValorComJuros');
  const displayParcelas = document.getElementById('displayParcelas');
  const displayValorParcela = document.getElementById('displayValorParcela');

  function calcularValores() {
    const valorOriginal = parseFloat(inputValorOriginal.value);
    const taxaJuros = parseFloat(inputTaxaJuros.value);
    const numParcelas = parseInt(inputParcelas.value, 10);

    // Validação básica para evitar NaN
    if (isNaN(valorOriginal) || isNaN(taxaJuros) || isNaN(numParcelas) || numParcelas <= 0) {
      return;
    }

    const valorComJuros = valorOriginal * (1 + taxaJuros / 100);
    const valorParcela = valorComJuros / numParcelas;

    displayValorOriginal.textContent = formatarMoeda(valorOriginal);
    displayTaxaJuros.textContent = taxaJuros.toFixed(0);
    displayValorComJuros.textContent = formatarMoeda(valorComJuros);
    displayParcelas.textContent = numParcelas;
    displayValorParcela.textContent = formatarMoeda(valorParcela);
  }

  // Adiciona listeners para os campos que afetam o cálculo
  inputValorOriginal.addEventListener('input', calcularValores);
  inputTaxaJuros.addEventListener('input', calcularValores);
  inputParcelas.addEventListener('input', calcularValores);

  // Inicializa a exibição dos valores calculados ao abrir o formulário de edição
  calcularValores();
  // ===============================================


  // Salvar edição
  formEditarEmprestimo.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const dadosAtualizados = Object.fromEntries(formData.entries());

    // Converter os tipos que precisam ser numéricos
    dadosAtualizados.valorOriginal = parseFloat(dadosAtualizados.valorOriginal);
    dadosAtualizados.taxaJuros = parseFloat(dadosAtualizados.taxaJuros);
    dadosAtualizados.parcelas = parseInt(dadosAtualizados.parcelas, 10);

    // Recalcular os valores financeiros para enviar ao servidor
    dadosAtualizados.valorComJuros = dadosAtualizados.valorOriginal * (1 + dadosAtualizados.taxaJuros / 100);
    dadosAtualizados.valorParcela = dadosAtualizados.valorComJuros / dadosAtualizados.parcelas;
   dadosAtualizados.datasVencimentos = emprestimoSelecionado.datasVencimentos || [];


    try {
        const response = await fetch(`${URL_SERVICO}/emprestimos/${emprestimoSelecionado.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosAtualizados)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao salvar: ${errorText}`);
        }

        const emprestimoAtualizado = await response.json();
        mostrarAlerta('Empréstimo atualizado com sucesso!');

        // Esta linha atualiza o modal com os dados novos
        abrirModal(emprestimoAtualizado);

        // >>> IMPORTANTE: ADICIONE ESTA LINHA ABAIXO! <<<
        // Ela vai recarregar a lista principal de empréstimos na página.
        realizarBusca(termoAtual); // Recarrega os cards da página inicial.

    } catch (err) {
        mostrarAlertaError(`Erro ao salvar: ${err.message}`);
        console.error(err);
    }
});


  const btnEditarVencimentos = document.getElementById('btnEditarVencimentos');
  const containerEditarVencimentos = document.getElementById('containerEditarVencimentos');


  const isOperador = localStorage.getItem("isOperador") === "true";

  if (isOperador) {
    if (btnEditar) btnEditar.style.display = 'none';
    if (btnEditarVencimentos) btnEditarVencimentos.style.display = 'none';
  }


  btnEditarVencimentos.addEventListener('click', () => {
    if (containerEditarVencimentos.style.display === 'none') {
      containerEditarVencimentos.style.display = 'block';
      btnEditarVencimentos.textContent = 'Cancelar Edição';

      montarCamposEdicaoVencimentos(emprestimo);
    } else {
      containerEditarVencimentos.style.display = 'none';
      btnEditarVencimentos.textContent = 'Editar Vencimentos';
      containerEditarVencimentos.innerHTML = '';
    }
  });



function montarCamposEdicaoVencimentos(emprestimo) {
  containerEditarVencimentos.innerHTML = '';

  // Preenche as datas antes de usar
  const datasPreenchidas = preencherDatasPadraoFrontend(
    emprestimo.datasVencimentos || [],
    emprestimo.parcelas
  );

  for (let i = 0; i < emprestimo.parcelas; i++) {
    const div = document.createElement('div');
    div.style.marginBottom = '10px';

    const label = document.createElement('label');
    label.textContent = `Parcela ${i + 1}: `;

    const inputData = document.createElement('input');
    inputData.type = 'date';
    inputData.value = datasPreenchidas[i];
    inputData.dataset.index = i;

    div.appendChild(label);
    div.appendChild(inputData);
    containerEditarVencimentos.appendChild(div);
  }

    // Botão para salvar as datas novas
    const btnSalvarVencimentos = document.createElement('button');
    btnSalvarVencimentos.textContent = 'Salvar Vencimentos';
    btnSalvarVencimentos.style.marginTop = '10px';

    btnSalvarVencimentos.addEventListener('click', async () => {
      const inputs = containerEditarVencimentos.querySelectorAll('input[type="date"]');
      const novasDatas = [];

      for (const input of inputs) {
        if (!input.value) {
          alert(`Informe a data de vencimento da parcela ${parseInt(input.dataset.index) + 1}`);
          return;
        }
        novasDatas.push(input.value);
      }

      // Chama função para enviar as novas datas ao backend
      await salvarNovasDatasVencimento(emprestimo.id, novasDatas);

      // Atualiza visualização no modal
      emprestimo.datasVencimentos = novasDatas;
      containerEditarVencimentos.style.display = 'none';
      btnEditarVencimentos.textContent = 'Editar Vencimentos';
      abrirModal(emprestimo); // Reabre modal para atualizar dados
    });

    containerEditarVencimentos.appendChild(btnSalvarVencimentos);
  }

  async function salvarNovasDatasVencimento(emprestimoId, novasDatas) {
    try {
      const res = await fetch(`${URL_SERVICO}/emprestimos/${emprestimoId}/datas-vencimento`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasVencimentos: novasDatas })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      mostrarAlerta('Datas de vencimento atualizadas com sucesso!');
    } catch (err) {
      mostrarAlertaError(`Erro ao atualizar datas: ${err.message}`);
    }
  }

  // >>>>> NOVO CÓDIGO
  function atualizarCardsEmprestimo(emprestimoAtualizado) {
    const parcelasContainer = document.getElementById('parcelasContainer');
    if (!parcelasContainer) {
      console.error('Container de parcelas não encontrado.');
      return;
    }
    
    // Limpa os cards existentes
    parcelasContainer.innerHTML = '';

    // E então re-renderiza os cards com os novos dados
    const parcelas = emprestimoAtualizado.statusParcelas || Array(emprestimoAtualizado.parcelas).fill(false);
    const datasPagamentos = emprestimoAtualizado.datasPagamentos || Array(emprestimoAtualizado.parcelas).fill(null);
    const recebidoPor = emprestimoAtualizado.recebidoPor || Array(emprestimoAtualizado.parcelas).fill(null);
    const datasVencimentos = emprestimoAtualizado.datasVencimentos || [];

    parcelas.forEach((paga, i) => {
      const item = document.createElement('div');
      item.className = 'parcela-box';
      item.style = 'margin-bottom: 16px; display: flex; align-items: flex-start;';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = paga;
      chk.disabled = paga;
      chk.style = 'margin-right: 10px; transform: scale(1.5); cursor: pointer; margin-top: 4px;';

      const label = document.createElement('label');
      label.style.lineHeight = '1.4';

      const valorParcela = formatarMoeda(
        emprestimoAtualizado.valorParcelasPendentes?.[i] ?? emprestimoAtualizado.valorParcela
      );

      const vencimento = datasVencimentos[i];
      const venc = vencimento ? vencimento.split('-').reverse().join('/') : null;

      let html = `<strong>📦 Parcela ${i + 1}:</strong> ${valorParcela}<br>`;
      if (venc) html += `<strong>📅 Vencimento:</strong> ${venc}<br>`;

      let statusClass = 'parcela-em-dia';

      if (vencimento && !paga) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const [yyyy, mm, dd] = vencimento.split('-');
        const vencData = new Date(yyyy, mm - 1, dd);
        vencData.setHours(0, 0, 0, 0);

        if (hoje.getTime() === vencData.getTime()) {
          html += `<strong style="color: orange;">📅 Vence hoje</strong><br>`;
          statusClass = 'parcela-hoje';
        } else if (hoje > vencData) {
          const diasAtraso = Math.floor((hoje - vencData) / (1000 * 60 * 60 * 24));
          const multa = diasAtraso * 20;
          html += `<strong style="color: red;">⚠️ Atrasada:</strong> ${diasAtraso} dia(s)<br>`;
          html += `<strong style="color: red;">Multa:</strong> ${formatarMoeda(multa)}<br>`;
          statusClass = 'parcela-atrasada';
        }
      }

      if (paga && datasPagamentos[i]) {
        const data = new Date(datasPagamentos[i]).toLocaleDateString('pt-BR');
        const horario = new Date(datasPagamentos[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const valorRecebido = emprestimoAtualizado.valoresRecebidos?.[i];
        const recebedor = recebidoPor[i] || 'N/A';
        html += `<strong>✅ Paga em:</strong> ${data}<br>`;
        html += `<strong>🙍‍♂️ Recebido por:</strong> ${recebedor} às ${horario}`;
        statusClass = 'parcela-paga';
          if (valorRecebido != null) {
          const valorOriginal = emprestimoAtualizado.valorParcela;
          const diferenca = valorRecebido - valorOriginal;

          html += `<br><strong>💵 Valor Recebido:</strong> ${formatarMoeda(valorRecebido)}<br>`;

          if (Math.abs(diferenca) >= 0.01) {
            html += `<strong style="color:${diferenca > 0 ? 'green' : 'red'};">${
              diferenca > 0 ? '📈 Pagou mais que o valor original' : '📉 Pagou menos que o valor original'
            }</strong><br>`;
          }
        }

      }

      label.innerHTML = html;

      const isOperador = localStorage.getItem('isOperador') === 'true';
      const operadorNome = localStorage.getItem('operadorNome') || '';

      chk.addEventListener('change', () => {
        if (chk.checked) {
          if (i > 0 && !parcelas[i - 1]) {
            mostrarAlertaWarning(`Você precisa marcar a parcela ${i} como paga antes da ${i + 1}.`);
            chk.checked = false;
            return;
          }

          chk.checked = false;
          parcelaSelecionada = { emprestimo: emprestimoAtualizado, indice: i, checkbox: chk };
          modalRecebedor.style.display = 'flex';

          if (isOperador) {
            const options = inputRecebedor.options;
            let valorParaSetar = '';
            for (let k = 0; k < options.length; k++) {
              if (options[k].text === operadorNome || options[k].value === operadorNome) {
                valorParaSetar = options[k].value;
                break;
              }
            }

            inputRecebedor.value = valorParaSetar || '';
            inputRecebedor.disabled = true;
          } else {
            inputRecebedor.value = '';
            inputRecebedor.disabled = false;
            inputRecebedor.focus();
          }

          const valorAtual = emprestimoAtualizado.valorParcelasPendentes?.[i] ?? emprestimoAtualizado.valorParcela;
          document.getElementById('valorRecebido').value = valorAtual.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          });
        }
      });

      item.appendChild(chk);
      item.appendChild(label);
      item.classList.add(statusClass);
      parcelasContainer.appendChild(item);

      if (i < parcelas.length - 1) {
        const hr = document.createElement('hr');
        hr.style = 'border: none; border-top: 1px solid #ccc; margin: 8px 0 16px;';
        parcelasContainer.appendChild(hr);
      }
    });
  }
  // <<<<<


  const parcelasContainer = document.getElementById('parcelasContainer');
  const parcelas = emprestimo.statusParcelas || Array(emprestimo.parcelas).fill(false);
  const datasPagamentos = emprestimo.datasPagamentos || Array(emprestimo.parcelas).fill(null);
  const recebidoPor = emprestimo.recebidoPor || Array(emprestimo.parcelas).fill(null);
  const datasVencimentos = emprestimo.datasVencimentos || [];

  parcelas.forEach((paga, i) => {
    const item = document.createElement('div');
    item.className = 'parcela-box';
    item.style = 'margin-bottom: 16px; display: flex; align-items: flex-start;';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = paga;
    chk.disabled = paga;
    chk.style = 'margin-right: 10px; transform: scale(1.5); cursor: pointer; margin-top: 4px;';

    const label = document.createElement('label');
    label.style.lineHeight = '1.4';

    const valorParcela = formatarMoeda(
      emprestimo.valorParcelasPendentes?.[i] ?? emprestimo.valorParcela
    );

    const vencimento = datasVencimentos[i];
    const venc = vencimento ? vencimento.split('-').reverse().join('/') : null;

    let html = `<strong>📦 Parcela ${i + 1}:</strong> ${valorParcela}<br>`;
    if (venc) html += `<strong>📅 Vencimento:</strong> ${venc}<br>`;

    let statusClass = 'parcela-em-dia';

    if (vencimento && !paga) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const [yyyy, mm, dd] = vencimento.split('-');
      const vencData = new Date(yyyy, mm - 1, dd);
      vencData.setHours(0, 0, 0, 0);

      if (hoje.getTime() === vencData.getTime()) {
        html += `<strong style="color: orange;">📅 Vence hoje</strong><br>`;
        statusClass = 'parcela-hoje';
      } else if (hoje > vencData) {
        const diasAtraso = Math.floor((hoje - vencData) / (1000 * 60 * 60 * 24));
        const multa = diasAtraso * 20;
        html += `<strong style="color: red;">⚠️ Atrasada:</strong> ${diasAtraso} dia(s)<br>`;
        html += `<strong style="color: red;">Multa:</strong> ${formatarMoeda(multa)}<br>`;
        statusClass = 'parcela-atrasada';
      }
    }

    if (paga && datasPagamentos[i]) {
      const data = new Date(datasPagamentos[i]).toLocaleDateString('pt-BR');
      const horario = new Date(datasPagamentos[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const valorRecebido = emprestimo.valoresRecebidos?.[i];
      const recebedor = recebidoPor[i] || 'N/A';
      html += `<strong>✅ Paga em:</strong> ${data}<br>`;
      html += `<strong>🙍‍♂️ Recebido por:</strong> ${recebedor} às ${horario}`;
      statusClass = 'parcela-paga';
        if (valorRecebido != null) {
        const valorOriginal = emprestimo.valorParcela;
        const diferenca = valorRecebido - valorOriginal;

        html += `<br><strong>💵 Valor Recebido:</strong> ${formatarMoeda(valorRecebido)}<br>`;

        if (Math.abs(diferenca) >= 0.01) {
          html += `<strong style="color:${diferenca > 0 ? 'green' : 'red'};">${
            diferenca > 0 ? '📈 Pagou mais que o valor original' : '📉 Pagou menos que o valor original'
          }</strong><br>`;
        }
      }

    }

    label.innerHTML = html;

    const isOperador = localStorage.getItem('isOperador') === 'true';
    const operadorNome = localStorage.getItem('operadorNome') || '';

    chk.addEventListener('change', () => {
      if (chk.checked) {
        if (i > 0 && !parcelas[i - 1]) {
          mostrarAlertaWarning(`Você precisa marcar a parcela ${i} como paga antes da ${i + 1}.`);
          chk.checked = false;
          return;
        }

        chk.checked = false;
        parcelaSelecionada = { emprestimo, indice: i, checkbox: chk };
        modalRecebedor.style.display = 'flex';

        if (isOperador) {
          const options = inputRecebedor.options;
          let valorParaSetar = '';
          for (let k = 0; k < options.length; k++) {
            if (options[k].text === operadorNome || options[k].value === operadorNome) {
              valorParaSetar = options[k].value;
              break;
            }
          }

          inputRecebedor.value = valorParaSetar || '';
          inputRecebedor.disabled = true;
        } else {
          inputRecebedor.value = '';
          inputRecebedor.disabled = false;
          inputRecebedor.focus();
        }

        const valorAtual = emprestimo.valorParcelasPendentes?.[i] ?? emprestimo.valorParcela;
        document.getElementById('valorRecebido').value = valorAtual.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        });
      }
    });

    item.appendChild(chk);
    item.appendChild(label);
    item.classList.add(statusClass);
    parcelasContainer.appendChild(item);

    if (i < parcelas.length - 1) {
      const hr = document.createElement('hr');
      hr.style = 'border: none; border-top: 1px solid #ccc; margin: 8px 0 16px;';
      parcelasContainer.appendChild(hr);
    }
  });
}

// Exporta função se precisar abrir modal do recebedor diretamente
export function mostrarModalRecebedor() {
  modalRecebedor.style.display = 'flex';
}


function atualizarVisualParcelas(emprestimo) {
  const parcelasContainer = document.getElementById('parcelasContainer');
  if (!parcelasContainer) return;

  parcelasContainer.innerHTML = '';

  const parcelas = emprestimo.statusParcelas || Array(emprestimo.parcelas).fill(false);
  const datasPagamentos = emprestimo.datasPagamentos || Array(emprestimo.parcelas).fill(null);
  const recebidoPor = emprestimo.recebidoPor || Array(emprestimo.parcelas).fill(null);
  const datasVencimentos = emprestimo.datasVencimentos || [];

  parcelas.forEach((paga, i) => {
    const item = document.createElement('div');
    item.className = 'parcela-box';
    item.style = 'margin-bottom: 16px; display: flex; align-items: flex-start;';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = paga;
    chk.disabled = paga;
    chk.style = 'margin-right: 10px; transform: scale(1.5); cursor: pointer; margin-top: 4px;';

    const label = document.createElement('label');
    label.style.lineHeight = '1.4';

    const valorParcela = formatarMoeda(
      emprestimo.valorParcelasPendentes?.[i] ?? emprestimo.valorParcela
    );

    const vencimento = datasVencimentos[i];
    const venc = vencimento ? vencimento.split('-').reverse().join('/') : null;

    let html = `<strong>📦 Parcela ${i + 1}:</strong> ${valorParcela}<br>`;
    if (venc) html += `<strong>📅 Vencimento:</strong> ${venc}<br>`;

    let statusClass = 'parcela-em-dia';

    if (vencimento && !paga) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const [yyyy, mm, dd] = vencimento.split('-');
      const vencData = new Date(yyyy, mm - 1, dd);
      vencData.setHours(0, 0, 0, 0);

      if (hoje.getTime() === vencData.getTime()) {
        html += `<strong style="color: orange;">📅 Vence hoje</strong><br>`;
        statusClass = 'parcela-hoje';
      } else if (hoje > vencData) {
        const diasAtraso = Math.floor((hoje - vencData) / (1000 * 60 * 60 * 24));
        const multa = diasAtraso * 20;
        html += `<strong style="color: red;">⚠️ Atrasada:</strong> ${diasAtraso} dia(s)<br>`;
        html += `<strong style="color: red;">Multa:</strong> ${formatarMoeda(multa)}<br>`;
        statusClass = 'parcela-atrasada';
      }
    }

    if (paga && datasPagamentos[i]) {
      const data = new Date(datasPagamentos[i]).toLocaleDateString('pt-BR');
      const horario = new Date(datasPagamentos[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const recebedor = recebidoPor[i] || 'N/A';
      html += `<strong>✅ Paga em:</strong> ${data}<br>`;
      html += `<strong>🙍‍♂️ Recebido por:</strong> ${recebedor} às ${horario}<br>`;

      const valorRecebido = emprestimo.valoresRecebidos?.[i];
      const valorOriginal = emprestimo.valorParcela;

      if (valorRecebido != null) {
        const diferenca = valorRecebido - valorOriginal;
        html += `<br><strong>💵 Valor Recebido:</strong> ${formatarMoeda(valorRecebido)}<br>`;
        if (Math.abs(diferenca) >= 0.01) {
          html += `<strong style="color:${diferenca > 0 ? 'green' : 'red'};">${
            diferenca > 0 ? '📈 Pagou mais que o valor original' : '📉 Pagou menos que o valor original'
          }</strong><br>`;
        }
      }

      statusClass = 'parcela-paga';

    }

    label.innerHTML = html;
    const isOperador = localStorage.getItem('isOperador') === 'true';
    const operadorNome = localStorage.getItem('operadorNome') || '';


    chk.addEventListener('change', () => {
      if (chk.checked) {
        if (i > 0 && !parcelas[i - 1]) {
          mostrarAlertaWarning(`Você precisa marcar a parcela ${i} como paga antes da ${i + 1}.`);
          chk.checked = false;
          return;
        }

        chk.checked = false;
        parcelaSelecionada = { emprestimo, indice: i, checkbox: chk };
        modalRecebedor.style.display = 'flex';

        if (isOperador) {
          const options = inputRecebedor.options;
          let valorParaSetar = '';
          for (let k = 0; k < options.length; k++) {
            if (options[k].text === operadorNome || options[k].value === operadorNome) {
              valorParaSetar = options[k].value;
              break;
            }
          }

          inputRecebedor.value = valorParaSetar || '';
          inputRecebedor.disabled = true;
        } else {
          inputRecebedor.value = '';
          inputRecebedor.disabled = false;
          inputRecebedor.focus();
        }

        const valorAtual = emprestimo.valorParcelasPendentes?.[i] ?? emprestimo.valorParcela;
        document.getElementById('valorRecebido').value = valorAtual.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        });
      }
    });


    item.appendChild(chk);
    item.appendChild(label);
    item.classList.add(statusClass);
    parcelasContainer.appendChild(item);

    if (i < parcelas.length - 1) {
      const hr = document.createElement('hr');
      hr.style = 'border: none; border-top: 1px solid #ccc; margin: 8px 0 16px;';
      parcelasContainer.appendChild(hr);
    }
  });
}