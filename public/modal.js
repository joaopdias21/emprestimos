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

// Adicione isso no início do arquivo, após os imports
function calcularDiasAtraso(dataVencimentoStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const vencimento = new Date(dataVencimentoStr);
  vencimento.setHours(0, 0, 0, 0);
  
  const diffTime = hoje.getTime() - vencimento.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return Math.max(0, Math.floor(diffDays));
}

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
    console.error('Erro na busca:', err);
  }
}

modalFechar.addEventListener('click', (e) => {
  console.log('[DEBUG] Modal principal fechado manualmente');
  e.preventDefault();
  modal.style.display = 'none';
  document.body.classList.remove('modal-aberto');
  document.body.style.top = '';
  window.scrollTo(0, scrollPos);
});

btnCancelarRecebedor.addEventListener('click', () => {
  modalRecebedor.style.display = 'none';
  inputValorRecebido.value = '';
  parcelaSelecionada = null;
  atualizarVisualParcelas(emprestimoSelecionado);
});

// Função para verificar se há atraso e calcular multa
function verificarAtrasoEPreencherValor(emprestimo, indiceParcela) {
  // Remove a div anterior se existir
  const infoDivExistente = document.getElementById('infoMulta');
  if (infoDivExistente) {
    infoDivExistente.remove();
  }

  // Cria a div para a mensagem
  const infoDiv = document.createElement('div');
  infoDiv.id = 'infoMulta';
  infoDiv.style.margin = '15px 0';
  infoDiv.style.padding = '12px';
  infoDiv.style.backgroundColor = '#fff8e1'; // Fundo amarelo claro
  infoDiv.style.borderRadius = '6px';
  infoDiv.style.borderLeft = '4px solid #ffa000'; // Borda laranja
  infoDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

  // Calcula os valores
  const valorJuros = (emprestimo.valorComJuros - emprestimo.valorOriginal);
  const valorParcela = emprestimo.valorParcelasPendentes?.[indiceParcela] ?? valorJuros;
  
  let valorMinimo = valorJuros;
  let multa = 0;
  let mensagemInfo = `<div style="margin-bottom: 8px;"><strong>Valor mínimo (juros):</strong> ${formatarMoeda(valorMinimo)}</div>`;

  if (emprestimo.datasVencimentos?.[indiceParcela]) {
    const diasAtraso = calcularDiasAtraso(emprestimo.datasVencimentos[indiceParcela]);
    if (diasAtraso > 0) {
      multa = diasAtraso * 20;
      valorMinimo += multa;
      mensagemInfo = `
        <div style="color: #d32f2f; margin-bottom: 8px; font-weight: bold;">
          ⚠️ Parcela atrasada: ${diasAtraso} dia(s)
        </div>
        <div style="margin-bottom: 5px;">
          <strong>Valor do juros:</strong> ${formatarMoeda(valorJuros)}
        </div>
        <div style="margin-bottom: 5px;">
          <strong>Multa por atraso:</strong> ${formatarMoeda(multa)}
        </div>
        <div style="font-weight: bold; color: #d32f2f;">
          ▶ Valor mínimo a receber: ${formatarMoeda(valorMinimo)}
        </div>`;
    }
  }

  infoDiv.innerHTML = mensagemInfo;

  // Insere a mensagem antes dos botões
  const botoesContainer = document.querySelector('.modal-botoes');
  if (botoesContainer) {
    botoesContainer.parentNode.insertBefore(infoDiv, botoesContainer);
  } else {
    // Fallback: adiciona no final do modal-conteudo
    const modalConteudo = document.querySelector('.modal-conteudo');
    if (modalConteudo) {
      modalConteudo.appendChild(infoDiv);
    }
  }

  return { valorMinimo, multa };
}





btnConfirmarRecebedor.addEventListener('click', async () => {
  if (!modalRecebedor || !btnConfirmarRecebedor) {
    console.error('Elementos do modal não encontrados no DOM');
    return;
  }

  const nome = inputRecebedor.value.trim();
  if (!nome) {
    mostrarAlertaWarning('Selecione o nome de quem recebeu.');
    return;
  }

  const { emprestimo, indice, checkbox } = parcelaSelecionada;
  const dataPagamento = new Date().toISOString();
  const valorRecebidoRaw = document.getElementById('valorRecebido').value;
  const valorLimpoString = valorRecebidoRaw.replace(/\D/g, '');
  const valorRecebido = parseFloat(valorLimpoString) / 100;

  if (isNaN(valorRecebido)) {
    mostrarAlertaWarning('Informe um valor válido para o pagamento.');
    return;
  }

  // Obter os valores calculados
  const { valorMinimo, multa } = verificarAtrasoEPreencherValor(emprestimo, indice);
  
  // Verificar se o valor recebido é suficiente
  if (valorRecebido < valorMinimo) {
    mostrarAlertaWarning(`Valor recebido insuficiente. O valor mínimo para esta parcela é ${formatarMoeda(valorMinimo)} (Juros: ${formatarMoeda(valorMinimo - multa)} + Multa: ${formatarMoeda(multa)})`);
    return;
  }
      

  if (valorRecebido <= 0) {
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

    // Atualiza os arrays se não existirem
    if (!emprestimo.statusParcelas) emprestimo.statusParcelas = [];
    if (!emprestimo.datasPagamentos) emprestimo.datasPagamentos = [];
    if (!emprestimo.recebidoPor) emprestimo.recebidoPor = [];
    if (!emprestimo.valoresRecebidos) emprestimo.valoresRecebidos = [];

    // Atualiza os dados da parcela
    emprestimo.statusParcelas[indice] = true;
    emprestimo.datasPagamentos[indice] = dataPagamento;
    emprestimo.recebidoPor[indice] = nome;
    emprestimo.valoresRecebidos[indice] = valorRecebido;

    // Atualiza a UI
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

      if (emprestimoAtualizado.diasAtraso > 0) {
        info += `
          <strong>⚠️ Parcela paga com atraso</strong><br>
          <hr>
          <strong>⚠️ Dias de atraso:</strong> ${emprestimoAtualizado.diasAtraso}<br>
          <strong>💰 Multa:</strong> ${formatarMoeda(emprestimoAtualizado.multa)}<br>
          <strong>💸 Total pagoooooooo:</strong> ${formatarMoeda(valorRecebido)} (incluindo multa)<br>`;

        if (valorRecebido === emprestimoAtualizado.multa) {
          info += `<em>Foi realizado apenas o pagamento da multa.</em>`;
        } else if (valorRecebido > emprestimoAtualizado.multa) {
          const extra = valorRecebido - emprestimoAtualizado.multa;
          info += `<em>Valor pago além da multa: ${formatarMoeda(extra)}</em>`;
        }
      }

      label.innerHTML += info;
      checkbox.parentElement.classList.add('parcela-paga');
      
      if (emprestimoAtualizado.diasAtraso > 0) {
        checkbox.parentElement.classList.add('parcela-paga-com-atraso');
      }
    }

    mostrarAlerta(`Parcela ${indice + 1} marcada como paga por ${nome}`);
        atualizarVisualParcelas(emprestimo);
    atualizarValorRestante(emprestimo)

  } catch (err) {
    mostrarAlertaError(`Erro ao marcar parcela como paga: ${err.message}`);
    console.error('Erro ao marcar parcela como paga:', err);
    checkbox.checked = false;
  }

  modalRecebedor.style.display = 'none';
  inputValorRecebido.value = '';
  parcelaSelecionada = null;
});

function atualizarValorRestante(emprestimoAtualizado) {
  console.log('Atualizando valor restante com:', emprestimoAtualizado);
  if (!emprestimoAtualizado) return;

  // 1. Calcula o total já recebido (considerando apenas valores numéricos)
  const valoresRecebidos = (emprestimoAtualizado.valoresRecebidos || [])
    .filter(val => typeof val === 'number');
  
  const totalRecebido = valoresRecebidos.reduce((acc, val) => acc + val, 0);
  const parcelasPagas = valoresRecebidos.length;

  // 2. Obtém o valor total com juros
  const valorTotalComJuros = emprestimoAtualizado.valorComJuros || 0;
  const valorOriginal = emprestimoAtualizado.valorOriginal || 0;
  const totalJuros = valorTotalComJuros - valorOriginal;

  // 3. Calcula multas apenas das parcelas não pagas e vencidas
  let totalMultas = 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  (emprestimoAtualizado.datasVencimentos || []).forEach((vencimento, i) => {
    if (!emprestimoAtualizado.statusParcelas?.[i] && vencimento) {
      const dataVenc = new Date(vencimento);
      dataVenc.setHours(0, 0, 0, 0);
      
      if (hoje > dataVenc) {
        const diasAtraso = Math.floor((hoje - dataVenc) / (1000 * 60 * 60 * 24));
        totalMultas += diasAtraso * 20;
      }
    }
  });

  // 4. Calcula os valores restantes
  const restanteSemMulta = Math.max(0, valorTotalComJuros - totalRecebido);
  const restanteComMulta = restanteSemMulta + totalMultas;

  // 5. Atualiza a exibição
  const container = document.getElementById('valorRestanteContainer');
  if (!container) return;

  // Formata a exibição
  container.innerHTML = `
    <div style="margin-bottom: 10px;">
      <strong>Total pago:</strong> ${formatarMoeda(totalRecebido)} (${parcelasPagas} parcela${parcelasPagas !== 1 ? 's' : ''})
    </div>

    ${
      totalMultas > 0 
        ? `
          <div style="color: #d9534f; margin-bottom: 10px;">
            <strong>Multa por atraso:</strong> +${formatarMoeda(totalMultas)}
          </div>
          <div style="font-weight: bold; font-size: 1.1em; color: #d9534f;">
            Total a pagar: ${formatarMoeda(restanteComMulta)}
          </div>`
        : `
          <div style="font-weight: bold; font-size: 1.1em;">
            Valor restante: ${formatarMoeda(restanteSemMulta)}
          </div>`
    }
  `;
}
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
            
            <div id="valoresCalculados" class="valores-card">
                <div class="valor-item">
                    <span class="label">💰 Valor Original:</span>
                    <span class="valor" id="displayValorOriginal">${formatarMoeda(emprestimo.valorOriginal)}</span>
                </div>
                <div class="valor-item">
                    <span class="label">📈 Valor com juros (<span id="displayTaxaJuros">${taxaFormatada}</span>%):</span>
                    <span class="valor destaque" id="displayValorComJuros">${formatarMoeda(emprestimo.valorComJuros)}</span>
                </div>
                <div class="valor-item">
                    <span class="label">📅 Parcelas:</span>
                    <span class="valor" id="displayParcelas">${emprestimo.parcelas}</span>
                    <span class="label">x de</span>
                    <span class="valor" id="displayValorParcela">${formatarMoeda(emprestimo.valorParcela)}</span>
                </div>
            </div>
                <br>

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
        <div><strong>Valor do juros (${taxaFormatada}%):</strong> ${formatarMoeda(emprestimo.valorComJuros - emprestimo.valorOriginal)}</div>

        ${emprestimo.quitado ? '<div style="color: green; font-weight: bold;">✅ Empréstimo Quitado</div>' : ''}
      </div>

      </div>
        <div id="parcelasContainer" style="flex: 1;">
          <h3>📆 Parcelas</h3>
          <button id="btnEditarVencimentos" style="margin-bottom: 15px;">Editar Vencimentos</button>
          <div id="containerEditarVencimentos" style="display:none; margin-bottom: 15px;"></div>
          <br>
          <div id="valorRestanteContainer" style="margin-top: 15px; font-weight: bold; font-size: 1.1em;"></div>
        </div>
  `;
  atualizarValorRestante(emprestimo);

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
    infoFinanceiraDiv.style.display = 'grid';
  });

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

  inputValorOriginal.addEventListener('input', calcularValores);
  inputTaxaJuros.addEventListener('input', calcularValores);
  inputParcelas.addEventListener('input', calcularValores);

  calcularValores();

  formEditarEmprestimo.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const dadosAtualizados = Object.fromEntries(formData.entries());

    dadosAtualizados.valorOriginal = parseFloat(dadosAtualizados.valorOriginal);
    dadosAtualizados.taxaJuros = parseFloat(dadosAtualizados.taxaJuros);
    dadosAtualizados.parcelas = parseInt(dadosAtualizados.parcelas, 10);

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
      abrirModal(emprestimoAtualizado);
      realizarBusca(termoAtual);
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

      await salvarNovasDatasVencimento(emprestimo.id, novasDatas);
      emprestimo.datasVencimentos = novasDatas;
      containerEditarVencimentos.style.display = 'none';
      btnEditarVencimentos.textContent = 'Editar Vencimentos';
      abrirModal(emprestimo);
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

  atualizarVisualParcelas(emprestimo);
}

export function mostrarModalRecebedor() {
  modalRecebedor.style.display = 'flex';
}

function atualizarVisualParcelas(emprestimo) {
  const parcelasContainer = document.getElementById('parcelasContainer');
  if (!parcelasContainer) return;

  // Salva os elementos que queremos preservar
  const elementosPreservar = [];
  const tituloParcelas = parcelasContainer.querySelector('h3');
  const btnEditar = parcelasContainer.querySelector('#btnEditarVencimentos');
  const containerEditar = parcelasContainer.querySelector('#containerEditarVencimentos');
  const valorRestante = parcelasContainer.querySelector('#valorRestanteContainer');
  
  if (tituloParcelas) elementosPreservar.push(tituloParcelas);
  if (btnEditar) elementosPreservar.push(btnEditar);
  if (containerEditar) elementosPreservar.push(containerEditar);
  if (valorRestante) elementosPreservar.push(valorRestante);

  parcelasContainer.innerHTML = '';

    // Reinsere os elementos preservados
  elementosPreservar.forEach(el => {
    if (el.id === 'containerEditarVencimentos') {
      el.style.display = 'none'; // Mantém escondido
    }
    parcelasContainer.appendChild(el);
  });

  const parcelas = emprestimo.statusParcelas || Array(emprestimo.parcelas).fill(false);
  const datasPagamentos = emprestimo.datasPagamentos || Array(emprestimo.parcelas).fill(null);
  const recebidoPor = emprestimo.recebidoPor || Array(emprestimo.parcelas).fill(null);
  const datasVencimentos = emprestimo.datasVencimentos || [];
  const valorJuros = (emprestimo.valorComJuros - emprestimo.valorOriginal);

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


    let html = `<strong>📦 Parcela ${i + 1}:</strong> ${formatarMoeda(valorJuros)}<br>`;
    if (venc) html += `<strong>📅 Vencimento:</strong> ${venc}<br>`;

    let statusClass = 'parcela-em-dia';

    if (vencimento && !paga) {
      const diasAtraso = calcularDiasAtraso(vencimento);
      if (diasAtraso > 0) {
        const multa = diasAtraso * 20;
        html += `<strong style="color: red;">⚠️ Atrasada:</strong> ${diasAtraso} dia(s)<br>`;
        html += `<strong style="color: red;">Multa:</strong> ${formatarMoeda(multa)}<br>`;
        statusClass = 'parcela-atrasada';
      } else {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const [yyyy, mm, dd] = vencimento.split('-');
        const vencData = new Date(yyyy, mm - 1, dd);
        vencData.setHours(0, 0, 0, 0);

        if (hoje.getTime() === vencData.getTime()) {
          html += `<strong style="color: orange;">📅 Vence hoje</strong><br>`;
          statusClass = 'parcela-hoje';
        }
      }
    }

    if (paga && datasPagamentos[i]) {
      const data = new Date(datasPagamentos[i]).toLocaleDateString('pt-BR');
      const horario = new Date(datasPagamentos[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const recebedor = recebidoPor[i] || 'N/A';
      const valorRecebido = emprestimo.valoresRecebidos?.[i];
      
      html += `<strong>✅ Paga em:</strong> ${data}<br>`;
      html += `<strong>🙍‍♂️ Recebido por:</strong> ${recebedor} às ${horario}<br>`;
      
      if (vencimento) {
        const dataPag = new Date(datasPagamentos[i]);
        const dataVenc = new Date(vencimento);
        
        if (dataPag > dataVenc) {
          const diasAtraso = Math.floor((dataPag - dataVenc) / (1000 * 60 * 60 * 24));
          const multa = diasAtraso * 20;
          
          html += `<strong>⚠️ Parcela paga com atraso</strong><br>`;
          html += `<hr>`;
          html += `<strong>⚠️ Dias de atraso:</strong> ${diasAtraso}<br>`;
          html += `<strong>💰 Multa:</strong> ${formatarMoeda(multa)}<br>`;
          statusClass = 'parcela-paga-com-atraso';
        } else {
          statusClass = 'parcela-paga';
        }
      }

      if (valorRecebido != null) {
        html += `<strong>💵 Valor Recebido:</strong> ${formatarMoeda(valorRecebido)}<br>`;
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

        // Configurações do operador (mantidas)
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

        // Calcular valor mínimo com possível multa
        const valorParcela = emprestimo.valorParcelasPendentes?.[i] ?? emprestimo.valorParcela;
        let valorMinimo = valorParcela;
        let mensagemInfo = '';

        // Verificar atraso
        if (emprestimo.datasVencimentos?.[i]) {
          const vencimento = new Date(emprestimo.datasVencimentos[i]);
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          vencimento.setHours(0, 0, 0, 0);

          if (hoje > vencimento) {
            const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
            const multa = diasAtraso * 20;
            valorMinimo = valorParcela + multa;
            mensagemInfo = `⚠️ Esta parcela está atrasada ${diasAtraso} dia(s). Multa: ${formatarMoeda(multa)}`;
          }
        }

        // Adicionar mensagem informativa no modal
        const infoDiv = document.getElementById('infoMulta') || document.createElement('div');
        infoDiv.id = 'infoMulta';
        infoDiv.style.margin = '10px 0';
        infoDiv.style.padding = '10px';
        infoDiv.style.backgroundColor = '#fff3e0';
        infoDiv.style.borderRadius = '4px';
        infoDiv.style.borderLeft = '4px solid #ffb74d';
        
        if (mensagemInfo) {
          infoDiv.innerHTML = mensagemInfo;
          modalRecebedor.insertBefore(infoDiv, btnConfirmarRecebedor);
        } else if (infoDiv.parentNode) {
          infoDiv.parentNode.removeChild(infoDiv);
        }

        // REMOVA esta parte que pré-preenche o valor
        // document.getElementById('valorRecebido').value = valorMinimo.toLocaleString('pt-BR', {
        //   style: 'currency',
        //   currency: 'BRL'
        // });

        // Em vez disso, deixe o campo vazio
        document.getElementById('valorRecebido').value = '';
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