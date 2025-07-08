const URL_SERVICO = 'https://emprestimos-om94.onrender.com'
//const URL_SERVICO = 'http://localhost:3000'

const form = document.getElementById('emprestimoForm');
const pesquisa = document.getElementById('pesquisa');
const resultado = document.getElementById('resultado');
const cpfInput = document.getElementById('cpf');

// const btnQuitados = document.getElementById('btnQuitados');
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
  }
}

function destacarTipoSelecionado() {
  ['ativos', 'quitados', 'inadimplentes'].forEach(tipo => {
    const el = document.getElementById(tipo);
    if (tipo === tipoSelecionado) {
      el.style.backgroundColor = '#3498db';
      el.style.color = '#fff';
    } else {
      el.style.backgroundColor = '#ecf0f1';
      el.style.color = '#2c3e50';
    }
  });
}

['ativos', 'quitados', 'inadimplentes'].forEach(tipo => {
  document.getElementById(tipo).addEventListener('click', () => {
    tipoSelecionado = tipo;
    destacarTipoSelecionado();
  });
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

// Inicializa o dashboard ao carregar a página
window.addEventListener('load', carregarEstatisticas);









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
    await fetch(`${URL_SERVICO}/emprestimos/${emprestimo.id}/parcela/${indice}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataPagamento, nomeRecebedor: nome })
    });

    mostrarAlerta(`Parcela ${indice + 1} marcada como paga por ${nome}`);
    checkbox.checked = true;
    checkbox.disabled = true;
    emprestimo.statusParcelas[indice] = true;

    abrirModal(emprestimoSelecionado);
    if (termoAtual) await realizarBusca(termoAtual);

  } catch (err) {
    mostrarAlertaError('Erro ao marcar parcela como paga');
    checkbox.checked = false;
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
  


      li.addEventListener('click', () => abrirModal(e));
      resultadoPorData.appendChild(li);
    });
  } catch (err) {
    mostrarAlertaError('Erro ao buscar empréstimos por data');
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


cepInput.addEventListener('input', () => {
  const cep = cepInput.value.replace(/\D/g, '');
  if (cep.length === 8) {
    cepInput.blur(); // força o evento 'blur' após completar os 8 dígitos
  }
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
    mostrarAlerta('CEP inválido', '#f44336');
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      mostrarAlerta('CEP não encontrado', '#f44336');
      return;
    }

    enderecoInput.value = data.logradouro || '';
    cidadeInput.value = data.localidade || '';
    estadoInput.value = data.uf || '';
    mostrarAlerta('Endereço preenchido com sucesso!');

  } catch (err) {
    mostrarAlerta('Erro ao buscar o CEP', '#f44336');
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


const jurosInput = document.createElement('input');
jurosInput.type = 'number';
jurosInput.id = 'juros';
jurosInput.placeholder = 'Porcentagem de juros';
jurosInput.min = 0;
jurosInput.max = 100;
jurosInput.step = 1;
//jurosInput.value = 20; // valor default 20%

// Adiciona o campo de juros antes do infoValores
form.insertBefore(jurosInput, infoValores);
jurosInput.addEventListener('input', atualizarResumoValores);

let termoAtual = '';



function mostrarAlerta(mensagem, cor = '#4caf50') {
  const alerta = document.getElementById('alertaCustom');
  alerta.textContent = mensagem;
  alerta.style.backgroundColor = cor;
  alerta.style.display = 'block';

  setTimeout(() => {
    alerta.style.display = 'none';
  }, 3000); // oculta após 3 segundos
}


function mostrarAlertaError(mensagem, cor = '#f44336') {
  const alerta = document.getElementById('alertaCustom');
  alerta.textContent = mensagem;
  alerta.style.backgroundColor = cor;
  alerta.style.display = 'block';

  setTimeout(() => {
    alerta.style.display = 'none';
  }, 3000); // oculta após 3 segundos
}


function mostrarAlertaWarning(mensagem, cor = '#ffc107') {
  const alerta = document.getElementById('alertaCustom');
  alerta.textContent = mensagem;
  alerta.style.backgroundColor = cor;
  alerta.style.display = 'block';

  setTimeout(() => {
    alerta.style.display = 'none';
  }, 3000); // oculta após 3 segundos
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
  atualizarResumoValores();
});


parcelasInput.addEventListener('input', atualizarResumoValores);

// Função para abrir modal com dados do empréstimo
// ... (código anterior até abrirModal)

async function abrirModal(emprestimo) {
  const taxaJurosNumero = Number(emprestimo.taxaJuros);
const taxaFormatada = isNaN(taxaJurosNumero) ? 20 : taxaJurosNumero.toFixed(0);
  
  modalCorpo.innerHTML = `
    <div class="modal-layout">
      <div id="detalhesEmprestimo" style="flex: 1;">
        <p><strong>Nome:</strong> ${emprestimo.nome}</p>
        <br>
        <p><strong>Email:</strong> ${emprestimo.email}</p>
        <br>
        <p><strong>Telefone:</strong> ${emprestimo.telefone}</p>
        <br>
        <p><strong>CPF:</strong> ${emprestimo.cpf}</p>
        <br>
        <p><strong>CEP:</strong> ${emprestimo.cep}</p>
        <br>
        <p><strong>Endereço:</strong> ${emprestimo.endereco}</p>
        <br>
        <p><strong>Número:</strong> ${emprestimo.numero}</p>
        <br>
        <p><strong>Complemento:</strong> ${emprestimo.complemento}</p>
        <br>  
        <p><strong>Cidade:</strong> ${emprestimo.cidade}</p>
        <br>
        <p><strong>Estado:</strong> ${emprestimo.estado}</p>
        <br>        
        <hr />
        <br>
        <p><strong>Valor original:</strong> ${formatarMoeda(emprestimo.valorOriginal)}</p>
        <br>
        <p><strong>Valor com juros (${taxaFormatada}%):</strong> ${formatarMoeda(emprestimo.valorComJuros)}</p>
        <br>
        <p><strong>Parcelas:</strong> ${emprestimo.parcelas}x de ${formatarMoeda(emprestimo.valorParcela)}</p>
        <br>
        ${emprestimo.quitado ? '<p style="color: green"><strong>QUITADO</strong></p>' : ''}
      </div>

      <div id="parcelasContainer" style="flex: 1;">
        <h3>Parcelas</h3>
      </div>
      </div>
    </div>
  `
if (emprestimo.arquivos && emprestimo.arquivos.length > 0) {
const listaArquivos = emprestimo.arquivos.map(a => 
  `<li><a href="${URL_SERVICO}${a.caminho}" target="_blank">${a.nomeOriginal}</a></li>`
).join('');


  modalCorpo.querySelector('#detalhesEmprestimo').innerHTML += `
    <br><h3>📎 Arquivos Anexados</h3>
    <ul>${listaArquivos}</ul>
  `;
}  
  
  ;

  const parcelasContainer = document.getElementById('parcelasContainer');
  const parcelas = emprestimo.statusParcelas || Array.from({ length: emprestimo.parcelas }, () => false);
  const datasPagamentos = emprestimo.datasPagamentos || Array.from({ length: emprestimo.parcelas }, () => null);

  parcelas.forEach((paga, i) => {
    const item = document.createElement('div');
    item.style.marginBottom = '8px';
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
  ? vencimento.split('-').reverse().join('/') // yyyy-mm-dd → dd/mm/yyyy
  : null;

const valorParcelaFormatado = formatarMoeda(emprestimo.valorParcela);

function parseDateLocal(dateString) {
  const [yyyy, mm, dd] = dateString.split('-');
  return new Date(yyyy, mm - 1, dd); // mês começa em 0 no JS
}

let html = `<strong>📦 Parcela ${i + 1}:</strong> ${valorParcelaFormatado}<br>`;
if (dataVencimento) {
  html += `<strong>📅 Vencimento:</strong> ${dataVencimento}<br>`;
}

if (vencimento && !paga) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // zera hora para só data

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
  const nomeRecebedor = emprestimo.recebidoPor?.[i] || 'N/A';
  html += `<strong>✅ Paga em:</strong> ${data}<br>`;
  html += `<strong>🙍‍♂️ Recebido por:</strong> ${nomeRecebedor} às ${horario}`;
}


    label.innerHTML = html;


chk.addEventListener('change', async () => {
  if (chk.checked) { // só faz se for para marcar como paga

    if (i > 0 && !parcelas[i - 1]) {
      mostrarAlertaWarning(`Você precisa marcar a parcela ${i} como paga antes de marcar a parcela ${i + 1}.`);
      chk.checked = false;
      return;
    }

      chk.checked = false; // impede marcação até o modal confirmar
      parcelaSelecionada = { emprestimo, indice: i, checkbox: chk }; // armazena tudo o que precisa
      emprestimoSelecionado = emprestimo;
      modalRecebedor.style.display = 'flex';
      inputRecebedor.value = '';
      inputRecebedor.focus();
      return; // o restante da lógica virá depois da confirmação no modal
  }
});


    item.appendChild(chk);
    item.appendChild(label);
    parcelasContainer.appendChild(item);
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

// Captura e formata enquanto digita
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
  console.log('Datas de vencimento selecionadas:', vencimentos);
  vencimentos.forEach(data => formData.append('datasVencimentos', data));
console.log('Todos os dados enviados:');
for (let pair of formData.entries()) {
  console.log(`${pair[0]}:`, pair[1]);
}
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
      return;
    }

    mostrarAlerta('Empréstimo cadastrado com sucesso!');
    form.reset();
    atualizarResumoValores(); // para atualizar valores e limpar tabela

  } catch (error) {
    mostrarAlertaError(`Erro ao salvar: ${error.message}`);
  }
});

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('input-data-parcela')) {
    console.log(`Parcela ${parseInt(e.target.dataset.index) + 1} alterada para: ${e.target.value}`);
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
  const res = await fetch(`${URL_SERVICO}/emprestimos?termo=${termo}`);
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


    // Abrir modal ao clicar no item (não no botão Ver Parcelas)
    li.addEventListener('click', (event) => {
      if(event.target.tagName.toLowerCase() !== 'button') {
        abrirModal(e);
      }
    });

    resultado.appendChild(li);
        setTimeout(() => {
      li.classList.add('mostrar');
    }, 10);
  });
}




pesquisaQuitados.addEventListener('input', (e) => {
  e.target.value = aplicarMascaraCPF(e.target.value);

  const cpfNumeros = e.target.value.replace(/\D/g, '');

  // Se tiver menos de 11 dígitos, limpa os resultados
  if (cpfNumeros.length < 11) {
    resultadoQuitados.innerHTML = '';
  }
});

document.getElementById('btnConsultarQuitados').addEventListener('click', async () => {
  const termo = pesquisaQuitados.value.trim().toLowerCase();
  if (termo === '') {
    resultadoQuitados.innerHTML = '';
    mostrarAlertaWarning('Informe um CPF para consultar');
    return;
  }

  const res = await fetch(`${URL_SERVICO}/emprestimos/quitados`);
  const dados = await res.json();

  const filtrado = dados.filter(e =>
    e.cpf && e.cpf.toLowerCase().includes(termo)
  );

  resultadoQuitados.innerHTML = '';

  if (filtrado.length === 0) {
    resultadoQuitados.innerHTML = '<li>Nenhum resultado encontrado</li>';
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
      <p id="quitado" style="color: green" >QUITADO</p>
    `;


    li.addEventListener('click', () => abrirModal(e));
    resultadoQuitados.appendChild(li);
     setTimeout(() => li.classList.add('mostrar'), 10);
  });
});


const anexosInput = document.getElementById('anexos');
anexosInput.addEventListener('change', () => {
  const files = anexosInput.files;
  if (files.length > 0) {
    const nomes = Array.from(files).map(file => file.name).join(', ');
    mostrarAlerta(`Arquivos selecionados: ${nomes}`, '#004085');
  }
});
