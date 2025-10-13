import { URL_SERVICO } from './config.js';
import { mostrarAlertaError, mostrarAlertaWarning, formatarMoeda } from './utils.js';
import {
  pesquisa,
  btnConsultarAtivos,
  resultado,
  pesquisaQuitados,
  btnConsultarQuitados,
  resultadoQuitados,
  inputDataVencimento,
  btnBuscarPorData,
  resultadoPorData,
  btnHoje,
  btnConsultarAtrasados,
  resultadoAtrasados 
} from './dom.js';


import { abrirModal } from './modal.js';
import {aplicarMascaraCPF} from './mascaras.js';
let termoAtual = ''; // Certifique-se de que termoAtual está declarado globalmente

// --- Pesquisa empréstimos ativos ---
// Helpers pra limpar resultados
const limparAtivos = () => { 
  resultado.innerHTML = '';
  termoAtual = '';
};
const limparQuitados = () => {
  resultadoQuitados.innerHTML = '';
};

// Função genérica: trata entrada como CPF (numérica) ou Nome (texto)
function tratarEntradaCPFouNome(inputEl, limparCb) {
  const textoAtual = inputEl.value;

  // Se há letras, considera modo "Nome": não mascara nem limita
  if (/[a-zA-Z]/.test(textoAtual)) {
    inputEl.removeAttribute('maxlength'); // não limitar nome
    if (textoAtual.trim().length < 3) limparCb();
    return;
  }

  // Modo "CPF": só números, limita a 11 e aplica máscara
  let digitos = textoAtual.replace(/\D/g, '').slice(0, 11);

  if (digitos.length === 0) {
    inputEl.value = '';
    inputEl.removeAttribute('maxlength');
    limparCb();
    return;
  }

  // Aplica máscara e trava o comprimento visual do CPF: 000.000.000-00 → 14 chars
  inputEl.value = aplicarMascaraCPF(digitos);
  inputEl.setAttribute('maxlength', '14');

  // (opcional) enquanto não tiver 11 dígitos, limpa resultados
  if (digitos.length < 11) {
    limparCb();
  }
}

// --- Pesquisa empréstimos ativos ---
pesquisa.addEventListener('input', (e) => {
  tratarEntradaCPFouNome(e.target, limparAtivos);
});

// --- Pesquisa empréstimos quitados ---
pesquisaQuitados.addEventListener('input', (e) => {
  tratarEntradaCPFouNome(e.target, limparQuitados);
});



// --- Busca empréstimos ativos ---
btnConsultarAtivos.addEventListener('click', async () => {
  const texto = pesquisa.value.trim();
  resultado.innerHTML = '';
  if (!texto) return;

  try {
    const res = await fetch(`${URL_SERVICO}/emprestimos?status=ativo&termo=${encodeURIComponent(texto)}`);
    if (!res.ok) throw new Error('Erro na busca');
    const dados = await res.json();

    if (!dados.length) {
      resultado.innerHTML = `
        <li class="mensagem-vazia">
          <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
          <p>Nenhum empréstimo encontrado</p>
        </li>`;
      return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    dados.forEach((emprestimo, index) => {
      const vencido = emprestimo.datasVencimentos?.some((data, i) => {
        const [ano, mes, dia] = data.split('-').map(Number);
        const vencimento = new Date(ano, mes - 1, dia);
        vencimento.setHours(0, 0, 0, 0);
        return vencimento < hoje && !emprestimo.statusParcelas[i];
      });

      const li = document.createElement('li');
      li.setAttribute('tabindex', '-1');
      li.classList.add('card-vencimento');
      li.innerHTML = `
        <h3>
          ${emprestimo.nome} | Dia vencimento: ${emprestimo.datasVencimentos.length > 0 ? emprestimo.datasVencimentos[emprestimo.datasVencimentos.length - 1].split('-')[2] : '-'}
        </h3>

        <p><strong>Valor:</strong> ${formatarMoeda(emprestimo.valorOriginal)} | <strong>Parcelas:</strong> ${emprestimo.parcelas}</p>
        <p><strong>Endereço:</strong> ${emprestimo.endereco}, ${emprestimo.numero}${emprestimo.complemento ? ' - ' + emprestimo.complemento : ''}</p>
        <p><strong>Cidade:</strong> ${emprestimo.cidade} - ${emprestimo.estado} | <strong>CEP:</strong> ${emprestimo.cep}</p>
        ${vencido ? '<p style="color: red; font-weight: bold;">ATRASADO</p>' : ''}
      `;

      li.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        abrirModal(emprestimo);
      });

      resultado.appendChild(li);

      setTimeout(() => {
        li.classList.add('mostrar');
      }, index * 100);
    });
  } catch (err) {
    console.error(err);
    mostrarAlertaError('Erro ao buscar empréstimos');
  }
});

// --- Busca empréstimos quitados ---
btnConsultarQuitados.addEventListener('click', async () => {
  const texto = pesquisaQuitados.value.trim();
  resultadoQuitados.innerHTML = '';
  if (!texto) return;

  try {
    const res = await fetch(`${URL_SERVICO}/emprestimos?status=quitado&termo=${encodeURIComponent(texto)}`);
    if (!res.ok) throw new Error('Erro na busca de quitados');
    const dados = await res.json();

    if (!dados.length) {
      resultadoQuitados.innerHTML = `
        <li class="mensagem-vazia">
          <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
          <p>Nenhum empréstimo encontrado</p>
        </li>`;
      return;
    }

    dados.forEach((emprestimo, index) => {
      const li = document.createElement('li');
      li.setAttribute('tabindex', '-1');
      li.classList.add('card-vencimento');
      li.innerHTML = `
        <h3>${emprestimo.nome}</h3>
        <p><strong>Valor:</strong> ${formatarMoeda(emprestimo.valorOriginal)} | <strong>Parcelas:</strong> ${emprestimo.parcelas}</p>
        <p><strong>Endereço:</strong> ${emprestimo.endereco}, ${emprestimo.numero}${emprestimo.complemento ? ' - ' + emprestimo.complemento : ''}</p>
        <p><strong>Cidade:</strong> ${emprestimo.cidade} - ${emprestimo.estado} | <strong>CEP:</strong> ${emprestimo.cep}</p>
        <p style="color: green; font-weight: bold;">QUITADO</p>
      `;

      li.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        abrirModal(emprestimo);
      });

      resultadoQuitados.appendChild(li);

      setTimeout(() => {
        li.classList.add('mostrar');
      }, index * 100);
    });
  } catch (err) {
    console.error(err);
    mostrarAlertaError('Erro ao buscar empréstimos quitados');
  }
});


btnConsultarAtrasados.addEventListener('click', async () => {
  resultadoAtrasados.innerHTML = '';

  try {
    const res = await fetch(`${URL_SERVICO}/emprestimos/inadimplentes`);
    if (!res.ok) throw new Error('Erro na busca de atrasados');

    const dados = await res.json();

    if (!dados.length) {
      resultadoAtrasados.innerHTML =        
      `<li class="mensagem-vazia">
          <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
          <p>Nenhum empréstimo encontrado</p>
        </li>
`;
      return;
    }

    dados.forEach((emprestimo, index) => {
      const li = document.createElement('li');
      li.setAttribute('tabindex', '-1');
      li.classList.add('card-vencimento');
      li.innerHTML = `
        <h3>${emprestimo.nome}</h3>
        <p><strong>Valor:</strong> ${formatarMoeda(emprestimo.valorComJuros)} | <strong>Parcelas:</strong> ${emprestimo.parcelas}</p>
        <p><strong>Endereço:</strong> ${emprestimo.endereco}, ${emprestimo.numero}${emprestimo.complemento ? ' - ' + emprestimo.complemento : ''}</p>
        <p><strong>Cidade:</strong> ${emprestimo.cidade} - ${emprestimo.estado} | <strong>CEP:</strong> ${emprestimo.cep}</p>
        <p style="color: red; font-weight: bold;">ATRASADO</p>
      `;

      li.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        abrirModal(emprestimo);
      });

      resultadoAtrasados.appendChild(li);

      setTimeout(() => {
        li.classList.add('mostrar');
      }, index * 100);
    });
  } catch (err) {
    console.error(err);
    mostrarAlertaError('Erro ao buscar empréstimos atrasados');
  }
});






// --- Busca por data de vencimento ---
btnBuscarPorData.addEventListener('click', async () => {
  const data = inputDataVencimento.value;
  if (!data) return mostrarAlertaWarning('Selecione uma data');

  try {
    const res = await fetch(`${URL_SERVICO}/emprestimos/vencimento/${data}`);
    if (!res.ok) throw new Error('Erro na busca por data');
    const dados = await res.json();

    resultadoPorData.innerHTML = '';
    if (!dados.length) {
      resultadoPorData.innerHTML = `
  <li class="mensagem-vazia">
    <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
    <p>Nenhum empréstimo encontrado</p>
  </li>
`;
      return;
    }

    dados.forEach((emprestimo, index) => {
      const li = document.createElement('li');
      li.setAttribute('tabindex', '-1');
      li.classList.add('card-vencimento');
  const enderecoCompleto = `${emprestimo.endereco}, ${emprestimo.numero} ${emprestimo.complemento || ''}, ${emprestimo.cidade} - ${emprestimo.estado}, ${emprestimo.cep}`;

    const urlWaze = `https://waze.com/ul?q=${encodeURIComponent(enderecoCompleto)}`;



      li.innerHTML = `
        <h3>${emprestimo.nome}</h3>
        <br>
        <p><strong>Valor:</strong> ${formatarMoeda(emprestimo.valorOriginal)} | <strong>Parcelas:</strong> ${emprestimo.parcelas}</p>
        <p>
        <strong>Endereço:</strong> ${emprestimo.endereco}, ${emprestimo.numero}${emprestimo.complemento ? ' - ' + emprestimo.complemento : ''}
        </p>
        <p><strong>Cidade:</strong> ${emprestimo.cidade} - ${emprestimo.estado} | <strong>CEP:</strong> ${emprestimo.cep}</p>
        <br>
        <p><strong>Abrir no Waze</strong> </p>
        <a href="${urlWaze}" target="_blank" title="Abrir no Waze" style="margin-left: 10px;">
            <img src="waze.png" alt="Waze" width="24" height="24" style="vertical-align: middle;" />
        </a>
      `;
li.querySelector('a').addEventListener('click', (e) => e.stopPropagation());

li.addEventListener('click', (e) => {
  e.preventDefault();           // impede comportamento padrão
  e.stopPropagation();          // impede propagação que pode causar scroll
  abrirModal(emprestimo);      // abre modal
});

      resultadoPorData.appendChild(li);

      setTimeout(() => {
        li.classList.add('mostrar');
      }, index * 100);
    });
  } catch (err) {
    console.error(err);
    mostrarAlertaError('Erro ao buscar empréstimos por data');
  }
});

// --- Botão para buscar pela data de hoje ---
btnHoje.addEventListener('click', () => {
  inputDataVencimento.valueAsDate = new Date();
  btnBuscarPorData.click(); // chama a busca
});

document.getElementById('btnLimparData').addEventListener('click', () => {
  resultadoPorData.innerHTML = '';
  inputDataVencimento.value = '';
});




async function lerEmprestimos() {
  try {
    const response = await fetch(`${URL_SERVICO}/emprestimos`);
    if (!response.ok) {
      throw new Error('Erro ao buscar empréstimos');
    }
    return await response.json();
  } catch (err) {
    mostrarAlertaError('Erro ao carregar empréstimos');
    console.error(err);
    return []; // retorna array vazio em caso de erro
  }
}


function exibirResultados(lista, resultadoId, index) {
  const container = document.getElementById(resultadoId);
  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = `
  <li class="mensagem-vazia">
    <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
    <p>Nenhum empréstimo encontrado</p>
  </li>
`;
    return;
  }

  lista.forEach((emprestimo, i) => {

    const enderecoCompleto = `${emprestimo.endereco}, ${emprestimo.numero} ${emprestimo.complemento || ''}, ${emprestimo.cidade} - ${emprestimo.estado}, ${emprestimo.cep}`;

    const urlWaze = `https://waze.com/ul?q=${encodeURIComponent(enderecoCompleto)}`;

    const li = document.createElement('li');
    li.setAttribute('tabindex', '-1');
    li.classList.add('card-vencimento');
    li.innerHTML = `
      <h3>${emprestimo.nome}</h3>
      <p><strong>Valor:</strong> ${formatarMoeda(emprestimo.valorOriginal)} | <strong>Parcelas:</strong> ${emprestimo.parcelas}</p>
      <p><strong>Endereço:</strong> ${emprestimo.endereco}, ${emprestimo.numero}${emprestimo.complemento ? ' - ' + emprestimo.complemento : ''}</p>
      <p><strong>Cidade:</strong> ${emprestimo.cidade} - ${emprestimo.estado} | <strong>CEP:</strong> ${emprestimo.cep}</p>
      <br>
      <p><strong>Abrir no Waze</strong> </p>
        <a href="${urlWaze}" target="_blank" title="Abrir no Waze" style="margin-left: 10px;">
            <img src="waze.png" alt="Waze" width="24" height="24" style="vertical-align: middle;" />
        </a>
    `;

        li.addEventListener('click', (e) => {
        e.preventDefault();           // impede comportamento padrão
        e.stopPropagation();          // impede propagação que pode causar scroll
        abrirModal(emprestimo);      // abre modal
        });


    container.appendChild(li);
    setTimeout(() => {
      li.classList.add('mostrar');
    }, i * 100);
  });
}


// // No seu novo arquivo (substitua a função filtrarEmprestimos)
function filtrarEmprestimos(dataFiltro) {
  resultadoFiltrado.innerHTML = '';
  
  if (!cidadeSelecionada || !emprestimosPorCidade[cidadeSelecionada]) return;
  
  const emprestimosFiltrados = emprestimosPorCidade[cidadeSelecionada].filter(emp => {
    if (!dataFiltro) return true;
    
    // Verifica se alguma parcela vence na data selecionada
    return emp.datasVencimentos?.some(data => data === dataFiltro) || false;
  });
  
  if (emprestimosFiltrados.length === 0) {
    resultadoFiltrado.innerHTML = '<li>Nenhum empréstimo encontrado</li>';
    return;
  }
  
  emprestimosFiltrados.forEach(emp => {
    const li = document.createElement('li');
    li.classList.add('card-vencimento');
    
    const temAtraso = emp.datasVencimentos?.some((data, i) => {
      return !emp.statusParcelas?.[i] && calcularDiasAtraso(data) > 0;
    });
    
    li.innerHTML = `
      <h3>${emp.nome} ${temAtraso ? '⚠️' : ''}</h3>
      <p><strong>Valor:</strong> ${formatarMoeda(emp.valorOriginal)} | <strong>Parcelas:</strong> ${emp.parcelas}</p>
      <p><strong>Endereço:</strong> ${emp.endereco}, ${emp.numero}${emp.complemento ? ' - ' + emp.complemento : ''}</p>
      <p><strong>Telefone:</strong> ${emp.telefone}</p>
    `;
    
    li.addEventListener('click', () => {
      abrirModal(emp);
    });
    
    resultadoFiltrado.appendChild(li);
  });
}


document.addEventListener("DOMContentLoaded", () => {
  listarVencidosOuHoje();
});

function formatarCPF(cpf) {
  // Formata CPF como 000.000.000-00
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
function criarDataLocal(dataStr) {
  if (!dataStr || typeof dataStr !== 'string') return null; // ignora inválidos
  const partes = dataStr.split('-');
  if (partes.length !== 3) return null; // formato errado
  return new Date(partes[0], partes[1] - 1, partes[2]);
}

async function listarVencidosOuHoje() {
  try {
    const res = await fetch(`${URL_SERVICO}/emprestimos/vencidos-ou-hoje`);
    const dados = await res.json();

    const containerAtrasados = document.querySelector('#containerAtrasados ul');
    const containerVencendoHoje = document.querySelector('#containerVencendoHoje ul');

    containerAtrasados.innerHTML = "";
    containerVencendoHoje.innerHTML = "";

    if (dados.length === 0) {
      const vazioHTML = `
        <li class="mensagem-vazia">
          <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
          <p>Nenhum empréstimo vencido ou vencendo hoje.</p>
        </li>
      `;
      containerAtrasados.innerHTML = vazioHTML;
      containerVencendoHoje.innerHTML = vazioHTML;
      return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    dados.forEach((emp, index) => {
      let proxVencimento = null;
      let statusVencimento = '';
      const enderecoCompleto = `${emp.endereco}, ${emp.numero} ${emp.complemento || ''}, ${emp.cidade} - ${emp.estado}, ${emp.cep}`;
      const urlWaze = `https://waze.com/ul?q=${encodeURIComponent(enderecoCompleto)}`;

      (emp.datasVencimentos || []).forEach((dataStr, i) => {
        const dataVenc = criarDataLocal(dataStr);
        if (!dataVenc) return; // ignora inválidas
        dataVenc.setHours(0, 0, 0, 0);

        // apenas parcelas não pagas
        if (!emp.statusParcelas[i]) {
          if (!proxVencimento || dataVenc < proxVencimento) {
            proxVencimento = dataVenc;
          }
        }
      });

      if (proxVencimento) {
        if (proxVencimento < hoje) {
          statusVencimento = '<span style="color: red; font-weight: bold;"><br><br>ATRASADO</span>';
        } else if (proxVencimento.getTime() === hoje.getTime()) {
          statusVencimento = '<span style="color: orange; font-weight: bold;"><br><br>VENCE HOJE</span>';
        }
      }

      const dataFormatada = proxVencimento
        ? proxVencimento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Data não disponível';

      if (!statusVencimento) return; // ignora quem não é atrasado nem vence hoje

      const li = document.createElement('li');
      li.setAttribute('tabindex', '-1');
      li.classList.add('card-vencimento');

      li.innerHTML = `
        <h3>${emp.nome}</h3>
        <p><strong>Endereço:</strong> ${emp.endereco}, Nº ${emp.numero}${emp.complemento ? '- ' + emp.complemento : ''}, ${emp.cidade} - ${emp.estado}</p>
        <p><strong>Telefone:</strong> ${emp.telefone || 'Não informado'}</p>
        <p class="data-vencimento"><strong>Vencimento:</strong> ${dataFormatada} ${statusVencimento}</p>
        <br>
        <p><strong>Abrir no Waze</strong></p>
        <a href="${urlWaze}" target="_blank" title="Abrir no Waze" style="margin-left: 10px;">
            <img src="waze.png" alt="Waze" width="24" height="24" style="vertical-align: middle;" />
        </a>
      `;

      li.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        abrirModal(emp);
      });

      const linkWaze = li.querySelector('a[href^="https://waze.com"]');
      if (linkWaze) {
        linkWaze.addEventListener('click', e => e.stopPropagation());
      }

      if (statusVencimento.includes('ATRASADO')) {
        containerAtrasados.appendChild(li);
      } else if (statusVencimento.includes('VENCE HOJE')) {
        containerVencendoHoje.appendChild(li);
      }

      setTimeout(() => {
        li.classList.add('mostrar');
      }, index * 100);
    });

  } catch (err) {
    console.error("Erro ao listar vencidos ou vencendo hoje", err);
  }
}



const btnExtrairPagamentos = document.getElementById("btnExtrairPagamentos");
const btnLimparExtracao = document.getElementById("btnLimparExtracao");
const resultadoExtracao = document.getElementById("resultadoExtracao");
const btnExportarPDF = document.getElementById("btnExportarPDF");



btnLimparExtracao.addEventListener("click", () => {
  // Limpa campos de data
  document.getElementById("dataInicio").value = "";
  document.getElementById("dataFim").value = "";

  // Limpa resultados da extração
  resultadoExtracao.innerHTML = "";
  resultadoExtracao.style.display = "none";

  // Esconde botão PDF
  btnExportarPDF.style.display = "none";

  // Limpa dados salvos para PDF
  dadosTotalPago = null;
});


let dadosTotalPago = null; // variável global para exportação PDF

btnExtrairPagamentos.addEventListener("click", async () => {
  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;

  if (!inicio || !fim) {
    return mostrarAlertaWarning("Selecione as duas datas (início e fim).");
  }

  try {
    const res = await fetch(`${URL_SERVICO}/relatorio/pagamentos?inicio=${inicio}&fim=${fim}`);
    if (!res.ok) throw new Error("Erro ao buscar pagamentos");

    const dados = await res.json();
    resultadoExtracao.innerHTML = "";
    resultadoExtracao.style.display = "block";

    if (!dados.emprestimos || !dados.emprestimos.length) {
      resultadoExtracao.innerHTML = `
        <li class="mensagem-vazia">
          <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
          <p>Nenhum pagamento encontrado nesse intervalo.</p>
        </li>`;
      btnExportarPDF.style.display = "none";
      return;
    }

    // --- Tabela de pagamentos ---
    const containerTabela = document.createElement("div");
    containerTabela.className = "parcelas-tabela";
    containerTabela.innerHTML = `
      <div class="parcelas-cabecalho">
        <span>Dia</span>
        <span>Cliente</span>
        <span>Parcela</span>
        <span>Valor Pago</span>
        <span>Recebido por</span>
      </div>
    `;
    const corpoTabela = document.createElement("div");
    corpoTabela.id = "pagamentos-corpo";
    containerTabela.appendChild(corpoTabela);

    let totalPago = 0;
    const listaPagamentos = [];

    dados.emprestimos.forEach(emp => {
      emp.pagamentos.forEach(p => {
        const diaPagamento = new Date(p.dataPagamento).getDate();
        totalPago += p.valor;

        listaPagamentos.push({
          dia: diaPagamento,
          cliente: emp.nomeCliente,
          parcela: p.parcela,
          valor: formatarMoeda(p.valor),
          recebidoPor: p.recebidoPor
        });

        const linha = document.createElement("div");
        linha.className = "parcela-linha paga";
        linha.innerHTML = `
          <span>${diaPagamento}</span>
          <span class="nome-cliente">${emp.nomeCliente}</span>
          <span>${p.parcela}</span>
          <span>${formatarMoeda(p.valor)}</span>
          <span>${p.recebidoPor}</span>
        `;
        corpoTabela.appendChild(linha);
      });
    });

    resultadoExtracao.appendChild(containerTabela);

    // --- Cartão Total Pago ---
    dadosTotalPago = { totalPago, listaPagamentos };
    const totalEl = document.createElement("div");
    totalEl.classList.add("total-pago-card");
    totalEl.innerHTML = `
      <div class="total-icone">💰</div>
      <div class="total-texto">
        <span class="total-titulo">Total Pago</span>
        <span class="total-valor">${formatarMoeda(totalPago)}</span>
      </div>
    `;
    resultadoExtracao.appendChild(totalEl);

    btnExportarPDF.style.display = "inline-block";

  } catch (err) {
    console.error(err);
    mostrarAlertaError("Erro ao extrair pagamentos.");
  } // <-- fechei o try/catch aqui
}); // <-- fechei o addEventListener corretamente


// --- Exportar PDF ---
btnExportarPDF.addEventListener('click', () => {
  if (!dadosTotalPago || !dadosTotalPago.totalPago) {
    alert("Nenhum dado para exportar");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Cabeçalho ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo de Pagamentos", 14, 20);
  doc.setLineWidth(0.8);
  doc.line(14, 22, 196, 22);

  // --- Datas filtradas ---
  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;
  let filtroTexto = "Período: ";
  if (inicio) filtroTexto += `${inicio}`;
  if (inicio && fim) filtroTexto += " até ";
  if (fim) filtroTexto += `${fim}`;

  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text(filtroTexto, 14, 30);

  // --- Total Pago ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 128, 0);
  doc.text(`Total Pago: ${formatarMoeda(dadosTotalPago.totalPago)}`, 14, 38);
  doc.setLineWidth(0.3);
  doc.line(14, 40, 196, 40);
  doc.setTextColor(0, 0, 0);

  // --- Tabela de pagamentos ---
  const rows = dadosTotalPago.listaPagamentos.map(p => [
    p.dia, p.cliente, p.parcela, p.valor, p.recebidoPor
  ]);

  doc.autoTable({
    head: [['Dia', 'Cliente', 'Parcela', 'Valor Pago', 'Recebido por']],
    body: rows,
    startY: 45, // deixa espaço para as datas e total
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [220,220,220], textColor: [0,0,0], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245,245,245] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 50 }
    }
  });

  doc.save("pagamentos.pdf");
});




