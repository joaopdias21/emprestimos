const URL_SERVICO = 'https://emprestimos-om94.onrender.com'
//const URL_SERVICO = 'http://localhost:3000'

const form = document.getElementById('emprestimoForm');
const pesquisa = document.getElementById('pesquisa');
const resultado = document.getElementById('resultado');
const cpfInput = document.getElementById('cpf');

const resultadoQuitados = document.getElementById('resultadoQuitados');
const valorInput = document.getElementById('valor');
const infoValores = document.getElementById('infoValores');
const pesquisaQuitados = document.getElementById('pesquisaQuitados');
const modal = document.getElementById('modalDetalhes');
const modalCorpo = document.getElementById('modalCorpo');
const modalFechar = document.getElementById('modalFechar');
const parcelasInput = document.getElementById('parcelas');
const cepInput = document.getElementById('cep');
const enderecoInput = document.getElementById('endereco');
const cidadeInput = document.getElementById('cidade');
const estadoInput = document.getElementById('estado');
const numeroInput = document.getElementById('numero');
const complementoInput = document.getElementById('complemento');
const consultarCepBtn = document.getElementById('consultarCep');

const inputDataVencimento = document.getElementById('inputDataVencimento');
const btnBuscarPorData = document.getElementById('btnBuscarPorData');
const btnHoje = document.getElementById('btnHoje');

const resultadoPorData = document.getElementById('resultadoPorData');

const modalRecebedor = document.getElementById('modalRecebedor');
const inputRecebedor = document.getElementById('inputRecebedor');
const btnCancelarRecebedor = document.getElementById('btnCancelarRecebedor');
const btnConfirmarRecebedor = document.getElementById('btnConfirmarRecebedor');

let parcelaSelecionada = null;
let emprestimoSelecionado = null;
let tipoSelecionado = 'ativos';
let termoAtual = ''; // Certifique-se de que termoAtual está declarado globalmente



document.addEventListener("DOMContentLoaded", function () {
  const dashboardItems = document.querySelectorAll(".dashboard-item");

  dashboardItems.forEach(item => {
    item.addEventListener("click", () => {
      // Remove a classe "ativo" de todos
      dashboardItems.forEach(i => i.classList.remove("ativo"));
      // Adiciona a classe no item clicado
      item.classList.add("ativo");
    });
  });
});


// --- Lógica de Autenticação e Exibição de Botões ---
document.addEventListener('DOMContentLoaded', () => {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const authButtonsContainer = document.getElementById("authButtonsContainer");
  const adminPanel = document.querySelector(".admin-panel");

  // Limpa o container de botões antes de adicionar novos
  authButtonsContainer.innerHTML = '';

  if (isAdmin) {
    // Se for admin, mostra apenas o botão de Sair
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.textContent = 'Sair';
    authButtonsContainer.appendChild(logoutBtn);

    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isAdmin");
      location.reload(); // Recarrega a página para aplicar as mudanças de visibilidade
    });

    // Mostra o painel de administração
    if (adminPanel) {
      adminPanel.style.display = "flex"; // Ou "block" dependendo do seu layout desejado
    }
    document.getElementById("buscarEmprestimos").style.display = "block";
    document.getElementById("buscarQuitados").style.display = "block";
    document.getElementById("emprestimosPorData").style.display = "block";
    document.getElementById("dashboard").style.display = "flex"; // Dashboard é flex para seus itens internos
  } else {
    // Se não for admin, mostra apenas o botão de login
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Fazer login como administrador';
    loginBtn.onclick = () => { window.location.href = 'login.html'; };
    authButtonsContainer.appendChild(loginBtn);

    // Esconde o painel de administração
    if (adminPanel) {
      adminPanel.style.display = "none";
    }
    document.getElementById("buscarEmprestimos").style.display = "none";
    document.getElementById("buscarQuitados").style.display = "none";
    document.getElementById("emprestimosPorData").style.display = "none";
    document.getElementById("dashboard").style.display = "none";
  }

  // Inicializa o dashboard ao carregar a página (chama apenas se for admin)
  if (isAdmin) {
    carregarEstatisticas();
  }
});

async function carregarEstatisticas() {
  try {
    const resAtivos = await fetch(`${URL_SERVICO}/emprestimos?status=ativo`);
    const ativos = await resAtivos.json();

    const resQuitados = await fetch(`${URL_SERVICO}/emprestimos/quitados`);
    const quitados = await resQuitados.json();

    const resInadimplentes = await fetch(`${URL_SERVICO}/emprestimos/inadimplentes`);
    const inadimplentes = await resInadimplentes.json();

    document.getElementById('ativosCount').textContent = ativos.length;
    document.getElementById('quitadosCount').textContent = quitados.length;
    document.getElementById('inadimplentesCount').textContent = inadimplentes.length;

    // Salva para exportar depois
    window.ativosData = ativos;
    window.quitadosData = quitados;
    window.inadimplentesData = inadimplentes;

    destacarTipoSelecionado(); // Atualiza o estilo do dashboard

  } catch (err) {
    mostrarAlertaError('Erro ao carregar estatísticas do dashboard');
    console.error('Erro ao carregar estatísticas:', err); // Log para depuração
  }
}

function destacarTipoSelecionado() {
  ['ativos', 'quitados', 'inadimplentes'].forEach(tipo => {
    const el = document.getElementById(tipo);
    if (el) { // Adicionado verificação para garantir que o elemento existe
      if (tipo === tipoSelecionado) {
        el.classList.add('selected'); // Usa classe para o estilo
      } else {
        el.classList.remove('selected');
      }
    }
  });
}

// Adiciona event listeners para os itens do dashboard
['ativos', 'quitados', 'inadimplentes'].forEach(tipo => {
  const el = document.getElementById(tipo);
  if (el) { // Adicionado verificação para garantir que o elemento existe
    el.addEventListener('click', () => {
      tipoSelecionado = tipo;
      destacarTipoSelecionado();
    });
  }
});


function converterParaCSV(dados) {
  if (!dados || dados.length === 0) return '';

  const colunas = Object.keys(dados[0]);
  const linhas = dados.map(obj =>
    colunas.map(col => `"${(obj[col] ?? '').toString().replace(/"/g, '""')}"`).join(',')
  );

  return [colunas.join(','), ...linhas].join('\r\n');
}

function baixarArquivoCSV(nomeArquivo, conteudo) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', nomeArquivo);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

document.getElementById('exportCSV').addEventListener('click', () => {
  let dadosExportar = [];
  if (tipoSelecionado === 'ativos') dadosExportar = window.ativosData || [];
  else if (tipoSelecionado === 'quitados') dadosExportar = window.quitadosData || [];
  else if (tipoSelecionado === 'inadimplentes') dadosExportar = window.inadimplentesData || [];

  if (!dadosExportar.length) {
    mostrarAlertaWarning('Nenhum dado para exportar neste tipo');
    return;
  }

  const csv = converterParaCSV(dadosExportar);
  baixarArquivoCSV(`emprestimos_${tipoSelecionado}.csv`, csv);
});


btnCancelarRecebedor.addEventListener('click', () => {
  modalRecebedor.style.display = 'none';
  parcelaSelecionada = null;
});

btnConfirmarRecebedor.addEventListener('click', async () => {
  const nome = inputRecebedor.value;
  if (!nome) {
    mostrarAlertaWarning('Selecione o nome de quem recebeu.');
    return;
  }

  const { emprestimo, indice, checkbox } = parcelaSelecionada;
  const dataPagamento = new Date().toISOString();

  try {
    const response = await fetch(`${URL_SERVICO}/emprestimos/${emprestimo.id}/parcela/${indice}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataPagamento, nomeRecebedor: nome })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro do servidor: ${errorText}`);
    }

    mostrarAlerta(`Parcela ${indice + 1} marcada como paga por ${nome}`);
    checkbox.checked = true;
    checkbox.disabled = true;
    // Atualiza o statusParcelas e recebidoPor no objeto local para que o modal reflita a mudança
    if (!emprestimo.statusParcelas) emprestimo.statusParcelas = [];
    emprestimo.statusParcelas[indice] = true;
    if (!emprestimo.datasPagamentos) emprestimo.datasPagamentos = [];
    emprestimo.datasPagamentos[indice] = dataPagamento;
    if (!emprestimo.recebidoPor) emprestimo.recebidoPor = [];
    emprestimo.recebidoPor[indice] = nome;


    abrirModal(emprestimoSelecionado); // Reabre o modal com os dados atualizados
    if (termoAtual) await realizarBusca(termoAtual); // Atualiza a lista de resultados se houver uma busca ativa

  } catch (err) {
    mostrarAlertaError(`Erro ao marcar parcela como paga: ${err.message}`);
    console.error('Erro ao marcar parcela como paga:', err);
    checkbox.checked = false; // Garante que o checkbox não fique marcado se houver erro
  }

  modalRecebedor.style.display = 'none';
  parcelaSelecionada = null;
});

document.getElementById('btnLimparData').addEventListener('click', () => {
  resultadoPorData.innerHTML = '';
  inputDataVencimento.value = '';
});

btnBuscarPorData.addEventListener('click', async () => {
  const data = inputDataVencimento.value;
  if (!data) {
    mostrarAlertaWarning('Selecione uma data');
    return;
  }

  try {
    const res = await fetch(`${URL_SERVICO}/emprestimos/vencimento/${data}`);
    const dados = await res.json();

    resultadoPorData.innerHTML = '';

    if (dados.length === 0) {
      resultadoPorData.innerHTML = '<li>Nenhum empréstimo vence nesta data</li>';
      return;
    }

    dados.forEach(e => {
      const li = document.createElement('li');
      li.classList.add('card-vencimento');
      li.innerHTML = `
        <h3>${e.nome}</h3>
        <p><strong>Valor:</strong> ${formatarMoeda(e.valorOriginal)} | <strong>Parcelas:</strong> ${e.parcelas}</p>
        <p><strong>Endereço:</strong> ${e.endereco}, ${e.numero}${e.complemento ? ' - ' + e.complemento : ''}</p>
        <p><strong>Cidade:</strong> ${e.cidade} - ${e.estado} | <strong>CEP:</strong> ${e.cep}</p>
        <div class="lista-parcelas">
          <p><strong>Parcelas com vencimento:</strong></p>
          <ul>
            ${e.datasVencimentos
              .map((v, i) => {
                if (v === data) {
                  const dataFormatada = new Date(data).toLocaleDateString('pt-BR');
                  const paga = e.statusParcelas?.[i] ? `✅ Paga em ${dataFormatada}` : '❌ Não paga';
                  return `<li>Parcela ${i + 1} - ${formatarMoeda(e.valorParcela)} (${paga})</li>`;
                }
                return '';
              })
              .join('')}
          </ul>
        </div>
      `;
      li.addEventListener('click', () => abrirModal(e));
      resultadoPorData.appendChild(li);
      setTimeout(() => li.classList.add('mostrar'), 10);
    });
  } catch (err) {
    mostrarAlertaError('Erro ao buscar empréstimos por data');
    console.error('Erro ao buscar empréstimos por data:', err); // Log para depuração
  }
});


btnHoje.addEventListener('click', () => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const dataAtual = `${ano}-${mes}-${dia}`;

  inputDataVencimento.value = dataAtual;
  btnBuscarPorData.click(); // reutiliza a lógica já existente
});


function aplicarMascaraCPF(valor) {
  valor = valor.replace(/\D/g, ''); // Remove tudo que não é número
  if (valor.length > 11) valor = valor.slice(0, 11); // Limita a 11 dígitos

  if (valor.length > 9) {
    valor = valor.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  } else if (valor.length > 6) {
    valor = valor.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  } else if (valor.length > 3) {
    valor = valor.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  }
  return valor;
}

cpfInput.addEventListener('input', (e) => {
  e.target.value = aplicarMascaraCPF(e.target.value);
});


cepInput.addEventListener('input', (e) => {
  let valor = e.target.value.replace(/\D/g, '');
  if (valor.length > 5) {
    valor = valor.slice(0, 5) + '-' + valor.slice(5, 8);
  }
  e.target.value = valor;
});


consultarCepBtn.addEventListener('click', async () => {
  const cep = cepInput.value.replace(/\D/g, '');

  if (cep.length !== 8) {
    mostrarAlertaWarning('CEP inválido');
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

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
    console.error('Erro ao buscar CEP:', err); // Log para depuração
  }
});

cepInput.addEventListener('input', () => {
  const cep = cepInput.value.replace(/\D/g, '');
  if (cep.length !== 8) {
    enderecoInput.value = '';
    cidadeInput.value = '';
    estadoInput.value = '';
  }
});

// Cria e insere o input de juros (já estava no seu script, mas movi para o topo para melhor organização)
const jurosInput = document.createElement('input');
jurosInput.type = 'number';
jurosInput.id = 'juros';
jurosInput.placeholder = 'Porcentagem de juros';
jurosInput.min = 0;
jurosInput.max = 100;
jurosInput.step = 1;
jurosInput.value = 20; // valor default 20%
form.insertBefore(jurosInput, infoValores); // Adiciona o campo de juros antes do infoValores
jurosInput.addEventListener('input', atualizarResumoValores);


function mostrarAlerta(mensagem, cor = '#4caf50') {
  const alerta = document.getElementById('alertaCustom');
  alerta.textContent = mensagem;
  alerta.style.backgroundColor = cor;
  alerta.style.display = 'block';

  setTimeout(() => {
    alerta.style.display = 'none';
  }, 3000); // oculta após 3 segundos
}

function mostrarAlertaError(mensagem) {
  mostrarAlerta(mensagem, '#f44336');
}

function mostrarAlertaWarning(mensagem) {
  mostrarAlerta(mensagem, '#ffc107');
}

// Função para formatar número como moeda brasileira
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function atualizarResumoValores() {
  const valorNumerico = +valorInput.value.replace(/\D/g, '') / 100;
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
  const primeiroVencimento = new Date(hoje);
  primeiroVencimento.setMonth(primeiroVencimento.getMonth() + 1);

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

    const dataFormatada = vencimento.toISOString().split('T')[0]; // formato yyyy-mm-dd para <input type="date">

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

valorInput.addEventListener('input', (e) => {
  const valorNumerico = +e.target.value.replace(/\D/g, '') / 100;
  if (isNaN(valorNumerico)) {
    valorInput.value = '';
    infoValores.innerHTML = '';
    return;
  }
  valorInput.value = formatarMoeda(valorNumerico);
  atualizarResumoValores(); // Garante atualização da tabela de parcelas
});

parcelasInput.addEventListener('input', atualizarResumoValores);

async function abrirModal(emprestimo) {
  emprestimoSelecionado = emprestimo; // Armazena o empréstimo atual para uso posterior no modal de recebimento

  const taxaJurosNumero = Number(emprestimo.taxaJuros);
  const taxaFormatada = isNaN(taxaJurosNumero) ? 20 : taxaJurosNumero.toFixed(0);

  modalCorpo.innerHTML = `
    <div class="modal-layout">
      <div id="detalhesEmprestimo" style="flex: 1;">
        <p><strong>Nome:</strong> ${emprestimo.nome}</p>
        <p><strong>Email:</strong> ${emprestimo.email}</p>
        <p><strong>Telefone:</strong> ${emprestimo.telefone}</p>
        <p><strong>CPF:</strong> ${emprestimo.cpf}</p>
        <p><strong>CEP:</strong> ${emprestimo.cep}</p>
        <p><strong>Endereço:</strong> ${emprestimo.endereco}</p>
        <p><strong>Número:</strong> ${emprestimo.numero}</p>
        <p><strong>Complemento:</strong> ${emprestimo.complemento || 'N/A'}</p>
        <p><strong>Cidade:</strong> ${emprestimo.cidade}</p>
        <p><strong>Estado:</strong> ${emprestimo.estado}</p>
        <hr />
        <p><strong>Valor original:</strong> ${formatarMoeda(emprestimo.valorOriginal)}</p>
        <p><strong>Valor com juros (${taxaFormatada}%):</strong> ${formatarMoeda(emprestimo.valorComJuros)}</p>
        <p><strong>Parcelas:</strong> ${emprestimo.parcelas}x de ${formatarMoeda(emprestimo.valorParcela)}</p>
        ${emprestimo.quitado ? '<p style="color: green; font-weight: bold;">QUITADO</p>' : ''}
      </div>

      <div id="parcelasContainer" style="flex: 1;">
        <h3>Parcelas</h3>
      </div>
    </div>
  `;

  if (emprestimo.arquivos && emprestimo.arquivos.length > 0) {
    const listaArquivos = emprestimo.arquivos.map(a =>
      `<li><a href="${URL_SERVICO}${a.caminho}" target="_blank">${a.nomeOriginal}</a></li>`
    ).join('');

    modalCorpo.querySelector('#detalhesEmprestimo').innerHTML += `
      <br><h3>📎 Arquivos Anexados</h3>
      <ul>${listaArquivos}</ul>
    `;
  }

  const parcelasContainer = document.getElementById('parcelasContainer');
  const parcelas = emprestimo.statusParcelas || Array.from({ length: emprestimo.parcelas }, () => false);
  const datasPagamentos = emprestimo.datasPagamentos || Array.from({ length: emprestimo.parcelas }, () => null);
  const recebidoPor = emprestimo.recebidoPor || Array.from({ length: emprestimo.parcelas }, () => null);


parcelas.forEach((paga, i) => {
  const item = document.createElement('div');
  item.style.marginBottom = '16px'; // Espaçamento maior entre parcelas
  item.style.display = 'flex';
  item.style.alignItems = 'flex-start';

  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = paga;
  chk.disabled = paga;
  chk.style.marginRight = '10px';
  chk.style.transform = 'scale(1.5)';
  chk.style.cursor = 'pointer';
  chk.style.marginTop = '4px';

  const label = document.createElement('label');
  label.style.lineHeight = '1.4';

  const vencimento = emprestimo.datasVencimentos?.[i];
  const dataVencimento = vencimento
    ? vencimento.split('-').reverse().join('/')
    : null;

  const valorParcelaFormatado = formatarMoeda(emprestimo.valorParcela);

  function parseDateLocal(dateString) {
    const [yyyy, mm, dd] = dateString.split('-');
    return new Date(yyyy, mm - 1, dd);
  }

  let html = `<strong>📦 Parcela ${i + 1}:</strong> ${valorParcelaFormatado}<br>`;
  if (dataVencimento) {
    html += `<strong>📅 Vencimento:</strong> ${dataVencimento}<br>`;
  }

  if (vencimento && !paga) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataVenc = parseDateLocal(vencimento);
    dataVenc.setHours(0, 0, 0, 0);

    if (hoje.getTime() === dataVenc.getTime()) {
      html += `<strong style="color: orange;">📅 Vence hoje</strong><br>`;
    } else if (hoje > dataVenc) {
      const diffTime = hoje.getTime() - dataVenc.getTime();
      const diasAtraso = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const multa = diasAtraso * 20;

      html += `<strong style="color: red;">⚠️ Atrasada:</strong> ${diasAtraso} dia(s)<br>`;
      html += `<strong style="color: red;">Multa:</strong> ${formatarMoeda(multa)}<br>`;
    }
  }

  if (paga && datasPagamentos[i]) {
    const data = new Date(datasPagamentos[i]).toLocaleDateString('pt-BR');
    const horario = new Date(datasPagamentos[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nomeRecebedor = recebidoPor[i] || 'N/A';
    html += `<strong>✅ Paga em:</strong> ${data}<br>`;
    html += `<strong>🙍‍♂️ Recebido por:</strong> ${nomeRecebedor} às ${horario}`;
  }

  label.innerHTML = html;

  chk.addEventListener('change', async () => {
    if (chk.checked) {
      if (i > 0 && !parcelas[i - 1]) {
        mostrarAlertaWarning(`Você precisa marcar a parcela ${i} como paga antes de marcar a parcela ${i + 1}.`);
        chk.checked = false;
        return;
      }

      chk.checked = false;
      parcelaSelecionada = { emprestimo: emprestimo, indice: i, checkbox: chk };
      modalRecebedor.style.display = 'flex';
      inputRecebedor.value = '';
      inputRecebedor.focus();
    }
  });

  item.appendChild(chk);
  item.appendChild(label);
  parcelasContainer.appendChild(item);

  // Adiciona linha horizontal entre parcelas, exceto após a última
  if (i < parcelas.length - 1) {
    const hr = document.createElement('hr');
    hr.style.border = 'none';
    hr.style.borderTop = '1px solid #ccc';
    hr.style.margin = '8px 0 16px';
    parcelasContainer.appendChild(hr);
  }
});


  modal.style.display = 'flex';
  document.body.classList.add('modal-aberto');
}

// Fecha modal ao clicar no X
modalFechar.onclick = () => {
  modal.style.display = 'none';
  document.body.classList.remove('modal-aberto');
}

// Fecha modal ao clicar fora da caixa de conteúdo
window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-aberto');
  }
}

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
  formData.append('valor', +document.getElementById('valor').value.replace(/\D/g, '') / 100);
  formData.append('parcelas', parseInt(document.getElementById('parcelas').value));
  formData.append('taxaJuros', parseFloat(jurosInput.value) || 20);

  const vencimentos = Array.from(document.querySelectorAll('.input-data-parcela')).map(input => input.value);
  vencimentos.forEach(data => formData.append('datasVencimentos', data));

  const arquivos = document.getElementById('anexos').files;
  for (let i = 0; i < arquivos.length; i++) {
    formData.append('anexos', arquivos[i]);
  }

  try {
    const response = await fetch(`${URL_SERVICO}/emprestimos`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const erro = await response.text();
      mostrarAlertaError(`Erro ao salvar: ${erro}`);
      console.error('Erro ao salvar empréstimo:', erro); // Log para depuração
      return;
    }

    mostrarAlerta('Empréstimo cadastrado com sucesso!');
    form.reset();
    atualizarResumoValores(); // para atualizar valores e limpar tabela
    carregarEstatisticas(); // Atualiza o dashboard

  } catch (error) {
    mostrarAlertaError(`Erro ao salvar: ${error.message}`);
    console.error('Erro de rede ou desconhecido:', error); // Log para depuração
  }
});

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('input-data-parcela')) {
    // Lógica para quando a data de uma parcela é alterada, se necessário
  }
});

pesquisa.addEventListener('input', (e) => {
  e.target.value = aplicarMascaraCPF(e.target.value);

  const cpfNumeros = e.target.value.replace(/\D/g, '');

  // Se tiver menos de 11 dígitos, limpa os resultados
  if (cpfNumeros.length < 11) {
    resultado.innerHTML = '';
    termoAtual = '';
  }
});

document.getElementById('btnConsultarAtivos').addEventListener('click', () => {
  termoAtual = pesquisa.value.trim();
  if (termoAtual === '') {
    resultado.innerHTML = '';
    mostrarAlertaWarning('Informe um CPF para consultar');
    return;
  }
  realizarBusca(termoAtual);
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

pesquisaQuitados.addEventListener('input', (e) => {
  e.target.value = aplicarMascaraCPF(e.target.value);

  const cpfNumeros = e.target.value.replace(/\D/g, '');

  if (cpfNumeros.length < 11) {
    resultadoQuitados.innerHTML = '';
  }
});

document.getElementById('btnConsultarQuitados').addEventListener('click', async () => {
  const termo = pesquisaQuitados.value.trim();
  if (termo === '') {
    resultadoQuitados.innerHTML = '';
    mostrarAlertaWarning('Informe um CPF para consultar empréstimos quitados');
    return;
  }

  try {
    const res = await fetch(`${URL_SERVICO}/emprestimos/quitados?termo=${termo}`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Erro ao buscar empréstimos quitados: ${errorText}`);
    }
    const dados = await res.json();

    const termoNormalizado = termo.toLowerCase();

    const filtrado = dados.filter(e => {
      const nome = e.nome ? e.nome.toLowerCase() : '';
      const cpf = e.cpf ? e.cpf.toLowerCase() : '';
      return nome.includes(termoNormalizado) || cpf.includes(termoNormalizado);
    });

    resultadoQuitados.innerHTML = '';

    if (filtrado.length === 0) {
      resultadoQuitados.innerHTML = '<li>Nenhum resultado de empréstimo quitado encontrado</li>';
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
        <p style="color: green; font-weight: bold;">QUITADO</p>
      `;
      li.addEventListener('click', () => abrirModal(e));
      resultadoQuitados.appendChild(li);
      setTimeout(() => {
        li.classList.add('mostrar');
      }, 10);
    });
  } catch (err) {
    mostrarAlertaError(`Erro ao realizar busca de quitados: ${err.message}`);
    console.error('Erro na busca de quitados:', err); // Log para depuração
  }
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


function exibirResultados(lista, resultadoId) {
  const container = document.getElementById(resultadoId);
  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = '<li>Nenhum empréstimo encontrado</li>';
    return;
  }

  lista.forEach(e => {
    const li = document.createElement('li');
    li.classList.add('card-vencimento');
    li.innerHTML = `
      <h3>${e.nome}</h3>
      <p><strong>Valor:</strong> ${formatarMoeda(e.valorOriginal)} | <strong>Parcelas:</strong> ${e.parcelas}</p>
      <p><strong>Endereço:</strong> ${e.endereco}, ${e.numero}${e.complemento ? ' - ' + e.complemento : ''}</p>
      <p><strong>Cidade:</strong> ${e.cidade} - ${e.estado} | <strong>CEP:</strong> ${e.cep}</p>
    `;
    li.addEventListener('click', () => abrirModal(e));
    container.appendChild(li);
    setTimeout(() => li.classList.add('mostrar'), 10);
  });
}



async function filtrarPorDataECidade(dataSelecionada, cidadeFiltro, resultadoId) {
  const todosEmprestimos = await lerEmprestimos(); // <- await aqui
  const filtrados = todosEmprestimos.filter(emp => {
    const cidade = emp.cidade?.toLowerCase().trim();
    const datas = emp.datasVencimentos || [];

    return cidade === cidadeFiltro.toLowerCase().trim() &&
      datas.some(data => new Date(data).toISOString().split('T')[0] === dataSelecionada);
  });

  exibirResultados(filtrados, resultadoId);
}




// ======== SÃO ROQUE ========
document.getElementById('btnBuscarSaoRoque').addEventListener('click', () => {
  const data = document.getElementById('inputDataSaoRoque').value;
  filtrarPorDataECidade(data, 'São Roque', 'resultadoSaoRoque');
});

document.getElementById('btnHojeSaoRoque').addEventListener('click', () => {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('inputDataSaoRoque').value = hoje;
  filtrarPorDataECidade(hoje, 'São Roque', 'resultadoSaoRoque');
});

document.getElementById('btnLimparSaoRoque').addEventListener('click', () => {
  document.getElementById('resultadoSaoRoque').innerHTML = '';
  document.getElementById('inputDataSaoRoque').value = '';
});

// ======== COTIA ========
document.getElementById('btnBuscarCotia').addEventListener('click', () => {
  const data = document.getElementById('inputDataCotia').value;
  filtrarPorDataECidade(data, 'Cotia', 'resultadoCotia');
});

document.getElementById('btnHojeCotia').addEventListener('click', () => {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('inputDataCotia').value = hoje;
  filtrarPorDataECidade(hoje, 'Cotia', 'resultadoCotia');
});

document.getElementById('btnLimparCotia').addEventListener('click', () => {
  document.getElementById('resultadoCotia').innerHTML = '';
  document.getElementById('inputDataCotia').value = '';
});

// ======== SOROCABA ========
document.getElementById('btnBuscarSorocaba').addEventListener('click', () => {
  const data = document.getElementById('inputDataSorocaba').value;
  filtrarPorDataECidade(data, 'Sorocaba', 'resultadoSorocaba');
});

document.getElementById('btnHojeSorocaba').addEventListener('click', () => {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('inputDataSorocaba').value = hoje;
  filtrarPorDataECidade(hoje, 'Sorocaba', 'resultadoSorocaba');
});

document.getElementById('btnLimparSorocaba').addEventListener('click', () => {
  document.getElementById('resultadoSorocaba').innerHTML = '';
  document.getElementById('inputDataSorocaba').value = '';
});
