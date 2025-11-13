/* eslint-disable no-unused-vars */
import { URL_SERVICO } from './config.js';
import {
  mostrarAlerta,
  mostrarAlertaError,
  mostrarAlertaWarning,
  formatarMoeda,
  formatarMoedaLista
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
let parcelasFiltradas = []; // declara no topo do modal.js




function calcularResumoFinanceiro(emprestimoAtualizado) {
  if (!emprestimoAtualizado) {
    return { valorParcela: 0, valorJuros: 0, valorRestantePrincipal: 0 };
  }

  const valorOriginal = emprestimoAtualizado.valorOriginal || 0;
  const taxaJuros = emprestimoAtualizado.taxaJuros || 0;

  let saldoAtual = valorOriginal;
  let valorParcelaAtual = 0;
  let totalJurosCalculado = 0;

  (emprestimoAtualizado.valoresRecebidos || []).forEach((val, i) => {
    const jurosParcela = saldoAtual * (taxaJuros / 100);

    if (typeof val === 'number' && val > 0) {
      if (val > jurosParcela) {
        saldoAtual -= (val - jurosParcela); // abate no principal
        totalJurosCalculado += jurosParcela;
      } else {
        totalJurosCalculado += val; // pagou só juros
      }
    }
  });

  // A próxima parcela é sempre calculada sobre o saldo atual
  valorParcelaAtual = saldoAtual * (taxaJuros / 100);

  return {
    valorParcela: valorParcelaAtual,
    valorJuros: totalJurosCalculado,
    valorRestantePrincipal: Math.max(0, saldoAtual)
  };
}



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

const inputMultaRecebida = document.getElementById('valorMulta');


inputMultaRecebida.addEventListener('input', (e) => {
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


  let valorMulta = 0;
const valorMultaRaw = document.getElementById('valorMulta').value;
if (valorMultaRaw) {
  const valorMultaString = valorMultaRaw.replace(/\D/g, '');
  valorMulta = parseFloat(valorMultaString) / 100;
}


  try {
    const response = await fetch(`${URL_SERVICO}/emprestimos/${emprestimo.id}/parcela/${indice}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataPagamento,
        nomeRecebedor: nome,
        valorRecebido,
        valorMulta
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

    if (checkbox) {
      if (emprestimo.statusParcelas[indice]) {
        checkbox.checked = true;
        checkbox.disabled = true;
      } else {
        checkbox.checked = false;
      }
    }

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

    if (emprestimo.statusParcelas[indice]) {
      mostrarAlerta(`Parcela ${indice + 1} quitada por ${nome}`);
    } else {
      mostrarAlerta(`Parcela ${indice + 1} recebeu pagamento parcial de ${formatarMoeda(valorRecebido)} por ${nome}`);
    }

    // 🔥 Atualiza a lista automaticamente
    filtrarEmprestimos({
      dataFiltro: inputDataFiltro.value,
      mesFiltro: filtroMes.value
    });

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
  if (!modalRecebedor) return;

  // 🧼 LIMPEZA TOTAL DO ESTADO ANTERIOR
  inputRecebedor.value = '';
  inputValorRecebido.value = '';
  
  const campoMulta = document.getElementById('valorMulta');
  const infoMulta = document.getElementById('infoMulta');

  if (campoMulta) {
    campoMulta.value = '';
    campoMulta.parentElement.style.display = 'none';
  }
  if (infoMulta) {
    infoMulta.textContent = '';
    infoMulta.style.display = 'none';
  }

  // ⚙️ REAPLICA DADOS COM BASE NA PARCELA SELECIONADA
  if (parcelaSelecionada?.emprestimo && parcelaSelecionada?.indice != null) {
    const emprestimo = parcelaSelecionada.emprestimo;
    const indice = parcelaSelecionada.indice;
    const vencimento = emprestimo.datasVencimentos?.[indice];

    if (vencimento) {
      const diasAtraso = calcularDiasAtraso(vencimento);
      if (diasAtraso > 0) {
        const valorMultaAutomatico = diasAtraso * 20;
        if (campoMulta) {
          campoMulta.parentElement.style.display = 'block';
          campoMulta.value = ''; // não preenche automaticamente, só sugere
        }
        if (infoMulta) {
          infoMulta.style.display = 'block';
          infoMulta.textContent = `⚠️ Esta parcela está atrasada ${diasAtraso} dia(s).
          O valor de uma multa considerando R$20/dia seria R$${valorMultaAutomatico}.`;
        }
      }
    }
  }

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

  // 🧼 LIMPAR CAMPOS E ALERTAS
  const campoMulta = document.getElementById('valorMulta');
  const infoMulta = document.getElementById('infoMulta');
  if (campoMulta) {
    campoMulta.value = '';
    campoMulta.parentElement.style.display = 'none';
  }
  if (infoMulta) {
    infoMulta.textContent = '';
    infoMulta.style.display = 'none';
  }

  const inputValorRecebido = document.getElementById('valorRecebido');
  if (inputValorRecebido) inputValorRecebido.value = '';

  parcelaSelecionada = null; // limpa seleção
}



function atualizarValorRestante(emprestimoAtualizado) {
  if (!emprestimoAtualizado) return;

  const isParcelado = emprestimoAtualizado.tipoParcelamento === 'parcelado';
  const valorOriginal = Number(emprestimoAtualizado.valorOriginal || 0);
  const taxaPercent = Number(emprestimoAtualizado.taxaJuros ?? 0);
  const taxa = taxaPercent / 100;

  const container = document.getElementById('valorRestanteContainer');
  if (!container) return;

  const toNum = v => (typeof v === 'number' ? v : (v ? Number(v) : 0));

if (isParcelado) {
  const valoresRecebidos = emprestimoAtualizado.valoresRecebidos || [];
  const statusParcelas = emprestimoAtualizado.statusParcelas || [];
  const valoresOriginaisParcelas = emprestimoAtualizado.valoresOriginaisParcelas || [];
  const parcelas = emprestimoAtualizado.parcelas || 0;

  const listaParcelasHTML = [];

  // ✅ Achar a próxima parcela pendente
  const proximaPendenteIndex = statusParcelas.findIndex(s => !s);

  for (let i = 0; i < parcelas; i++) {
    const paga = !!statusParcelas[i];

    // ✅ Mostrar somente as pagas + a próxima pendente
    if (!paga && i !== proximaPendenteIndex) continue;

    const valorBase = valoresOriginaisParcelas[i] || 0;
    const valorPago = valoresRecebidos[i] || 0;

    const badgeClass = paga ? "paga" : "pendente";

    listaParcelasHTML.push(`
      <div class="parcela-card-infos">
        <div class="parcela-header-infos">
          <span class="parcela-num-infos">Parcela ${i + 1}</span>

          <span class="parcela-status-badge ${badgeClass}">
            ${paga ? "PAGA" : "PENDENTE"}
          </span>
        </div>

        <div class="parcela-body-infos">
          <div><strong>Valor Parcela:</strong> ${formatarMoeda(valorBase)}</div>
          <div><strong>Pago:</strong> ${valorPago > 0 ? formatarMoeda(valorPago) : "-"}</div>
        </div>
      </div>
    `);
  }

  container.innerHTML = `
    <hr>
    <h3><strong>📦 Parcelas (Amortização Dinâmica)</strong></h3>

    ${listaParcelasHTML.join("")}

    <hr>
    <h3><strong>💰 Saldo Restante</strong></h3>
    <div style="font-size: 1.2em; font-weight: bold;">
      ${formatarMoeda(valorOriginal)}
    </div>
  `;

  return;
}





  // ----- NÃO PARCELADO -----
  const valoresRecebidos = emprestimoAtualizado.valoresRecebidos || [];
  const statusParcelas = emprestimoAtualizado.statusParcelas || [];
  const datasVencimentos = emprestimoAtualizado.datasVencimentos || [];
  const multasParcelas = emprestimoAtualizado.multasParcelas || [];
  const valorParcelasPendentes = emprestimoAtualizado.valorParcelasPendentes || [];
  const valoresOriginaisParcelas = emprestimoAtualizado.valoresOriginaisParcelas || [];

  const parcelasCount = Math.max(
    emprestimoAtualizado.parcelas || 0,
    valoresRecebidos.length,
    datasVencimentos.length,
    valoresOriginaisParcelas.length,
    valorParcelasPendentes.length
  );

  // 🔥 CORREÇÃO: Separar o cálculo dos valores das parcelas do cálculo dos excedentes
  let totalPagoValido = 0;
  let totalJurosRecebidos = 0;
  let totalMultas = 0;
  const parcelasInfo = [];
  const parcelasComExcedente = [];

  // PRIMEIRA PASSADA: Calcular todos os valores ORIGINAIS das parcelas (sem considerar excedentes)
  const valoresParcelas = [];
  for (let i = 0; i < parcelasCount; i++) {
    const paga = !!statusParcelas[i];
    const valorRecebido = toNum(valoresRecebidos[i]);

    // 🔥 LÓGICA CORRIGIDA: Usar valores fixos salvos SEM atualizar com excedentes
    let valorParcelaExibicao = null;

    if (paga) {
      // PARCELA PAGA → usar valor fixo salvo
      valorParcelaExibicao = 
        valoresOriginaisParcelas[i] ??
        valorParcelasPendentes[i] ??
        valorRecebido;
    } else {
      // PARCELA EM ABERTO → usar valor pendente salvo OU calcular com valor original fixo
      // 🔥 NÃO usar valorOriginalAtual que muda durante o loop
      valorParcelaExibicao = valorParcelasPendentes[i] ?? valorOriginal * taxa;
    }

    valoresParcelas.push(valorParcelaExibicao);
  }

  // SEGUNDA PASSADA: Calcular excedentes e valor restante
  let saldoPrincipalRestante = valorOriginal; // Começa com o valor original
  
  for (let i = 0; i < parcelasCount; i++) {
    const valorPago = toNum(valoresRecebidos[i]);
    const paga = !!statusParcelas[i];
    const multaRegistrada = toNum(multasParcelas[i]);

    const valorParcelaBase = valoresParcelas[i];

    // Calcular multa
    let multaAutomatic = 0;
    if (datasVencimentos[i] && !paga) {
      const diasAtraso = calcularDiasAtraso(datasVencimentos[i]);
      if (diasAtraso > 0) multaAutomatic = diasAtraso * 20;
    }
    const multaAplicada = multaRegistrada > 0 ? multaRegistrada : multaAutomatic;

    const valorMinimoParcela = Math.max(0, valorParcelaBase) + multaAplicada;
    const excedente = Math.max(0, valorPago - valorMinimoParcela);

    // Juros recebidos (apenas a parte correspondente ao valor da parcela)
    if (paga) {
      totalJurosRecebidos += Math.min(valorPago, valorParcelaBase);
    }

    // 🔥 CORREÇÃO CRÍTICA: Aplicar excedente ao saldo principal APENAS uma vez
    if (excedente > 0) {
      totalPagoValido += excedente;
      // O saldo principal é reduzido pelo excedente
      saldoPrincipalRestante = Math.max(0, saldoPrincipalRestante - excedente);
      
      parcelasComExcedente.push({
        indice: i + 1,
        valorParcela: valorParcelaBase,
        valorPago,
        multa: multaAplicada,
        excedente,
        valorMinimo: valorMinimoParcela
      });
    }

    totalMultas += multaAplicada;

    parcelasInfo.push({
      indice: i + 1,
      valorParcela: valorParcelaBase,
      valorMinimo: valorMinimoParcela,
      valorPago,
      multa: multaAplicada,
      excedente
    });
  }

  const valorRestantePrincipal = Math.max(0, saldoPrincipalRestante);

  // 🔥 VALIDAÇÃO: Verificar se o cálculo está correto
  console.log('Valor Original:', valorOriginal);
  console.log('Total Excedentes:', totalPagoValido);
  console.log('Valor Restante Calculado:', valorRestantePrincipal);
  console.log('Validação:', valorOriginal - totalPagoValido, 'deve ser igual a', valorRestantePrincipal);

  // Montagem do HTML
const listaParcelasHTML = parcelasInfo.map(p => {
  const paga = statusParcelas?.[p.indice - 1];
  const statusClass = paga ? "paga" : "pendente";
  const valorPagoDisplay = p.valorPago > 0 ? formatarMoeda(p.valorPago) : "-";
  const multaDisplay = p.multa > 0 
    ? `<div class="multa-infos">💰 Multa aplicada: ${formatarMoeda(p.multa)}</div>` 
    : '';

  return `
    <div class="parcela-card-infos">
      <div class="parcela-header-infos">
        <span class="parcela-num-infos">Parcela ${p.indice}</span>
        <span class="parcela-status-badge ${statusClass}">
          ${paga ? "PAGA" : "PENDENTE"}
        </span>
      </div>

      <div class="parcela-body-infos">
        <div><strong>Valor Parcela:</strong> ${formatarMoeda(p.valorParcela)}</div>
        <div><strong>Valor Recebido:</strong> ${valorPagoDisplay}</div>
        ${multaDisplay}
      </div>
    </div>
  `;
}).join('');


const parcelasComExcedenteHTML = parcelasComExcedente.map(p => {
  return `
    <div class="excedente-card">
      <div>
        <strong>Parcela ${p.indice}</strong><br>
        <span>Valor mínimo: ${formatarMoeda(p.valorMinimo)}</span><br>
        ${p.multa > 0 ? `<span style="color:#b30000;">⚠ Multa: ${formatarMoeda(p.multa)}</span><br>` : ''}
        <span>Pago: ${formatarMoeda(p.valorPago)}</span>
      </div>
      <div class="excedente-valor">
        + ${formatarMoeda(p.excedente)}
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
    <div style="margin-top: 5px; font-weight: bold;">
      Valor restante do principal: ${formatarMoeda(valorOriginal)}
    </div>
    ${totalMultas > 0 ? `
      <div style="margin-top: 5px; color: #c52e28ff; font-weight: bold;">
        Multa total por atraso: +${formatarMoeda(totalMultas)}<br>
        Total a pagar: ${formatarMoeda(valorRestantePrincipal + totalMultas)}
      </div>
    ` : ''}
    <div style="margin-top: 5px; color: #007bff; font-weight: bold;">
      💹 Juros recebidos: ${formatarMoeda(totalJurosRecebidos)}
    </div>
  `;
}



export async function abrirModalSolicitacao(solicitacao) {
  const modal = document.getElementById('modalSolicitacao');
  const corpo = document.getElementById('corpoModalSolicitacao');

  if (!modal || !corpo) {
    console.error("Modal ou corpo não encontrado no DOM");
    return;
  }

  const valorNumerico = parseFloat(
    solicitacao.valor.replace(/[^\d,]/g, '').replace(',', '.')
  ) || 0;

  const taxaJuros = solicitacao.taxaJuros ?? 20;
  const valorJuros = valorNumerico * (taxaJuros / 100);

  // 🔹 Buscar se existe rejeição anterior
let rejeitadoAnterior = null;
try {
  const resp = await fetch(`${URL_SERVICO}/solicitacoes-rejeitadas`);
  const rejeicoes = await resp.json();
  rejeitadoAnterior = rejeicoes.find(r => r.cpf === solicitacao.cpf);
} catch (err) {
  console.error("Erro ao buscar rejeições:", err);
}


corpo.innerHTML = `
  <div class="grid-detalhes break-lines" style="display:grid; gap:8px; margin-bottom:10px;">

  ${rejeitadoAnterior ? `
    <div class="box-rejeitado" 
        style="
          width: 100%;
          grid-column: 1 / -1;
          border: 2px solid #e53935;
          padding: 12px;
          border-radius: 8px;
          background: #ffebee;
          margin-bottom: 12px;
          box-sizing: border-box;
        ">
      <h3>⚠️ Histórico de Empréstimo Rejeitado</h3>
      <p><strong>Nome:</strong> ${rejeitadoAnterior.nome}</p>
      <p><strong>Valor:</strong> ${rejeitadoAnterior.valor}</p>
      <p><strong>Taxa de juros:</strong> ${rejeitadoAnterior.taxaJuros}%</p>
      <p><strong>Valor do juros:</strong> R$ ${rejeitadoAnterior.valorJuros.toFixed(2)}</p>
      <p><em>Data da rejeição:</em> ${new Date(rejeitadoAnterior.dataRejeicao).toLocaleDateString()}</p>
    </div>
  ` : ''}

  <h3 style="
    width: 100%;
    grid-column: 1 / -1;
    text-align: center;
    margin-bottom: 16px;
    padding-bottom: 6px;
    border-bottom: 2px solid #007bff;
    color: #333;
    display: block;
  ">📄 Detalhes da Solicitação</h3>

  <div><strong>Nome:</strong> ${solicitacao.nome}</div>
  <div><strong>Email:</strong> ${solicitacao.email}</div>
  <div><strong>Telefone:</strong> ${solicitacao.telefone}</div>
  <div><strong>CPF:</strong> ${solicitacao.cpf}</div>
  <div><strong>Endereço:</strong> ${solicitacao.endereco || ''}, ${solicitacao.numero || ''}${solicitacao.complemento ? ', ' + solicitacao.complemento : ''}</div>
  <div><strong>Cidade:</strong> ${solicitacao.cidade || ''} - ${solicitacao.estado || ''}</div>
  <div><strong>CEP:</strong> ${solicitacao.cep || ''}</div>
  <div><strong>Valor:</strong> ${solicitacao.valor}</div>
  <div><strong>Taxa de juros:</strong> ${solicitacao.taxaJuros || 20}%</div>
  <div class="valor-item">
    <span class="label">📈 Valor do juros:</span>
    <span class="valor destaque">R$ ${valorJuros.toFixed(2)}</span>
  </div>
  </div>

  <div class="botoes" style="display:flex; gap:8px; margin-bottom:8px;">
    <button id="btnAprovarModal" data-id="${solicitacao._id}" style="flex:1; background:#4caf50; color:white; padding:8px; border:none; border-radius:5px;">Aprovar</button>
    <button id="btnRejeitarModal" data-id="${solicitacao._id}" style="flex:1; background:#e53935; color:white; padding:8px; border:none; border-radius:5px;">Rejeitar</button>
  </div>

  <button id="btnFecharModal" style="width:100%; padding:8px; border:none; border-radius:5px; background:#007bff; color:white; cursor:pointer;">Fechar</button>
`;


  // mostrar modal
  modal.style.display = 'flex';

  // fechar modal
  document.getElementById('btnFecharModal').onclick = () => {
    modal.style.display = 'none';
  };

  // aprovar
  document.getElementById('btnAprovarModal').onclick = async () => {
    await fetch(`${URL_SERVICO}/solicitacoes/${solicitacao._id}/acao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "aprovar" })
    });
    mostrarAlerta("Solicitação aprovada!");
    modal.style.display = 'none';
    carregarSolicitacoes();
  };

  // rejeitar
  document.getElementById('btnRejeitarModal').onclick = async () => {
    await fetch(`${URL_SERVICO}/solicitacoes/${solicitacao._id}/acao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "rejeitar" })
    });
    mostrarAlerta("Solicitação rejeitada com sucesso!");
    modal.style.display = 'none';
    carregarSolicitacoes();
  };
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
  <div><strong>Taxa de juros:</strong> ${(emprestimo.taxaJuros)}</div>
  <!-- Mostra o total de parcelas já geradas -->
  <div><strong>Parcelas geradas:</strong> ${emprestimo.statusParcelas?.length || 0}</div>

  <!-- Mostra quantas foram quitadas -->
  <div><strong>Parcelas quitadas:</strong> 
    ${(emprestimo.statusParcelas || []).filter(p => p).length}
  </div>
  
  ${(() => {
    // 🔥 MESMA LÓGICA DA FUNÇÃO atualizarVisualParcelas
    const valorOriginal = Number(emprestimo.valorOriginal || 0);
    const taxa = Number(emprestimo.taxaJuros || 0) / 100;
    const valoresRecebidos = emprestimo.valoresRecebidos || [];
    const statusParcelas = emprestimo.statusParcelas || [];
    const valorParcelasPendentes = emprestimo.valorParcelasPendentes || [];
    const valoresOriginaisParcelas = emprestimo.valoresOriginaisParcelas || [];
    
    let valorOriginalAtual = valorOriginal;
    let valorParcelaAtual = 0;
    
    // Calcular valor da parcela atual (usando a mesma lógica)
    if (statusParcelas.length > 0) {
      // Para parcelas pagas: usar valor fixo salvo
      // Para parcelas pendentes: calcular com saldo atual
      const ultimaParcelaIndex = statusParcelas.length - 1;
      const paga = !!statusParcelas[ultimaParcelaIndex];
      
      if (paga) {
        // PARCELA PAGA → usar valor fixo salvo ou o valor recebido
        valorParcelaAtual = 
          valoresOriginaisParcelas[ultimaParcelaIndex] ??
          valorParcelasPendentes[ultimaParcelaIndex] ??
          (valoresRecebidos[ultimaParcelaIndex] || 0);
      } else {
        // PARCELA EM ABERTO → pode usar saldo atual
        valorParcelaAtual = valorParcelasPendentes[ultimaParcelaIndex] ?? valorOriginalAtual * taxa;
      }
    } else {
      // Se não há parcelas ainda, calcular normalmente
      valorParcelaAtual = valorOriginal * taxa;
    }
    
    // Calcular valor restante do principal (considerando excedentes)
    let totalExcedentes = 0;
    for (let i = 0; i < statusParcelas.length; i++) {
      const paga = !!statusParcelas[i];
      const valorRecebido = Number(valoresRecebidos[i] || 0);
      
      if (paga) {
        const valorParcelaBase = 
          valoresOriginaisParcelas[i] ??
          valorParcelasPendentes[i] ??
          valorRecebido;
        
        const excedente = Math.max(0, valorRecebido - valorParcelaBase);
        totalExcedentes += excedente;
      }
    }
    
    const valorRestantePrincipal = Math.max(0, valorOriginal - totalExcedentes);
    
    return `
      <div><strong>Valor da parcela:</strong> ${formatarMoeda(valorParcelaAtual)}</div>
      <div><strong>Valor restante do principal:</strong> ${formatarMoeda(valorRestantePrincipal)}</div>
    `;
  })()}

  ${emprestimo.quitado ? '<div style="color: green; font-weight: bold;">✅ Empréstimo Quitado</div>' : ''}
</div>


          <div id="valorRestanteContainer" style="margin-top: 15px; font-weight: bold; font-size: 1.1em;"></div>
  <div style="margin-top: 25px; text-align: center;">
    <button id="btnExcluirEmprestimo" 
            style="background: #e53935; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;">
      ❌ Excluir Empréstimo
    </button>
  </div>

  <!-- Modal de confirmação -->
  <div id="modalConfirmacaoExcluir" 
       style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; 
              background: rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:10000;">
    <div style="background:white; padding:20px; border-radius:8px; width: 350px; text-align:center;">
      <h3 style="margin-bottom:15px;">⚠️ Confirmar Exclusão</h3>
      <p>Você tem certeza que deseja excluir este empréstimo?</p>
      <div style="margin-top:20px; display:flex; justify-content:space-around;">
        <button id="btnConfirmarExclusao" 
                style="background:#e53935; color:white; padding:8px 15px; border:none; border-radius:5px; cursor:pointer;">
          Sim, excluir
        </button>
        <button id="btnCancelarExclusao" 
                style="background:#9e9e9e; color:white; padding:8px 15px; border:none; border-radius:5px; cursor:pointer;">
          Cancelar
        </button>
      </div>
    </div>
  </div>
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


  // 🔹 Só depois de montar o HTML, adicione os eventos:
const btnExcluir = document.getElementById("btnExcluirEmprestimo");
const modalExcluir = document.getElementById("modalConfirmacaoExcluir");
const btnConfirmar = document.getElementById("btnConfirmarExclusao");
const btnCancelar = document.getElementById("btnCancelarExclusao");

// Abrir modal
btnExcluir.addEventListener("click", () => {
  modalExcluir.style.display = "flex";
});

// Cancelar exclusão
btnCancelar.addEventListener("click", () => {
  modalExcluir.style.display = "none";
});

// Confirmar exclusão
// 1️⃣ Garantir que as listas globais estejam no escopo global
window.emprestimosPorCidade = window.emprestimosPorCidade || {};
window.emprestimosPorGrupo = window.emprestimosPorGrupo || {};

// 2️⃣ Listener de exclusão
btnConfirmar.addEventListener("click", async () => {
  try {
    const resp = await fetch(`${URL_SERVICO}/emprestimos/${emprestimo.id}`, { method: "DELETE" });

    if (resp.ok) {
      mostrarAlerta("✅ Empréstimo excluído com sucesso!");

      // Fecha modais
      modalExcluir.style.display = "none";
      modal.style.display = "none";
      document.body.classList.remove('modal-aberto'); 
      window.scrollTo(0, scrollPos);

      // 🔹 Remove da lista global
      if (window.emprestimosPorCidade[cidadeSelecionada]) {
        window.emprestimosPorCidade[cidadeSelecionada] =
          window.emprestimosPorCidade[cidadeSelecionada].filter(e => e.id !== emprestimo.id);
      }

      if (window.emprestimosPorGrupo[cidadeSelecionada]) {
        window.emprestimosPorGrupo[cidadeSelecionada] =
          window.emprestimosPorGrupo[cidadeSelecionada].filter(e => e.id !== emprestimo.id);
      }

      // 🔹 Remove também da lista de parcelas filtradas
      if (window.parcelasFiltradas) {
        window.parcelasFiltradas = window.parcelasFiltradas.filter(p => p.emprestimoId !== emprestimo.id);
      }

      // 🔹 Re-renderiza a lista com os dados atualizados
      window.filtrarEmprestimos({
        dataFiltro: inputDataFiltro.value,
        mesFiltro: filtroMes.value
      });

    } else {
      mostrarAlertaError("❌ Erro ao excluir empréstimo!");
    }
  } catch (err) {
    console.error(err);
    mostrarAlertaError("❌ Erro inesperado ao excluir!");
  }
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

  // Preservar elementos fixos
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
  elementosPreservar.forEach(el => {
    if (el.id === 'containerEditarVencimentos') el.style.display = 'none';
    parcelasContainer.appendChild(el);
  });

  const parcelas = emprestimo.statusParcelas || Array(emprestimo.parcelas).fill(false);
  const datasPagamentos = emprestimo.datasPagamentos || [];
  const recebidoPor = emprestimo.recebidoPor || [];
  const datasVencimentos = emprestimo.datasVencimentos || [];
  const valoresRecebidos = emprestimo.valoresRecebidos || [];
  const valorParcelasPendentes = emprestimo.valorParcelasPendentes || [];
  const valoresOriginaisParcelas = emprestimo.valoresOriginaisParcelas || [];

  const taxa = emprestimo.taxaJuros / 100;
  let valorOriginalAtual = emprestimo.valorOriginal;

  // Mostrar informações de amortização
  const infoAmortizacao = document.createElement('div');
  infoAmortizacao.className = 'info-amortizacao';
  infoAmortizacao.style = 'background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 15px;';
// ✅ Se for parcelado → mostrar valor das parcelas
if (emprestimo.tipoParcelamento === "parcelado") {

  // Pega o valor da próxima parcela não paga
  const indexProxima = emprestimo.statusParcelas.findIndex(p => p === false);
  const valorParcelaAtual = valoresOriginaisParcelas[indexProxima] ?? 0;

  infoAmortizacao.innerHTML = `
    <strong>💰 Saldo Principal:</strong> ${formatarMoeda(valorOriginalAtual)}<br>
    <strong>📦 Valor das parcelas atuais:</strong> ${formatarMoeda(valorParcelaAtual)}
  `;

// ✅ Se for juros → lógica atual
} else {
  infoAmortizacao.innerHTML = `
    <strong>💰 Saldo Principal:</strong> ${formatarMoeda(valorOriginalAtual)}<br>
    <strong>📊 Juro Mensal Atual:</strong> ${formatarMoeda(valorOriginalAtual * taxa)}
  `;
}

  parcelasContainer.appendChild(infoAmortizacao);

  parcelas.forEach((paga, i) => {
    const item = document.createElement('div');
    item.className = 'parcela-box';
    item.style = 'margin-bottom: 16px; display: flex; align-items: flex-start;';

    const label = document.createElement('label');
    label.style.lineHeight = '1.4';

    const isOperador = localStorage.getItem('isOperador') === 'true';
    let chk = null;

    if (!isOperador && !paga) {
      chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = false;
      chk.disabled = false;
      chk.style = 'margin-right: 10px; transform: scale(1.5); cursor: pointer; margin-top: 4px;';

      chk.addEventListener('change', () => {
        if (chk.checked) {
          if (i > 0 && !parcelas[i - 1]) {
            mostrarAlertaWarning(`Você precisa marcar a parcela ${i} como paga antes da ${i + 1}.`);
            chk.checked = false;
            return;
          }

          chk.checked = true;
          chk.disabled = true;

          parcelaSelecionada = { 
            emprestimo, 
            indice: i, 
            checkbox: chk,
            juroMensalAtual: valorOriginalAtual * taxa
          };
          
mostrarModalRecebedor();

        }
      });
    }

    // 🔹 CORREÇÃO: cálculo seguro do valor da parcela
    let valorParcelaExibicao = null;
    let amortizacao = 0;
    const valorRecebido = valoresRecebidos[i] || 0;

    if (paga) {
      // PARCELA PAGA → usar valor fixo salvo ou o valor recebido
      valorParcelaExibicao =
        valoresOriginaisParcelas[i] ??
        valorParcelasPendentes[i] ??
        valorRecebido; // nunca recalcula usando valorOriginal

      // Amortização (se pagou acima do valor original)
      amortizacao = Math.max(0, valorRecebido - valorParcelaExibicao);
    } else {
      // PARCELA EM ABERTO → pode usar saldo atual
      valorParcelaExibicao = valorParcelasPendentes[i] ?? valorOriginalAtual * taxa;
    }

    // 🔍 LOG opcional pra testar
    // console.log(`Parcela ${i+1}: originalSalvo=${valoresOriginaisParcelas[i]}, exibido=${valorParcelaExibicao}`);

    const vencimento = datasVencimentos[i];
    const venc = vencimento ? vencimento.split('-').reverse().join('/') : null;

    // Calcula multa se atrasada
    let multa = 0;
    if (vencimento && !paga) {
      const diasAtraso = calcularDiasAtraso(vencimento);
      if (diasAtraso > 0) multa = diasAtraso * 20;
    }

    const valorFaltante = Math.max(0, valorParcelaExibicao - valorRecebido);

    // Monta HTML
    let html = `<strong>📦 Parcela ${i + 1}:</strong> ${formatarMoeda(valorParcelaExibicao)}<br>`;
    if (venc) html += `<strong>📅 Vencimento:</strong> ${venc}<br>`;
    
    if (paga) {
      html += `<strong>💵 Valor Recebido:</strong> ${formatarMoeda(valorRecebido)}<br>`;
      if (amortizacao > 0) {
        html += `<strong style="color:green;">🎯 Amortização do principal:</strong> ${formatarMoeda(amortizacao)}<br>`;
      }
    } else {
if (valorRecebido > 0) {
  // ✅ Exibe data/hora atual no momento do carregamento, se não tiver data registrada
  let dataFmt, horaFmt;
  if (datasPagamentos[i]) {
    const dataParcial = new Date(datasPagamentos[i]);
    dataFmt = dataParcial.toLocaleDateString('pt-BR');
    horaFmt = dataParcial.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else {
    const agora = new Date();
    dataFmt = agora.toLocaleDateString('pt-BR');
    horaFmt = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const recebedor = recebidoPor[i] || 'Bruno'; // ou quem estiver logado

  html += `<strong>💵 Pago até agora:</strong> ${formatarMoeda(valorRecebido)} <br>Pago em: ${dataFmt} às ${horaFmt} - recebido por ${recebedor}<br>`;
}

      if (valorFaltante > 0) html += `<strong style="color:orange;">⏳ Valor pendente:</strong> ${formatarMoeda(valorFaltante)}<br>`;
    }
    
    if (vencimento && !paga && multa > 0) {
      html += `<strong style="color:red;">💰 Multa possível:</strong> ${formatarMoeda(multa)}<br>`;
    }

    const hoje = new Date();
hoje.setHours(0, 0, 0, 0); // ignora hora/minuto

if (vencimento && !paga) {
  const dataVenc = criarDataLocal(vencimento);
  dataVenc.setHours(0, 0, 0, 0);

  const diasAtraso = Math.floor((hoje - dataVenc) / (1000 * 60 * 60 * 24));
  if (diasAtraso > 0) {
    multa = diasAtraso * 20;
  } else if (diasAtraso === 0) {
    // ⚠️ Aviso de vencimento hoje
    html += `<strong style="color:#ff8800;">⚠️ Vence hoje!</strong><br>`;
  }
}


  if (paga && datasPagamentos[i]) {
  const dataPag = new Date(datasPagamentos[i]);
  const dataFmt = dataPag.toLocaleDateString('pt-BR');
  const horario = dataPag.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const recebedor = recebidoPor[i] || 'N/A';

  html += `<strong>✅ Paga em:</strong> ${dataFmt}<br>`;
  html += `<strong>🙍‍♂️ Recebido por:</strong> ${recebedor} às ${horario}<br>`;

  // 💰 Valor recebido e multa, se houver
  const valorContrato = valoresRecebidos[i] || 0;
  const valorMulta = emprestimo.multasParcelas?.[i] || 0;
  html += `<strong>💵 Valor Recebido:</strong> ${formatarMoeda(valorContrato)}<br>`;
  if (valorMulta > 0) {
    html += `<strong style="color:red;">💰 Multa aplicada:</strong> ${formatarMoeda(valorMulta)}<br>`;
  }

  // Verifica se foi pago com atraso
  if (datasVencimentos[i]) {
    const dataVenc = criarDataLocal(datasVencimentos[i]);
    dataPag.setHours(0, 0, 0, 0);
    dataVenc.setHours(0, 0, 0, 0);

    if (dataPag > dataVenc) {
      const diasAtraso = Math.floor((dataPag - dataVenc) / (1000 * 60 * 60 * 24));
      html += `<strong style="color:#d9534f;">⚠️ Parcela paga com atraso</strong><br>`;
      html += `<strong>⚠️ Dias de atraso:</strong> ${diasAtraso}<br>`;
      item.classList.add('parcela-paga-com-atraso');
    } else {
      item.classList.add('parcela-paga');
    }
  } else {
    item.classList.add('parcela-paga');
  }
}

label.innerHTML = html;

if (chk) item.appendChild(chk);
item.appendChild(label);

// Para parcelas em aberto ou atrasadas
if (!paga) {
  if (multa > 0) item.classList.add('parcela-atrasada');
  else item.classList.add('parcela-em-dia');
}

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
  "Mensal 3A": ["Sorocaba-3A", "Itu-3A", "Tatuí-3A", "Porto Feliz-3A", "Salto de Pirapora-3A", "Boituva-3A"],
  "Mensal 4": ["Santos", "Guarujá", "São Vicente", "Praia Grande", "Bertioga", "Cubatão", "Mongaguá", "Itanhaém", "Peruíbe"]

};

let emprestimosPorCidade = {};
let emprestimosPorGrupo = {
  "Mensal 1": [],
  "Mensal 2": [],
  "Mensal 3": [],
  "Mensal 3A": [],
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
        "Mensal 3A": [],
        "Mensal 4": []
      };


      // Organiza por cidade
// Reinicia os arrays
emprestimosPorCidade = {};
emprestimosPorGrupo = {
  "Mensal 1": [],
  "Mensal 2": [],
  "Mensal 3": [],
  "Mensal 3A": [],
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
  let valorExcedente = 0;  
  let totalMulta = 0;      

  parcelasFiltradas.forEach(p => {
    const emp = emprestimosPorCidade[p.emprestimoNome] || emprestimosPorGrupo[p.emprestimoNome];

    let valorBase;

    // ✅ PARCELADO → usa sempre o valor fixo da parcela original
    if (p.tipoParcelamento === "parcelado" || p.taxaJuros === 0) {
      valorBase = p.valorParcelaFixa ?? p.valorParcelaCorrigido ?? 0;

    // ✅ JUROS → usa o valor já calculado
    } else {
      valorBase = p.valorParcelaCorrigido ?? 0;
    }

    // adiciona ao total previsto
    totalPrevisto += valorBase;

    if (p.pago) {
      totalRecebido += valorBase;

      // excedente certo: somente acima do valorBase
      if (p.valorRecebido > valorBase) {
        valorExcedente += (p.valorRecebido - valorBase);
      }

      if (p.multa && p.multa > 0) {
        totalMulta += p.multa;
      }
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
    <div class="totais-card multa">
      <span class="titulo">Total Multa</span>
      <span class="valor">${formatarMoeda(totalMulta)}</span>
    </div>
  `;
}


window.atualizarTotaisResumo = atualizarTotaisResumo;








// Funções auxiliares adicionais necessárias
function getMesAnoAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}


function getMesAnoFromDate(dateString) {
  if (!dateString) return "";
  const [ano, mes] = dateString.split("-");
  return `${ano}-${mes}`;
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
    } 
    if (mesAnoAtual) {
      return emp.datasVencimentos.some(d => getMesAnoFromDate(d) === mesAnoAtual);
    }

    return true;
  });

  if (emprestimosFiltrados.length === 0) {
    resultadoFiltrado.innerHTML = `<li class="mensagem-vazia">
      <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
      <p>Nenhum empréstimo encontrado</p>
    </li>`;
    atualizarTotaisResumo([]);
    parcelasFiltradas = [];
    return;
  }

  parcelasFiltradas = [];

  emprestimosFiltrados.forEach(emp => {
const parcelas = (emp.datasVencimentos || []).map((data, idx) => {
  const diasAtraso = calcularDiasAtrasoDataOnly(data);
  const pago = emp.statusParcelas?.[idx] || false;
  const valorJuros = emp.valorComJuros - emp.valorOriginal;

  // 🔧 Multa individual por parcela
  let multa = 0;
  if (emp.multasParcelas && emp.multasParcelas[idx] != null) {
    multa = parseFloat(emp.multasParcelas[idx]) || 0;
  }

  // fallback visual: se não houver multa registrada, mas está atrasada e não foi paga
  if (multa === 0 && diasAtraso > 0 && !pago) {
    multa = diasAtraso * 20; // apenas sugestão visual
  }

  const valorRecebido = emp.valoresRecebidos?.[idx] || 0;
  const taxa = (emp.taxaJuros || 0) / 100;

let valorParcelaCorrigido = 0;

if (emp.tipoParcelamento === "parcelado") {
  // ✅ Parcelado → sempre o valor fixo da parcela
  valorParcelaCorrigido = emp.valoresOriginaisParcelas?.[idx] ?? 0;

} else {
  // ✅ Mês a mês → lógica antiga
  if (pago) {
    valorParcelaCorrigido =
      emp.valoresOriginaisParcelas?.[idx] ??
      emp.valorParcelasPendentes?.[idx] ??
      valorRecebido;
  } else {
    valorParcelaCorrigido = emp.valorOriginal * taxa;
  }
}


  return {
    data,
    pago,
    indice: idx,
    valorJuros,
    multa,
    diasAtraso,
    valorParcelaCorrigido,
    valorRecebido,
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
    const diaA = parseInt(a.data.split('-')[2], 10);
    const diaB = parseInt(b.data.split('-')[2], 10);
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

let taxaPercentual;

// ✅ Para parcelado, exibir "-"
if (emp.tipoParcelamento === "parcelado") {
  taxaPercentual = "-";

// ✅ Para juros, cálculo normal
} else {
  taxaPercentual = p.taxaJuros !== undefined 
    ? p.taxaJuros 
    : (((emp.valorComJuros / emp.valorOriginal) - 1) * 100).toFixed(1);
}


    let statusHTML = '';
    if (p.pago) {
      statusHTML = `<span style="font-weight:bold; color:#043604;">PAGO</span>`;
      if (p.valorRecebido > (p.valorParcelaCorrigido  + (p.multa || 0))) {
        statusHTML += ` <span title="Pago acima do mínimo" style="color:#ff9800; font-weight:bold;">➕</span>`;
      }
    } else {
      const isOperador = localStorage.getItem("isOperador") === "true";
      if (isOperador) {
        statusHTML = `<span style="font-weight:bold; color:#d9534f;">PENDENTE</span>`;
      } else {
        statusHTML = `<label class="parcela-checkbox">
          <input 
            type="checkbox"
            data-id="${emp.id}" 
            data-indice="${p.indice}"
            data-valor="${p.valorParcelaCorrigido}"
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
      <span>${taxaPercentual === "-" ? "-" : taxaPercentual + "%"}</span>
      <span>${formatarMoedaLista(p.valorParcelaCorrigido)}</span>
      <span>${p.multa > 0 ? (p.multa) : '-'}</span>
      <span>${statusHTML}</span>
    `;
    corpoTabela.appendChild(linha);

    // 🔹 Closure corrigido para abrir modal com o empréstimo correto
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
// 🔥 deixa global para ser chamada em qualquer lugar (inclusive dentro do modal)
// script principal
window.filtrarEmprestimos = filtrarEmprestimos;

window.emprestimosPorCidade = emprestimosPorCidade;
window.emprestimosPorGrupo = emprestimosPorGrupo;
window.resultadoFiltrado = resultadoFiltrado;
window.cidadeSelecionada = cidadeSelecionada;







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
    mostrarAlertaWarning("Nenhum dado para exportar");
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
    const valorParcela = p.valorParcela !== undefined ? p.valorParcela : p.valorParcelaCorrigido || 0;
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

document.querySelectorAll('.card-cidade').forEach(card => {
  card.addEventListener('click', () => {
    const grupo = card.getAttribute('data-grupo');
    document.getElementById('nomeCidadeSelecionada').textContent = grupo;

    // Mostra o bloco com filtros, legenda, etc.
    document.getElementById('secaoEmprestimosCidade').style.display = 'block';

    // Aqui você pode chamar sua função de carregamento de empréstimos:
    if (typeof carregarEmprestimosPorCidade === 'function') {
      carregarEmprestimosPorCidade(grupo);
    }
  });
});




