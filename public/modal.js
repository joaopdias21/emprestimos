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
  const partes = dataStr.split('-'); // supondo formato YYYY-MM-DD
  const vencimento = new Date(
    parseInt(partes[0]), 
    parseInt(partes[1]) - 1, 
    parseInt(partes[2])
  );

  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  vencimento.setHours(0,0,0,0);

  const diff = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
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
  fecharModalRecebedor(); // <-- Fecha e desmarca checkbox
  atualizarVisualParcelas?.(emprestimoSelecionado);
});


// Função para verificar se há atraso e calcular multa
function verificarAtrasoEPreencherValor(emprestimo, indiceParcela) {
  const isParcelado = emprestimo.tipoParcelamento === 'parcelado';
  
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
  infoDiv.style.backgroundColor = '#fff8e1';
  infoDiv.style.borderRadius = '6px';
  infoDiv.style.borderLeft = '4px solid #ffa000';
  infoDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

  // ✅ CORREÇÃO: Usa o valor dinâmico da parcela
  const valorJurosTotal = (emprestimo.valorComJuros || 0) - (emprestimo.valorOriginal || 0);
  const valorBase = emprestimo.valorParcelasPendentes?.[indiceParcela] || valorJurosTotal;
  
  let valorMinimo = valorBase;
  let multa = 0;
  let mensagemInfo = `<div style="margin-bottom: 8px;"><strong>Valor ${isParcelado ? 'da parcela' : 'mínimo (juros)'}:</strong> ${formatarMoeda(valorMinimo)}</div>`;

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
          <strong>Valor ${isParcelado ? 'da parcela' : 'do juros'}:</strong> ${formatarMoeda(valorBase)}
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
    const modalConteudo = document.querySelector('.modal-conteudo');
    if (modalConteudo) {
      modalConteudo.appendChild(infoDiv);
    }
  }

  return { valorMinimo, multa };
}

modalRecebedor.addEventListener('click', (e) => {
  if (e.target === modalRecebedor) {
    fecharModalRecebedor(); // fechar clicando fora
  }
});


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
  
  let valorRecebido;
  if (parcelaSelecionada.valor) {
    valorRecebido = parcelaSelecionada.valor;
  } else {
    const valorRecebidoRaw = document.getElementById('valorRecebido').value;
    const valorLimpoString = valorRecebidoRaw.replace(/\D/g, '');
    valorRecebido = parseFloat(valorLimpoString) / 100;
  }

  if (isNaN(valorRecebido) || valorRecebido <= 0) {
    mostrarAlertaWarning('Informe um valor válido para o pagamento.');
    return;
  }

  // 🔹 Agora NÃO bloqueamos valores menores que o mínimo.
  // O backend vai calcular quanto falta.
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

    if (!emprestimo.statusParcelas) emprestimo.statusParcelas = [];
    if (!emprestimo.datasPagamentos) emprestimo.datasPagamentos = [];
    if (!emprestimo.recebidoPor) emprestimo.recebidoPor = [];
    if (!emprestimo.valoresRecebidos) emprestimo.valoresRecebidos = [];

    // ❌ Removemos esta parte, pq o backend já decide se está pago ou parcial:
    // emprestimo.statusParcelas[indice] = true;
    // emprestimo.datasPagamentos[indice] = dataPagamento;
    // emprestimo.recebidoPor[indice] = nome;
    // emprestimo.valoresRecebidos[indice] = valorRecebido;

    // 🔹 Só marcamos o checkbox se o backend disser que está quitada
    if (checkbox) {
      if (emprestimo.statusParcelas[indice]) {
        checkbox.checked = true;
        checkbox.disabled = true;
      } else {
        checkbox.checked = false; // ainda falta parte do valor
      }
    }

    // Atualiza UI
    if (document.getElementById('listaEmprestimosCidade').style.display !== 'none') {
      const cidadeAtual = cidadeSelecionada;
      if (cidadeAtual) {
        await carregarEmprestimosPorCidade();
        mostrarEmprestimosCidade(cidadeAtual);
      }
    }

    if (modal.style.display === 'flex') {
      atualizarVisualParcelas(emprestimo);
      atualizarValorRestante(emprestimo);
    }

    // Mensagem adaptada
    if (emprestimo.statusParcelas[indice]) {
      mostrarAlerta(`Parcela ${indice + 1} quitada por ${nome}`);
    } else {
      mostrarAlerta(`Parcela ${indice + 1} recebeu pagamento parcial de ${formatarMoeda(valorRecebido)} por ${nome}`);
    }

  } catch (err) {
    console.error('Erro ao marcar parcela como paga:', err);
    if (checkbox) {
      checkbox.checked = false;
    }
    mostrarAlertaError(`Erro ao registrar pagamento: ${err.message}`);
  }

  fecharModalRecebedor();
});



function mostrarModalRecebedor() {
  if (!modalRecebedor) {
    console.error("Modal do recebedor não encontrado no DOM");
    return;
  }

  // Garante que o input esteja limpo
  inputRecebedor.value = '';
  inputValorRecebido.value = '';

  // Exibe o modal
  modalRecebedor.style.display = 'flex';
}

function fecharModalRecebedor() {
  if (modalRecebedor) {
    modalRecebedor.style.display = 'none';
  }

  // 👉 Se tinha uma parcela selecionada e o usuário não confirmou, reseta o checkbox
  if (parcelaSelecionada?.checkbox) {
    parcelaSelecionada.checkbox.checked = false;
  }

  parcelaSelecionada = null; // limpa seleção
}



function atualizarValorRestante(emprestimoAtualizado) {
  if (!emprestimoAtualizado) return;

  const isParcelado = emprestimoAtualizado.tipoParcelamento === 'parcelado';
  const valorOriginal = emprestimoAtualizado.valorOriginal || 0;

  if (isParcelado) {
    // CÁLCULO PARA EMPRÉSTIMO PARCELADO
    const valorTotal = emprestimoAtualizado.valorComJuros || 0;
    let totalPago = 0;
    
    (emprestimoAtualizado.valoresRecebidos || []).forEach(val => {
      if (typeof val === 'number') {
        totalPago += val;
      }
    });
    
    const valorRestante = Math.max(0, valorTotal - totalPago);
    
    const container = document.getElementById('valorRestanteContainer');
    if (!container) return;

    container.innerHTML = `
      <hr>
      <br>
      <h3 style="margin-bottom: 10px;"><strong>🏦 Situação do Empréstimo Parcelado</strong></h3>
      <div style="margin-top: 10px; font-size: 1.05em;">
        <strong>Total pago:</strong> ${formatarMoeda(totalPago)}<br>
        <strong>Valor restante:</strong> ${formatarMoeda(valorRestante)}
      </div>
    `;
  } else {
    // CÁLCULO CORRIGIDO PARA EMPRÉSTIMO NÃO PARCELADO
    const valorJurosTotal = (emprestimoAtualizado.valorComJuros || 0) - valorOriginal;
    
    let totalMultas = 0;
    (emprestimoAtualizado.datasVencimentos || []).forEach((vencimento, i) => {
      if (!emprestimoAtualizado.statusParcelas?.[i] && vencimento) {
        const diasAtraso = calcularDiasAtraso(vencimento);
        if (diasAtraso > 0) {
          totalMultas += diasAtraso * 20;
        }
      }
    });

    let totalPagoValido = 0;
    let totalJurosRecebidos = 0;
    const parcelasComExcedente = [];
    const parcelasInfo = [];

    // CORREÇÃO: Calcular juros de cada parcela DINAMICAMENTE
    let saldoAtual = valorOriginal;
    
    (emprestimoAtualizado.valoresRecebidos || []).forEach((val, i) => {
      // CALCULAR JUROS DA PARCELA COM BASE NO SALDO ATUAL
      const taxaJuros = emprestimoAtualizado.taxaJuros || 20;
      const jurosParcela = saldoAtual * (taxaJuros / 100);
      
      const diasAtraso = calcularDiasAtraso(emprestimoAtualizado.datasVencimentos[i]);
      const multaParcela = diasAtraso * 20;
      const valorMinimoParcela = jurosParcela + multaParcela;

      // SOMA JUROS RECEBIDOS APENAS SE A PARCELA FOI PAGA
      if (emprestimoAtualizado.statusParcelas?.[i] && typeof val === 'number') {
        totalJurosRecebidos += jurosParcela;
      }

      // Armazena informações da parcela
      parcelasInfo.push({
        indice: i + 1,
        valorParcela: jurosParcela, // Usa o juros calculado, não o valor pendente
        valorMinimo: valorMinimoParcela,
        valorPago: val,
        multa: multaParcela,
        excedente: Math.max(0, val - valorMinimoParcela)
      });
      
      // Lógica para cálculo de excedente
      if (val > valorMinimoParcela) {
        const excedente = val - valorMinimoParcela;
        totalPagoValido += excedente;
        
        // ATUALIZA SALDO PARA PRÓXIMA PARCELA
        saldoAtual -= excedente;
        
        parcelasComExcedente.push({
          indice: i + 1,
          valorParcela: jurosParcela,
          valorPago: val,
          multa: multaParcela,
          excedente: excedente,
          valorMinimo: valorMinimoParcela
        });
      } else if (emprestimoAtualizado.statusParcelas?.[i]) {
        // Se pagou pelo menos o mínimo, mantém o saldo
        saldoAtual = saldoAtual;
      }
    });

    const valorRestantePrincipal = Math.max(0, valorOriginal - totalPagoValido);

    const container = document.getElementById('valorRestanteContainer');
    if (!container) return;

    const listaParcelasHTML = parcelasInfo.map(p => {
        const statusText = emprestimoAtualizado.statusParcelas?.[p.indice - 1] ? '✅ Paga' : '🔴 Pendente';
        const valorPagoDisplay = typeof p.valorPago === 'number' ? `(${formatarMoeda(p.valorPago)} pago)` : '';
        const multaDisplay = p.multa > 0 ? `<span style="color: #d9534f;">⚠️ Multa: ${formatarMoeda(p.multa)}</span><br>` : '';

        return `
            <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <strong>Parcela ${p.indice}: ${statusText}</strong>
                <span style="float: right;">${formatarMoeda(p.valorParcela)} ${valorPagoDisplay}</span><br>
                ${multaDisplay}
            </div>
        `;
    }).join('');

    const parcelasComExcedenteHTML = parcelasComExcedente.map(p => {
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
      <h3 style="margin-bottom: 10px;"><strong>📦 Resumo das Parcelas</strong></h3>
      ${listaParcelasHTML || '<p>Nenhuma parcela encontrada.</p>'}
      <br>
      <h3 style="margin-bottom: 10px;"><strong>🏦 Informações da quitação do empréstimo</strong></h3>
      ${parcelasComExcedenteHTML || '<p>Nenhuma parcela com pagamento acima do mínimo encontrada</p>'}
      <hr>
      <div style="margin-top: 10px; font-size: 1.05em;">
        <strong>Total excedente que abate do saldo:</strong> ${formatarMoeda(totalPagoValido)}
      </div>
      ${
        totalMultas > 0 ?
        `<div style="margin-top: 5px; color: #c52e28ff; font-weight: bold;">
          Multa total por atraso: +${formatarMoeda(totalMultas)}<br>
          Total a pagar: ${formatarMoeda(valorRestantePrincipal + totalMultas)}
        </div>` :
        `<div style="margin-top: 5px; font-weight: bold;">
          Valor restante do principal: ${formatarMoeda(valorRestantePrincipal)}
        </div>`
      }

      <div style="margin-top: 5px; color: #007bff; font-weight: bold;">
        💹 Juros recebidos: ${formatarMoeda(totalJurosRecebidos)}
      </div>

    `;
  }
}

export async function abrirModal(emprestimo) {
  scrollPos = window.scrollY || document.documentElement.scrollTop;
  document.body.classList.add('modal-aberto');
  document.body.style.top = `-${scrollPos}px`;

  emprestimoSelecionado = emprestimo;
  modal.style.display = 'flex';

  const taxa = typeof emprestimo.taxaJuros === 'number' ? emprestimo.taxaJuros : 0;
  const taxaFormatada = taxa.toFixed(0);
  
  const isParcelado = emprestimo.tipoParcelamento === 'parcelado';

  modalCorpo.innerHTML = `
    <div class="modal-layout">
      <div id="detalhesEmprestimo" class="detalhes-emprestimo" style="flex: 1;">
        <h3>📄 Dados do Empréstimo</h3>
        <div style="margin-bottom: 15px; padding: 8px; background-color: ${isParcelado ? '#e3f2fd' : '#f3e5f5'}; border-radius: 4px;">
          <strong>${isParcelado ? '📋 Empréstimo Parcelado' : '💰 Empréstimo com Juros'}</strong>
        </div>
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
        <div><strong>Parcelas:</strong> ${emprestimo.parcelas}x</div>
        ${isParcelado 
          ? `<div><strong>Valor da parcela:</strong> ${formatarMoeda(emprestimo.valorParcela)}</div>`
          : `<div><strong>Valor do juros (${taxaFormatada}%):</strong> ${formatarMoeda(emprestimo.valorComJuros - emprestimo.valorOriginal)}</div>`
        }

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

  const isParcelado = emprestimo.tipoParcelamento === 'parcelado';
  const parcelas = emprestimo.statusParcelas || Array(emprestimo.parcelas).fill(false);
  const datasPagamentos = emprestimo.datasPagamentos || Array(emprestimo.parcelas).fill(null);
  const recebidoPor = emprestimo.recebidoPor || Array(emprestimo.parcelas).fill(null);
  const datasVencimentos = emprestimo.datasVencimentos || [];

  // ✅ CORREÇÃO: CALCULA O VALOR BASE CORRETAMENTE
  let valorBase;
  if (isParcelado) {
    valorBase = emprestimo.valorParcela;
  } else {
    valorBase = (emprestimo.valorComJuros || 0) - (emprestimo.valorOriginal || 0);
  }

  parcelas.forEach((paga, i) => {
    const item = document.createElement('div');
    item.className = 'parcela-box';
    item.style = 'margin-bottom: 16px; display: flex; align-items: flex-start;';

    const label = document.createElement('label');
    label.style.lineHeight = '1.4';

    const isOperador = localStorage.getItem('isOperador') === 'true';
    let chk = null;

    // ✅ Só cria o checkbox se NÃO for operador
    if (!isOperador) {
      chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = paga;
      chk.disabled = paga;
      chk.style = 'margin-right: 10px; transform: scale(1.5); cursor: pointer; margin-top: 4px;';
    }

// Valor base da parcela
const valorParcelaCorrigido = emprestimo.valorParcelasPendentes?.[i] || valorBase;
const vencimento = datasVencimentos[i];
const venc = vencimento ? vencimento.split('-').reverse().join('/') : null;

// Valor já recebido
const valorRecebido = emprestimo.valoresRecebidos?.[i] || 0;

// Calcula multa se atrasada
let multa = 0;
if (vencimento && !paga) {
  const diasAtraso = calcularDiasAtraso(vencimento);
  if (diasAtraso > 0) {
    multa = diasAtraso * 20;
  }
}

// Total necessário para quitar (parcela + multa)
const valorTotalNecessario = valorParcelaCorrigido + multa;

// Quanto ainda falta
const valorFaltante = Math.max(0, valorTotalNecessario - valorRecebido);

// Monta HTML inicial
let html = `<strong>📦 Parcela ${i + 1}:</strong> ${formatarMoeda(valorParcelaCorrigido)}<br>`;
if (venc) html += `<strong>📅 Vencimento:</strong> ${venc}<br>`;

// Situação da parcela
let statusClass = 'parcela-em-dia';

// Mostra se já pagou algo
if (valorRecebido > 0) {
  html += `<strong>💵 Pago até agora:</strong> ${formatarMoeda(valorRecebido)}<br>`;
}

// Mostra valor pendente (se tiver)
if (valorFaltante > 0) {
  html += `<strong style="color:orange;">⏳ Valor pendente:</strong> ${formatarMoeda(valorFaltante)}<br>`;
}

// Verifica atrasos
if (vencimento && !paga) {
  const diasAtraso = calcularDiasAtraso(vencimento);
  if (diasAtraso > 0) {
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


    // Se já foi paga
    if (paga && datasPagamentos[i]) {
      const data = new Date(datasPagamentos[i]).toLocaleDateString('pt-BR');
      const horario = new Date(datasPagamentos[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const recebedor = recebidoPor[i] || 'N/A';
      const valorRecebido = emprestimo.valoresRecebidos?.[i];
      
      html += `<strong>✅ Paga em:</strong> ${data}<br>`;
      html += `<strong>🙍‍♂️ Recebido por:</strong> ${recebedor} às ${horario}<br>`;
      
      if (valorRecebido != null) {
        html += `<strong>💵 Valor Recebido:</strong> ${formatarMoeda(valorRecebido)}<br>`;
      }
      
      if (vencimento && datasPagamentos[i]) {
        const dataPag = new Date(datasPagamentos[i]);
        const dataVenc = criarDataLocal(vencimento);

        dataPag.setHours(0, 0, 0, 0);
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
    }

    label.innerHTML = html;

    // Evento só se não for operador
    if (chk) {
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

          inputRecebedor.value = '';
          inputRecebedor.disabled = false;
          inputRecebedor.focus();

          let valorMinimo = valorParcelaCorrigido;
          let mensagemInfo = '';

          if (emprestimo.datasVencimentos?.[i]) {
            const vencimento = new Date(emprestimo.datasVencimentos[i]);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            vencimento.setHours(0, 0, 0, 0);

            if (hoje > vencimento) {
              const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
              const multa = diasAtraso * 20;
              valorMinimo = valorParcelaCorrigido + multa;
              mensagemInfo = `⚠️ Esta parcela está atrasada. O valor mínimo a ser pago deve ser ${formatarMoeda(valorParcelaCorrigido)} + ${formatarMoeda(multa)} de multa`;
            }
          }

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

          document.getElementById('valorRecebido').value = '';
        }
      });
    }

    // ✅ Monta o item final
    if (chk) item.appendChild(chk); // só adiciona o checkbox se for admin
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
  

  const gruposMensais = {
  "Mensal 1": ["Cotia", "Itapevi", "Jandira", "São Paulo"],
  "Mensal 2": ["São Roque", "Alumínio", "Mairinque", "Araçariguama"],
  "Mensal 3": ["Sorocaba", "Itu", "Tatuí", "Porto Feliz", "Salto de Pirapora", "Boituva"],
  "Mensal 4": ["Santos", "Guarujá", "São Vicente", "Praia Grande", "Bertioga", "Cubatão", "Mongaguá", "Itanhaém", "Peruíbe"]

};

let emprestimosPorCidade = {};
let emprestimosPorGrupo = {
  "Mensal 1": [],
  "Mensal 2": [],
  "Mensal 3": [],
  "Mensal 4": []
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
    resultadoFiltrado.innerHTML =         `<li class="mensagem-vazia">
          <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
          <p>Nenhum empréstimo encontrado</p>
        </li>`;
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

// calcula taxa de juros (caso não exista em emp)
const taxaPercentual = emp.taxaJuros !== undefined 
  ? emp.taxaJuros 
  : (((emp.valorComJuros / emp.valorOriginal) - 1) * 100).toFixed(1);

li.innerHTML = `
  <div class="emprestimo-header" data-id="${emp.id}">
    <h3>${emp.nome}</h3>
    <div class="emprestimo-total">
      Total: ${formatarMoeda(emp.valorComJuros)} | 
      Parcelas: ${emp.parcelas} | 
      Juros: ${taxaPercentual}%
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
      emprestimosPorCidade = {};
      emprestimosPorGrupo = {
        "Mensal 1": [],
        "Mensal 2": [],
        "Mensal 3": [],
        "Mensal 4": []
      };


      // Organiza por cidade
// Reinicia os arrays
emprestimosPorCidade = {};
emprestimosPorGrupo = {
  "Mensal 1": [],
  "Mensal 2": [],
  "Mensal 3": [],
  "Mensal 4": []
};

// Organiza por cidade e grupo
todosEmprestimos.forEach(emp => {
  if (emp.cidade) {
    // Guarda por cidade
    if (!emprestimosPorCidade[emp.cidade]) {
      emprestimosPorCidade[emp.cidade] = [];
    }
    emprestimosPorCidade[emp.cidade].push(emp);

    // Descobre a qual grupo pertence
    for (let grupo in gruposMensais) {
      if (gruposMensais[grupo].includes(emp.cidade)) {
        emprestimosPorGrupo[grupo].push(emp);
      }
    }
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
    const grupo = card.dataset.grupo;
    const qtdSpan = card.querySelector('.qtd-emprestimos');
    qtdSpan.textContent = emprestimosPorGrupo[grupo]?.length || 0;
  });
}

  
  // Mostra a lista de empréstimos para uma cidade
function mostrarEmprestimosGrupo(grupo) {
  console.log(`Mostrando empréstimos para ${grupo}`);
  cidadeSelecionada = grupo; // agora usamos o nome do grupo
  nomeCidadeSpan.textContent = grupo;
  listaEmprestimosDiv.style.display = 'block';

  const dataFiltro = inputDataFiltro.value;
  filtrarEmprestimos({ dataFiltro, mesFiltro: filtroMes.value });
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
  let totalRecebido = 0;   // só valor mínimo das parcelas pagas
  let totalPrevisto = 0;   // só valor mínimo das parcelas previstas
  let valorExcedente = 0;  // multas não pagas + pagamento acima do mínimo

  parcelasFiltradas.forEach(p => {
    // Pega sempre o valor corrigido se existir
    const valorBase = p.valorParcelaCorrigido ?? p.valorParcela ?? 0;

    // Total previsto: apenas o valor mínimo da parcela
    totalPrevisto += valorBase;
    if (p.pago) totalRecebido += valorBase;

    // valor excedente: multa + pagamento acima do valorBase
    if (p.pago && p.valorRecebido > valorBase) {
      valorExcedente += (p.valorRecebido - valorBase);
    }
    if (p.multa && (!p.pagoMulta || p.pagoMulta === false)) {
      valorExcedente += p.multa;
    }
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
    <div class="totais-card excedente">
      <span class="titulo">Valor Excedente</span>
      <span class="valor">${formatarMoeda(valorExcedente)}</span>
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
  const isParcelado = emprestimo.tipoParcelamento === 'parcelado';
  
  // ✅ CORREÇÃO: Define o valor base conforme o tipo de empréstimo
  let valorBase;
  if (isParcelado) {
    valorBase = emprestimo.valorParcela; // Valor da parcela (valorComJuros / parcelas)
  } else {
    valorBase = emprestimo.valorComJuros - emprestimo.valorOriginal; // Apenas juros
  }
  
  let multa = 0;

  // Verifica se há atraso e calcula a multa (R$ 20/dia)
  if (emprestimo.datasVencimentos?.[indiceParcela]) {
    const diasAtraso = calcularDiasAtraso(emprestimo.datasVencimentos[indiceParcela]);
    multa = diasAtraso > 0 ? diasAtraso * 20 : 0;
  }

  // Retorna o valor mínimo da parcela
  return valorBase + multa;
}
  // Event listeners
cardsCidades.forEach(card => {
  card.addEventListener('click', () => {
    const grupo = card.dataset.grupo;
    mostrarEmprestimosGrupo(grupo);
  });
});


let parcelasFiltradas = []; // variável global para usar no PDF

function filtrarEmprestimos({ dataFiltro = '', mesFiltro = '' } = {}) {
  resultadoFiltrado.innerHTML = '';

  if (!cidadeSelecionada) return;

  let emprestimosBase = [];

  if (emprestimosPorGrupo[cidadeSelecionada]) {
    emprestimosBase = emprestimosPorGrupo[cidadeSelecionada];
  } else if (emprestimosPorCidade[cidadeSelecionada]) {
    emprestimosBase = emprestimosPorCidade[cidadeSelecionada];
  } else {
    return;
  }

  const mesAnoAtual = (!dataFiltro && !mesFiltro) ? getMesAnoAtual() : mesFiltro;

  const emprestimosFiltrados = emprestimosBase.filter(emp => {
    if (!emp.datasVencimentos) return false;
    if (dataFiltro) {
      return emp.datasVencimentos.some(d => normalizarData(d) === dataFiltro);
    } else {
      return emp.datasVencimentos.some(d => getMesAnoFromDate(d) === mesAnoAtual);
    }
  });

  if (emprestimosFiltrados.length === 0) {
    resultadoFiltrado.innerHTML =  `<li class="mensagem-vazia">
          <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
          <p>Nenhum empréstimo encontrado</p>
        </li>`;
    atualizarTotaisResumo([]);
    parcelasFiltradas = [];
    return;
  }

  parcelasFiltradas = []; // Reinicia o array de parcelas

  emprestimosFiltrados.forEach(emp => {
            const parcelas = (emp.datasVencimentos || []).map((data, idx) => {
          const diasAtraso = calcularDiasAtrasoDataOnly(data);
          const pago = emp.statusParcelas?.[idx] || false;

          const valorJuros = emp.valorComJuros - emp.valorOriginal;
          let multa = 0;

          if (diasAtraso > 0) {
            if (!pago) {
              multa = diasAtraso * 20;
            } else {
              const valorPago = emp.valoresRecebidos?.[idx] || 0;
              multa = Math.max(0, valorPago - (emp.valorParcela || valorJuros));
            }
          }

          // ✅ valor dinâmico corrigido
          const valorParcelaCorrigido = emp.valorParcelasPendentes?.[idx] || emp.valorParcela || valorJuros;

          return {
            data,
            pago,
            indice: idx,
            valorJuros,
            multa,
            diasAtraso,
            valorParcelaCorrigido,   // <-- agora salvo o valor certo
            valorRecebido: emp.valoresRecebidos?.[idx] || 0,
            emprestimoNome: emp.nome,
            telefone: emp.telefone,
            taxaJuros: emp.taxaJuros,
            emprestimoId: emp.id
          };
        }).filter(p => {
      if (dataFiltro && normalizarData(p.data) !== dataFiltro) return false;
      if (mesAnoAtual && getMesAnoFromDate(p.data) !== mesAnoAtual) return false;
      if (filtroStatus) {
        switch (filtroStatus) {
          case 'pago': if (!p.pago) return false; break;
          case 'em-dia': if (p.pago || p.multa > 0 || eVencimentoHoje(p.data)) return false; break;
          case 'vencendo-hoje': if (p.pago || !eVencimentoHoje(p.data)) return false; break;
          case 'atrasado': if (p.pago || p.multa === 0) return false; break;
        }
      }
      return true;
    });

    if (parcelas.length > 0) {
      parcelasFiltradas.push(...parcelas);
    }
  });

  parcelasFiltradas.sort((a, b) => {
    const diaA = new Date(a.data).getDate();
    const diaB = new Date(b.data).getDate();
    return diaA - diaB;
  });

  const containerTabela = document.createElement('div');
  containerTabela.className = 'parcelas-tabela';
  containerTabela.innerHTML = `
    <div class="parcelas-cabecalho">
      <span>Dia</span>
      <span>Cliente</span>
      <span>% Juros</span>
      <span>Valor</span>
      <span>Multa</span>
      <span>Status</span>
    </div>
  `;

  const corpoTabela = document.createElement('div');
  corpoTabela.id = 'parcelas-corpo';
  containerTabela.appendChild(corpoTabela);

  parcelasFiltradas.forEach(p => {
    const emp = emprestimosBase.find(e => e.id === p.emprestimoId);
    if (!emp) return;

    const diaVencimento = parseInt(p.data.split('-')[2], 10);

    const taxaPercentual = p.taxaJuros !== undefined 
      ? p.taxaJuros 
      : (((emp.valorComJuros / emp.valorOriginal) - 1) * 100).toFixed(1);

        let statusHTML = '';
        if (p.pago) {
          statusHTML = `<span style="font-weight:bold; color:#043604;">PAGO</span>`;
          
          // Ícone só se pago acima do valorParcela + multa
          if (p.valorRecebido > (p.valorParcela + (p.multa || 0))) {
            statusHTML += ` <span title="Pago acima do mínimo" style="color:#ff9800; font-weight:bold;">➕</span>`;
          }
        } else {
          const isOperador = localStorage.getItem("isOperador") === "true";

          if (isOperador) {
            // Somente exibição, sem checkbox
            statusHTML = `<span style="font-weight:bold; color:#d9534f;">PENDENTE</span>`;
          } else {
            // Admin pode marcar como pago
            statusHTML = `<label class="parcela-checkbox">
                            <input 
                              type="checkbox"
                              data-id="${emp.id}" 
                              data-indice="${p.indice}"
                              data-valor="${p.valorParcelaCorrigido}""
                              class="parcela-pendente"
                            />
                            <span class="checkmark"></span>
                            <span class="pagar-label">MARCAR</span>
                          </label>`;
          }
        }

    const linha = document.createElement('div');
    linha.className = `parcela-linha ${p.pago ? 'paga' : p.multa > 0 ? 'atrasada' : eVencimentoHoje(p.data) ? 'vencendo-hoje' : 'pendente'}`;
    linha.innerHTML = `
      <span>${diaVencimento}</span>
      <span class="nome-cliente" style="cursor:pointer; text-decoration: underline;">${p.emprestimoNome}</span>
      <span>${taxaPercentual}%</span>
      <span>${p.valorParcelaCorrigido}</span>
      <span>${p.multa > 0 ? (p.multa) : '-'}</span>
      <span>${statusHTML}</span>
    `;
    corpoTabela.appendChild(linha);

    const nomeCliente = linha.querySelector('.nome-cliente');
    if (nomeCliente) {
      nomeCliente.addEventListener('click', () => abrirModal(emp));
    }

    const chk = linha.querySelector('input.parcela-pendente');
    if (chk) {
      chk.addEventListener('change', function() {
        if (this.checked) {
          const indice = parseInt(this.dataset.indice, 10);
          const valorMinimo = calcularValorMinimoParcela(emp, indice);
          parcelaSelecionada = { emprestimo: emp, indice, checkbox: chk, valorMinimo };
          document.getElementById('valorRecebido').value = valorMinimo.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          });
          mostrarModalRecebedor();
        } else {
          parcelaSelecionada = null;
        }
      });
    }
  });

  resultadoFiltrado.appendChild(containerTabela);
  atualizarTotaisResumo(parcelasFiltradas);
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


document.getElementById('btnExportarPDFLista').addEventListener('click', () => {
  if (!parcelasFiltradas || parcelasFiltradas.length === 0) {
    alert("Nenhum dado para exportar");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Cabeçalho ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Relatório de Empréstimos - ${cidadeSelecionada}`, 14, 20);
  doc.setLineWidth(0.8);
  doc.line(14, 22, 196, 22);

  // --- Filtro ---
  let descricaoFiltro = "";
  if (inputDataFiltro.value) {
    const data = inputDataFiltro.value.split("-").reverse().join("/");
    descricaoFiltro = `Exportado para o dia ${data}`;
  } else if (filtroMes.value) {
    const [ano, mes] = filtroMes.value.split("-");
    descricaoFiltro = `Exportado para o mês ${mes}/${ano}`;
  } else {
    const mesAnoAtual = getMesAnoAtual();
    const [ano, mes] = mesAnoAtual.split("-");
    descricaoFiltro = `Exportado para o mês atual ${mes}/${ano}`;
  }

  if (filtroStatus) {
    let statusNome = "";
    switch (filtroStatus) {
      case "pago": statusNome = "Parcelas pagas"; break;
      case "em-dia": statusNome = "Parcelas em dia"; break;
      case "vencendo-hoje": statusNome = "Parcelas vencendo hoje"; break;
      case "atrasado": statusNome = "Parcelas atrasadas"; break;
    }
    descricaoFiltro += ` | Status: ${statusNome}`;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text(descricaoFiltro, 14, 28);

  // --- Totais e linhas ---
  let totalRecebido = 0;
  let totalPrevisto = 0;
  let totalExcedente = 0;
  const rows = [];

  parcelasFiltradas.forEach(p => {
    const dia = new Date(p.data).getDate();
    const cliente = p.emprestimoNome;
    const juros = p.taxaJuros !== undefined ? p.taxaJuros : 0;
    const valorParcela = p.valorParcela;
    const multa = p.multa || 0;
    const valorRecebido = p.valorRecebido || 0;

    // Total previsto e recebido (somente parcela, sem multa)
    totalPrevisto += valorParcela;
    if (p.pago) totalRecebido += valorParcela;

    let statusFinal = p.pago ? "PAGO" : "A RECEBER";
    let pagoMais = false;

    if (p.pago && valorRecebido > (valorParcela + multa)) {
      pagoMais = true;
      statusFinal += " + EXTRA";  // ícone de pagamento acima
      totalExcedente += (valorRecebido - (valorParcela + multa));
    }

    // Multa não paga entra no excedente
    if (!p.pago && multa > 0) {
      totalExcedente += multa;
    }

    rows.push([
      dia,
      cliente,
      juros + "%",
      valorParcela.toFixed(2),
      multa > 0 ? multa.toFixed(2) : "-",
      statusFinal
    ]);
  });

  // --- Totais exibidos ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 128, 0);
  doc.text(`Total Recebido: R$ ${totalRecebido.toFixed(2)}`, 14, 32);
  doc.setTextColor(0, 0, 128);
  doc.text(`Total Previsto: R$ ${totalPrevisto.toFixed(2)}`, 14, 40);
  doc.setTextColor(128, 0, 0);
  doc.text(`Total Excedente: R$ ${totalExcedente.toFixed(2)}`, 14, 48);
  doc.setLineWidth(0.3);
  doc.line(14, 50, 196, 50);
  doc.setTextColor(0, 0, 0);

  // --- Gera tabela ---
  doc.autoTable({
    head: [['Dia', 'Cliente', 'Juros (%)', 'Valor (R$)', 'Multa', 'Status']],
    body: rows,
    startY: 55,
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', lineColor: [200,200,200], lineWidth: 0.2 },
    headStyles: { fillColor: [220,220,220], textColor: [0,0,0], fontStyle: 'bold', lineWidth: 0.3 },
    alternateRowStyles: { fillColor: [245,245,245] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 55 }
    }
  });

  doc.save(`relatorio_${cidadeSelecionada}.pdf`);
});







function enviarMensagemCobranca(emprestimo) {
  if (!emprestimo || !emprestimo.telefone) {
    console.error("Telefone não encontrado");
    return;
  }

  const nome = emprestimo.nome || "Cliente";
  const telefone = emprestimo.telefone;
  const valorParcela = emprestimo.valorParcela || 0;
  const vencimento = emprestimo.vencimento; // use o nome correto do campo

  const mensagem = `Olá ${nome}, sua parcela no valor de R$ ${valorParcela} ${
    /* verificar se está vencida ou não */
    vencimento < new Date() ? "está atrasada" : "vence hoje"
  } no dia ${vencimento}.`;

  const urlWhatsapp = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
  window.open(urlWhatsapp, "_blank");
}

const btnEnviarCobranca = document.getElementById('btnEnviarCobranca');

btnEnviarCobranca.addEventListener('click', () => {
  if (!parcelasFiltradas || parcelasFiltradas.length === 0) {
    alert("Nenhuma parcela para enviar cobrança!");
    return;
  }

  // Envia mensagem para todas as parcelas filtradas (em massa)
  parcelasFiltradas.forEach(p => {
    const emprestimo = {
      nome: p.emprestimoNome,
      telefone: p.telefone || p.telefoneCliente, // ajusta conforme seu campo real
      valorParcela: p.valorMinimo,
      vencimento: p.data
    };

    if (!emprestimo.telefone) {
      console.warn(`Telefone do cliente ${emprestimo.nome} não encontrado`);
      return;
    }

    const mensagem = `Olá ${emprestimo.nome}, sua parcela no valor de R$ ${emprestimo.valorParcela.toFixed(
      2
    )} ${
      new Date(emprestimo.vencimento) < new Date() ? "está atrasada" : "vence hoje"
    } no dia ${toBR(emprestimo.vencimento)}.`;

    const urlWhatsapp = `https://wa.me/${emprestimo.telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsapp, "_blank");
  });
});





  });







