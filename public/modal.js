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
let cidadeSelecionada = null;

//let filtroStatus = ''; // vazio = sem filtro






// pega só o YYYY-MM-DD de qualquer coisa (string ISO com ou sem hora)
function getDateOnly(s) {
  if (!s) return '';
  return typeof s === 'string' ? s.slice(0, 10) : new Date(s).toISOString().slice(0, 10);
}

  // Filtra empréstimos por data de vencimento
function normalizarData(data) {
  if (!data) return "";
  
  // Se vier no formato "YYYY-MM-DD"
  if (typeof data === "string" && data.includes("T")) {
    return data.split("T")[0];
  }
  if (typeof data === "string" && data.length === 10) {
    return data;
  }

  // Se for Date mesmo
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

// formata YYYY-MM-DD -> DD/MM/YYYY sem criar Date
function toBR(data) {
  if (!data) return "";
  
  let dataStr = normalizarData(data); // garante YYYY-MM-DD
  const [y, m, d] = dataStr.split("-");
  return `${d}/${m}/${y}`;
}

// "hoje" em ISO local (sem UTC/shift)
function hojeLocalISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// dias de atraso usando datas "de calendário" (sem fuso)
function calcularDiasAtrasoDataOnly(dataStr) {
  const [y, m, d] = normalizarData(dataStr).split("-").map(Number);

  const hoje = new Date();
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const vencimento = new Date(y, m - 1, d);

  const diff = Math.floor((hojeSemHora - vencimento) / 86400000);
  return diff > 0 ? diff : 0;
}

function criarDataLocal(dataStr) {
  if (!dataStr) return null;
  const partes = dataStr.split('-'); // assume formato 'YYYY-MM-DD'
  if (partes.length !== 3) return null;
  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1; // meses começam do 0
  const dia = parseInt(partes[2], 10);
  return new Date(ano, mes, dia); // horário = 00:00 local
}

function calcularDiasAtraso(dataVencimentoStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencimento = criarDataLocal(dataVencimentoStr);
  if (!vencimento) return 0;

  if (vencimento >= hoje) return 0; // vence hoje ou no futuro -> 0 dias de atraso

  const diffTime = hoje.getTime() - vencimento.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
  
  // Obtém o valor do input ou usa o valor calculado da lista
  let valorRecebido;
  if (parcelaSelecionada.valor) {
    // Usa o valor calculado (juros + multa) da lista
    valorRecebido = parcelaSelecionada.valor;
  } else {
    // Pega do input e formata
    const valorRecebidoRaw = document.getElementById('valorRecebido').value;
    const valorLimpoString = valorRecebidoRaw.replace(/\D/g, '');
    valorRecebido = parseFloat(valorLimpoString) / 100;
  }

  if (isNaN(valorRecebido)) {
    mostrarAlertaWarning('Informe um valor válido para o pagamento.');
    return;
  }

  // Verifica atraso e valor mínimo (mesmo para a lista)
  const { valorMinimo, multa } = verificarAtrasoEPreencherValor(emprestimo, indice);
  
  if (valorRecebido < valorMinimo) {
    mostrarAlertaWarning(`Valor recebido insuficiente. O valor mínimo para esta parcela é ${formatarMoeda(valorMinimo)} (Juros: ${formatarMoeda(valorMinimo - multa)} + Multa: ${formatarMoeda(multa)})`);
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
    if (checkbox) {
      checkbox.checked = true;
      checkbox.disabled = true;

      const label = checkbox.nextElementSibling;
      if (label) {
        const data = new Date(dataPagamento).toLocaleDateString('pt-BR');
        const horario = new Date(dataPagamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        let info = `
          <br><strong>✅ Paga em:</strong> ${data}<br>
          <strong>🙍‍♂️ Recebido por:</strong> ${nome} às ${horario}<br>
          <strong>💵 Valor Recebido:</strong> ${formatarMoeda(valorRecebido)}<br>`;

        if (emprestimoAtualizado.diasAtraso && emprestimoAtualizado.diasAtraso > 0) {
          info += `
            <strong style="color:#d9534f;">⚠️ Parcela paga com atraso</strong><br>
            <hr>
            <strong>⚠️ Dias de atraso:</strong> ${emprestimoAtualizado.diasAtraso}<br>
            <strong>💰 Multa:</strong> ${formatarMoeda(emprestimoAtualizado.multa)}<br>`;

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
    }

    // Atualiza a lista se estiver visível
    if (document.getElementById('listaEmprestimosCidade').style.display !== 'none') {
      // Recarrega os dados da cidade atual
      const cidadeAtual = cidadeSelecionada;
      if (cidadeAtual) {
        await carregarEmprestimosPorCidade();
        mostrarEmprestimosCidade(cidadeAtual);
      }
    }

    // Atualiza o modal se estiver aberto
    if (modal.style.display === 'flex') {
      atualizarVisualParcelas(emprestimo);
      atualizarValorRestante(emprestimo);
    }

    mostrarAlerta(`Parcela ${indice + 1} marcada como paga por ${nome}`);

  } catch (err) {
    console.error('Erro ao marcar parcela como paga:', err);
    if (checkbox) {
      checkbox.checked = false;
    }
    mostrarAlertaError(`Erro ao marcar parcela: ${err.message}`);
  }

  modalRecebedor.style.display = 'none';
  inputValorRecebido.value = '';
  parcelaSelecionada = null;
});

function atualizarValorRestante(emprestimoAtualizado) {
    if (!emprestimoAtualizado) return;

    const valorJurosTotal = (emprestimoAtualizado.valorComJuros || 0) - (emprestimoAtualizado.valorOriginal || 0);
    
    // Calcula multas das parcelas vencidas e não pagas
    let totalMultas = 0;
    (emprestimoAtualizado.datasVencimentos || []).forEach((vencimento, i) => {
        if (!emprestimoAtualizado.statusParcelas?.[i] && vencimento) {
            const diasAtraso = calcularDiasAtraso(vencimento);
            if (diasAtraso > 0) {
                totalMultas += diasAtraso * 20; // valor da multa por dia
            }
        }
    });

    const valorParcela = valorJurosTotal;
    let totalPagoValido = 0;
    const parcelasComExcedente = [];

    (emprestimoAtualizado.valoresRecebidos || []).forEach((val, i) => {
        if (typeof val !== 'number') return;

        const diasAtraso = calcularDiasAtraso(emprestimoAtualizado.datasVencimentos[i]);
        const multaParcela = diasAtraso * 20;
        const valorMinimoParcela = valorParcela + multaParcela;

        if (val > valorMinimoParcela) {
            const excedente = val - valorMinimoParcela;
            totalPagoValido += excedente;

            parcelasComExcedente.push({
                indice: i + 1,
                valorParcela,
                valorPago: val,
                multa: multaParcela,
                excedente: excedente,
                valorMinimo: valorMinimoParcela
            });
        }
    });

    const valorTotalComJuros = emprestimoAtualizado.valorComJuros || 0;
    let valorRestante = valorTotalComJuros;
    
    if (totalPagoValido > 0) {
        valorRestante = Math.max(0, valorTotalComJuros - totalPagoValido);
    }

    const container = document.getElementById('valorRestanteContainer');
    if (!container) return;

    // Calcula o número de parcelas pagas
    let parcelasPagas = 0;
    (emprestimoAtualizado.statusParcelas || []).forEach(status => {
        if (status) parcelasPagas++;
    });

    // Calcula juros recebidos (juros TOTAL * parcelas pagas)
    const jurosRecebidos = valorJurosTotal * parcelasPagas;

    // Mostrar apenas parcelas com excedente
    const parcelasHTML = parcelasComExcedente.map(p => {
        return `
        <div style="
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 8px;
            background-color: #f9f9f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <div>
                <strong>Parcela ${p.indice}</strong><br>
                Valor mínimo: ${formatarMoeda(p.valorMinimo)}<br>
                ${p.multa > 0 ? `<span style="color: #d9534f;">⚠️ Multa: ${formatarMoeda(p.multa)}</span><br>` : ''}
                Pago: ${formatarMoeda(p.valorPago)}
            </div>
            <div style="font-weight: bold; color: #28a745">
                💰 Excedente: ${formatarMoeda(p.excedente)}
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = `
        <hr>
        <br>
        <h3 style="margin-bottom: 10px;"><strong>🏦 Informações da quitação do empréstimo</strong></h3>
        ${parcelasHTML || '<p>Nenhuma parcela com pagamento acima do mínimo encontrada</p>'}
        <hr>
        <div style="margin-top: 10px; font-size: 1.05em;">
            <strong>Total excedente que abate do saldo:</strong> ${formatarMoeda(totalPagoValido)}
        </div>
        ${
            totalMultas > 0 ?
            `<div style="margin-top: 5px; color: #c52e28ff; font-weight: bold;">
                Multa total por atraso: +${formatarMoeda(totalMultas)}<br>
                Total a pagar: ${formatarMoeda(valorRestante + totalMultas)}
            </div>` :
            `<div style="margin-top: 5px; font-weight: bold;">
                Valor restante: ${formatarMoeda(valorRestante)}
            </div>`
        }

        <div style="margin-top: 5px; color: #007bff; font-weight: bold;">
            💹 Juros recebidos: ${formatarMoeda(jurosRecebidos)}
        </div>
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
          <div id="valorRestanteContainer" style="margin-top: 15px; font-weight: bold; font-size: 1.1em;"></div>

      </div>
        <div id="parcelasContainer" style="flex: 1;">
          <h3>📆 Parcelas</h3>
          <button id="btnEditarVencimentos" style="margin-bottom: 15px;">Editar Vencimentos</button>
          <div id="containerEditarVencimentos" style="display:none; margin-bottom: 15px;"></div>
          <br>

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

        // Zera horas, minutos, segundos e milissegundos
        dataPag.setHours(0, 0, 0, 0);
        dataVenc.setHours(0, 0, 0, 0);

        if (vencimento && datasPagamentos[i]) {
        const dataPag = new Date(datasPagamentos[i]);
        const dataVenc = criarDataLocal(vencimento); // usa a função para criar data local

        dataPag.setHours(0, 0, 0, 0); // garante só a data
        // dataVenc já está zerada
        if (dataPag > dataVenc) {
          const diasAtraso = Math.floor((dataPag - dataVenc) / (1000 * 60 * 60 * 24));
          const multa = diasAtraso * 20;

          html += `<strong style="color:#d9534f;">⚠️ Parcela paga com atraso</strong><br>`;
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
            mensagemInfo = `⚠️ Esta parcela está atrasada o valor minimo a ser pago deve ser o valor do juros + o valor da multa`;
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



// Adicione isso ao seu modal.js ou em um arquivo separado

document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM
  const cardsCidades = document.querySelectorAll('.card-cidade');
  const listaEmprestimosDiv = document.getElementById('listaEmprestimosCidade');
  const nomeCidadeSpan = document.getElementById('nomeCidadeSelecionada');
  const resultadoFiltrado = document.getElementById('resultadoFiltrado');
  const inputDataFiltro = document.getElementById('inputDataFiltro');
  const btnFiltrarData = document.getElementById('btnFiltrarData');
  const btnHojeFiltro = document.getElementById('btnHojeFiltro');
  const btnLimparFiltro = document.getElementById('btnLimparFiltro');
  const filtroMes = document.getElementById('filtroMes');
  
  let emprestimosPorCidade = {
    'Cotia': [],
    'Sorocaba': [],
    'São Roque': []
  };
  let cidadeSelecionada = null;



  filtroMes.addEventListener('change', () => {
  const mesSelecionado = filtroMes.value; // formato YYYY-MM
  inputDataFiltro.value = ''; // limpa o filtro por dia
  filtrarEmprestimosPorMes(mesSelecionado);
});


function filtrarEmprestimosPorMes(mesAno) {
  if (!cidadeSelecionada || !emprestimosPorCidade[cidadeSelecionada]) return;

  resultadoFiltrado.innerHTML = '';

  const emprestimosFiltrados = emprestimosPorCidade[cidadeSelecionada].filter(emp => {
    if (!emp.datasVencimentos) return false;
    return emp.datasVencimentos.some(d => getMesAnoFromDate(d) === mesAno);
  });

  if (emprestimosFiltrados.length === 0) {
    resultadoFiltrado.innerHTML = '<li class="sem-resultados">Nenhum empréstimo encontrado</li>';
    atualizarTotaisResumo(); // zera totais
    return;
  }

  // Reutiliza a função original de renderizar a lista
  renderizarListaEmprestimos(emprestimosFiltrados, mesAno);
}



function renderizarListaEmprestimos(emprestimosFiltrados, mesAnoFiltro = null) {
  resultadoFiltrado.innerHTML = '';

  emprestimosFiltrados.forEach(emp => {
    const li = document.createElement('li');
    li.className = 'emprestimo-item';

    const parcelas = (emp.datasVencimentos || [])
      .map((data, i) => {
        const diasAtraso = calcularDiasAtrasoDataOnly(data);
        const multa = diasAtraso > 0 && !emp.statusParcelas?.[i] ? diasAtraso * 20 : 0;
        const valorJuros = emp.valorComJuros - emp.valorOriginal;
        const valorMinimo = valorJuros + multa;

        return {
          data,
          pago: emp.statusParcelas?.[i] || false,
          indice: i,
          valorJuros,
          multa,
          valorMinimo
        };
      })
      .filter(p => {
        if (inputDataFiltro.value) {
          return normalizarData(p.data) === inputDataFiltro.value;
        } else if (mesAnoFiltro) {
          return getMesAnoFromDate(p.data) === mesAnoFiltro;
        } else {
          return true;
        }
      });

    // Renderiza HTML das parcelas (mesma lógica que você já tem)
    let htmlParcelas = '';
    parcelas.forEach(p => {
      if (p.pago) {
        htmlParcelas += `<div class="parcela-linha paga"> ... </div>`;
      } else {
        htmlParcelas += `<div class="parcela-linha pendente"> ... </div>`;
      }
    });

    li.innerHTML = `
      <div class="emprestimo-header" data-id="${emp.id}">
        <h3>${emp.nome}</h3>
        <div class="emprestimo-total">
          Total: ${formatarMoeda(emp.valorComJuros)} | Parcelas: ${emp.parcelas}
        </div>
      </div>
      <div class="parcelas-container">
        ${htmlParcelas || '<div class="sem-parcelas">Nenhuma parcela encontrada</div>'}
      </div>
    `;

    li.querySelector('.emprestimo-header').addEventListener('click', () => abrirModal(emp));
    resultadoFiltrado.appendChild(li);
  });

  atualizarTotaisResumo();
}


  // Carrega os empréstimos por cidade
  async function carregarEmprestimosPorCidade() {
    try {
      console.log('Carregando empréstimos...');
      const response = await fetch(`${URL_SERVICO}/emprestimos`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const todosEmprestimos = await response.json();
      console.log('Dados recebidos:', todosEmprestimos);
      
      // Reinicia os arrays
      emprestimosPorCidade = {
        'Cotia': [],
        'Sorocaba': [],
        'São Roque': []
      };
      
      // Organiza por cidade
      todosEmprestimos.forEach(emp => {
        if (emp.cidade && emprestimosPorCidade[emp.cidade]) {
          emprestimosPorCidade[emp.cidade].push(emp);
        }
      });
      
      console.log('Empréstimos por cidade:', emprestimosPorCidade);
      atualizarContadoresCards();
      
    } catch (error) {
      console.error('Erro ao carregar empréstimos:', error);
      mostrarAlertaError('Erro ao carregar empréstimos. Tente recarregar a página.');
    }
  }
  
  // Atualiza os contadores nos cards
  function atualizarContadoresCards() {
    cardsCidades.forEach(card => {
      const cidade = card.dataset.cidade;
      const qtdSpan = card.querySelector('.qtd-emprestimos');
      qtdSpan.textContent = emprestimosPorCidade[cidade]?.length || 0;
    });
  }
  
  // Mostra a lista de empréstimos para uma cidade
  function mostrarEmprestimosCidade(cidade) {
    console.log(`Mostrando empréstimos para ${cidade}`);
    cidadeSelecionada = cidade;
    nomeCidadeSpan.textContent = cidade;
    listaEmprestimosDiv.style.display = 'block';
    
    // Filtra por data se houver
    const dataFiltro = inputDataFiltro.value;
    filtrarEmprestimos(dataFiltro);
  }

async function marcarParcelaComoPaga(emprestimoId, indiceParcela, valorRecebido, nomeRecebedor) {
  try {
    const response = await fetch(`${URL_SERVICO}/emprestimos/${emprestimoId}/parcela/${indiceParcela}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataPagamento: new Date().toISOString(),
        nomeRecebedor,
        valorRecebido
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao marcar parcela: ${await response.text()}`);
    }

    // Atualiza localmente
    const emprestimo = Object.values(emprestimosPorCidade)
      .flat()
      .find(e => e.id === emprestimoId);
    
    if (emprestimo) {
      if (!emprestimo.statusParcelas) emprestimo.statusParcelas = [];
      if (!emprestimo.recebidoPor) emprestimo.recebidoPor = [];
      if (!emprestimo.valoresRecebidos) emprestimo.valoresRecebidos = [];
      if (!emprestimo.datasPagamentos) emprestimo.datasPagamentos = [];
      
      emprestimo.statusParcelas[indiceParcela] = true;
      emprestimo.recebidoPor[indiceParcela] = nomeRecebedor;
      emprestimo.valoresRecebidos[indiceParcela] = valorRecebido;
      emprestimo.datasPagamentos[indiceParcela] = new Date().toISOString();
    }

    return true;
  } catch (error) {
    console.error('Erro ao marcar parcela como paga:', error);
    return false;
  }
}


//   // Se vier em Date ou ISO
//   const d = new Date(data);
//   const ano = d.getUTCFullYear();  // <-- usa UTC
//   const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
//   const dia = String(d.getUTCDate()).padStart(2, "0");
//   return `${ano}-${mes}-${dia}`;
// }

function eVencimentoHoje(dataVencimento) {
  try {
    const hoje = hojeLocalISO(); // Formato YYYY-MM-DD
    const vencimento = normalizarData(dataVencimento); // Formato YYYY-MM-DD
    return hoje === vencimento;
  } catch (e) {
    console.error('Erro ao verificar vencimento:', e);
    return false;
  }
}



function atualizarTotaisResumo(parcelasFiltradas = []) {
  let totalRecebido = 0;
  let totalPrevisto = 0;

  parcelasFiltradas.forEach(p => {
    totalPrevisto += p.valorMinimo;
    if (p.pago && p.valorRecebido) totalRecebido += p.valorRecebido;
  });

  const totaisContainer = document.getElementById('totaisResumo');
  totaisContainer.innerHTML = `
    <div class="totais-card recebido">
      <span class="titulo">Total Recebido</span>
      <span class="valor">${formatarMoeda(totalRecebido)}</span>
    </div>
    <div class="totais-card previsto">
      <span class="titulo">Total Previsto</span>
      <span class="valor">${formatarMoeda(totalPrevisto)}</span>
    </div>
  `;
}


// Funções auxiliares adicionais necessárias
function getMesAnoAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}


function getMesAnoFromDate(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}



function calcularValorMinimoParcela(emprestimo, indiceParcela) {
  // O valor da parcela SEMPRE será o valor total dos juros (não divide pelo número de parcelas)
  const valorJurosTotal = emprestimo.valorComJuros - emprestimo.valorOriginal;
  
  let multa = 0;

  // Verifica se há atraso e calcula a multa (R$ 20/dia)
  if (emprestimo.datasVencimentos?.[indiceParcela]) {
    const diasAtraso = calcularDiasAtraso(emprestimo.datasVencimentos[indiceParcela]);
    multa = diasAtraso > 0 ? diasAtraso * 20 : 0;
  }

  // Retorna o valor mínimo da parcela: JUROS TOTAL + MULTA (se houver)
  return valorJurosTotal + multa;
}
  // Event listeners
  cardsCidades.forEach(card => {
    card.addEventListener('click', () => {
      const cidade = card.dataset.cidade;
      mostrarEmprestimosCidade(cidade);
    });
  });

function filtrarEmprestimos({ dataFiltro = '', mesFiltro = '' } = {}) {
  resultadoFiltrado.innerHTML = '';

  if (!cidadeSelecionada || !emprestimosPorCidade[cidadeSelecionada]) return;

  const mesAnoAtual = (!dataFiltro && !mesFiltro) ? getMesAnoAtual() : mesFiltro;

  const emprestimosFiltrados = emprestimosPorCidade[cidadeSelecionada].filter(emp => {
    if (!emp.datasVencimentos) return false;

    if (dataFiltro) {
      return emp.datasVencimentos.some(d => normalizarData(d) === dataFiltro);
    } else {
      return emp.datasVencimentos.some(d => getMesAnoFromDate(d) === mesAnoAtual);
    }
  });

  if (emprestimosFiltrados.length === 0) {
    resultadoFiltrado.innerHTML = '<li class="sem-resultados">Nenhum empréstimo encontrado</li>';
    atualizarTotaisResumo([]); // passa array vazio para zerar totais
    return;
  }

  // Array que vai acumular apenas as parcelas filtradas, para cálculo de totais
  let parcelasParaTotais = [];

  emprestimosFiltrados.forEach((emp, i) => {
    const li = document.createElement('li');
    li.className = 'emprestimo-item';

    // Filtra parcelas conforme dia ou mês e status
    const parcelas = (emp.datasVencimentos || []).map((data, i) => {
      const diasAtraso = calcularDiasAtrasoDataOnly(data);
      const multa = diasAtraso > 0 && !emp.statusParcelas?.[i] ? diasAtraso * 20 : 0;
      const valorJuros = emp.valorComJuros - emp.valorOriginal;
      const valorMinimo = valorJuros + multa;

      return {
        data,
        pago: emp.statusParcelas?.[i] || false,
        indice: i,
        valorJuros,
        multa,
        valorMinimo,
        valorRecebido: emp.valoresRecebidos?.[i] || 0
      };
    }).filter(p => {
      // Filtro por dia
      if (dataFiltro && normalizarData(p.data) !== dataFiltro) return false;

      // Filtro por mês
      if (mesAnoAtual && getMesAnoFromDate(p.data) !== mesAnoAtual) return false;

      // Filtro por status (bolinhas)
      if (filtroStatus) {
        switch (filtroStatus) {
          case 'pago':
            if (!p.pago) return false;
            break;
          case 'em-dia':
            if (p.pago || p.multa > 0 || eVencimentoHoje(p.data)) return false;
            break;
          case 'vencendo-hoje':
            if (p.pago || !eVencimentoHoje(p.data)) return false;
            break;
          case 'atrasado':
            if (p.pago || p.multa === 0) return false;
            break;
        }
      }

      return true;
    });

    // Se não houver nenhuma parcela correspondente, não renderiza o empréstimo
    if (parcelas.length === 0) return;

    // Acumula para cálculo de totais
    parcelasParaTotais.push(...parcelas);

    // Renderiza HTML das parcelas (mantendo sua lógica original)
    let htmlParcelas = '';
    parcelas.forEach(p => {
      const dataFormatada = toBR(p.data);

      if (p.pago) {
        htmlParcelas += `
          <div class="parcela-linha paga">
            <span class="parcela-data"><strong>Parcela ${p.indice + 1} - ${dataFormatada}</strong></span>
            <span class="parcela-valor"><strong>${formatarMoeda(p.valorJuros)}</strong> | <span style="color: #074e07; font-weight: bold;">PAGO</span></span>
          </div>
        `;
      } else {
        htmlParcelas += `
          <div class="parcela-linha 
            ${p.multa > 0 ? 'atrasada' : eVencimentoHoje(p.data) ? 'vencendo-hoje' : 'pendente'}">
            <div class="parcela-info">
              <span class="parcela-data"><strong>Parcela ${p.indice + 1} - ${dataFormatada}</strong></span>
              <span class="parcela-valor"><strong>${formatarMoeda(p.valorJuros)}</strong></span>
              ${p.multa > 0 ? `<span class="parcela-multa"><strong> - Multa: ${formatarMoeda(p.multa)}</strong></span>
              <span class="parcela-atraso"><strong>(${p.multa/20} dias atraso)</strong></span>` : ''}
            </div>
            <label class="parcela-checkbox">
              <input 
                type="checkbox"
                data-id="${emp.id}" 
                data-indice="${p.indice}"
                data-valor="${p.valorMinimo}"
                class="parcela-pendente"
              />
              <span class="checkmark"></span>
              <span class="pagar-label">MARCAR</span>
            </label>
          </div>`;
      }
    });

    li.innerHTML = `
      <div class="emprestimo-header" data-id="${emp.id}">
        <h3>${emp.nome}</h3>
        <div class="emprestimo-total">
          Total: ${formatarMoeda(emp.valorComJuros)} | Parcelas: ${emp.parcelas}
        </div>
      </div>
      <div class="parcelas-container">
        ${htmlParcelas || '<div class="sem-parcelas">Nenhuma parcela encontrada</div>'}
      </div>
    `;

    li.querySelector('.emprestimo-header').addEventListener('click', () => abrirModal(emp));

    // Checkbox
    li.querySelectorAll('input.parcela-pendente').forEach(chk => {
      chk.addEventListener('change', async function() {
        if (this.checked) {
          const indice = parseInt(this.dataset.indice, 10);
          const valorMinimo = calcularValorMinimoParcela(emp, indice);

          parcelaSelecionada = { emprestimo: emp, indice, checkbox: chk, valorMinimo };

          document.getElementById('valorRecebido').value = valorMinimo.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          });

          mostrarModalRecebedor();

          const ok = await marcarParcelaComoPaga(emp.id, indice, valorMinimo, "Recebedor");
          if (ok) {
            filtrarEmprestimos({ dataFiltro, mesFiltro }); // re-renderiza a lista e totais
          }
        }
      });
    });

    resultadoFiltrado.appendChild(li);
          // Adiciona classe "mostrar" com delay mínimo para disparar a transição
      setTimeout(() => {
        li.classList.add('mostrar');
      }, i * 25);
  });

  // Atualiza totais apenas com parcelas filtradas
  atualizarTotaisResumo(parcelasParaTotais);
}


const bolinhasLegenda = document.querySelectorAll('.bolinha-legenda');
let filtroStatus = null;

bolinhasLegenda.forEach(bolinha => {
  bolinha.addEventListener('click', () => {
    const status = bolinha.dataset.status;

    if (filtroStatus === status) {
      // Desativa o filtro
      filtroStatus = null;
      bolinhasLegenda.forEach(b => b.classList.remove('selecionada'));
    } else {
      // Ativa o filtro
      filtroStatus = status;
      bolinhasLegenda.forEach(b => b.classList.remove('selecionada'));
      bolinha.classList.add('selecionada');
    }

    // Refiltra a lista
    filtrarEmprestimos({
      dataFiltro: inputDataFiltro.value,
      mesFiltro: filtroMes.value
    });
  });
});


  






  
btnFiltrarData.addEventListener('click', () => {
  filtrarEmprestimos({ dataFiltro: inputDataFiltro.value });
});

filtroMes.addEventListener('change', () => {
  filtrarEmprestimos({ mesFiltro: filtroMes.value });
  inputDataFiltro.value = ''; // limpa o filtro por dia
});


btnHojeFiltro.addEventListener('click', () => {
  const hoje = hojeLocalISO();
  inputDataFiltro.value = hoje;
  filtroMes.value = '';
  filtrarEmprestimos({ dataFiltro: hoje });
});
  
btnLimparFiltro.addEventListener('click', () => {
  inputDataFiltro.value = '';
  filtroMes.value = '';
  
  // Limpa filtro das bolinhas
  filtroStatus = null;
  document.querySelectorAll('.bolinha-legenda').forEach(b => b.classList.remove('selecionada', 'ativa'));
  
  // Refiltra a lista
  filtrarEmprestimos();
});

  
  // Carrega os dados inicialmente
  carregarEmprestimosPorCidade();


document.getElementById('btnExportarPDF').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Cabeçalho ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Relatório de Empréstimos - ${cidadeSelecionada}`, 14, 20);

  // Linha separadora mais espessa para o cabeçalho
  doc.setLineWidth(0.8);
  doc.line(14, 22, 196, 22);

  // --- Totais ---
  const totaisTexto = document.getElementById('totaisResumo').innerText.split("\n");

  // Total Recebido
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 128, 0); // verde
  doc.text(`Total Recebido: ${totaisTexto[1]}`, 14, 32);

  // Total Previsto
  doc.setTextColor(0, 0, 128); // azul
  doc.text(`Total Previsto: ${totaisTexto[3]}`, 14, 40);

  // Linha separadora antes da tabela
  doc.setLineWidth(0.3);
  doc.line(14, 42, 196, 42);
  doc.setTextColor(0, 0, 0);

  // Monta os dados da tabela
  const rows = [];
  const itens = document.querySelectorAll('#resultadoFiltrado .emprestimo-item');

  itens.forEach(item => {
    const nome = item.querySelector('.emprestimo-header h3')?.innerText || '';
    
    const parcelas = item.querySelectorAll('.parcelas-container .parcela-linha');

      parcelas.forEach(parcela => {
        const parcelaTexto = parcela.querySelector('.parcela-data')?.innerText || '';
        const valorCompleto = parcela.querySelector('.parcela-valor')?.innerText || '';
        const valor = valorCompleto.split('|')[0].trim(); // <-- Aqui está a modificação
        
        const parcelaNumMatch = parcelaTexto.match(/Parcela (\d+)/);
        const parcelaNum = parcelaNumMatch ? parcelaNumMatch[1] : '';

        let dia = '';
        const dataMatch = parcelaTexto.match(/\d{2}\/\d{2}\/\d{4}/);
        if (dataMatch) dia = dataMatch[0].split('/')[0];

        let statusFinal = '';
        if (parcela.classList.contains('paga')) {
          statusFinal = 'PAGO';
        } else if (parcela.classList.contains('vencendo-hoje')) {
          statusFinal = 'VENCE HOJE';
        } else if (parcela.classList.contains('atrasada')) {
          const multa = parcela.querySelector('.parcela-multa')?.innerText || '';
          const dias = parcela.querySelector('.parcela-atraso')?.innerText || '';
          statusFinal = `ATRASADO (${multa} ${dias})`;
        } else {
          statusFinal = 'A RECEBER';
        }

        rows.push([dia, parcelaNum, nome, valor, statusFinal]);
      });
  });

  // Cria a tabela com melhor visualização
 // Substitua a parte do autoTable por esta versão corrigida:
doc.autoTable({
    head: [['Dia', 'Parcela', 'Cliente', 'Valor (R$)', 'Status']],
    body: rows,
    startY: 45,
    styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        lineColor: [200, 200, 200],
        lineWidth: 0.2,
    },
    headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.3
    },
    alternateRowStyles: {
        fillColor: [245, 245, 245]
    },
    columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 50 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 60 }
    },
    didParseCell: function(data) {
        // Verifica se não é a primeira linha e se há mudança de cliente
        if (data.section === 'body' && data.row.index > 0 && 
            data.previousRow && data.row.cells[2].raw !== data.previousRow.cells[2].raw) {
            data.row.styles.lineWidth = 0.5;
        }
    },
    willDrawCell: function(data) {
        // Alternativa que também funciona para destacar mudanças de cliente
        if (data.section === 'body' && data.column.index === 0) {
            if (data.row.index > 0 && data.cell.raw !== data.table.body[data.row.index-1][2]) {
                doc.setLineWidth(0.5);
                doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
                doc.setLineWidth(0.2);
            }
        }
    }
});
  doc.save(`relatorio_${cidadeSelecionada}.pdf`);
});



  });







