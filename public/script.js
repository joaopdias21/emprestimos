//const URL_SERVICO = 'https://emprestimos-om94.onrender.com'
const URL_SERVICO = 'http://localhost:3000'

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
const datasVencimentos = Array.from(document.querySelectorAll('.input-data-parcela'))
  .map(input => input.value);


  

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
    <div style="display: flex; gap: 40px; align-items: flex-start;">
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
        ${emprestimo.quitado ? '<p style="color: green"><strong>QUITADO</strong></p>' : ''}
      </div>

      <div id="parcelasContainer" style="flex: 1;">
        <h3>Parcelas</h3>
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
const dataVencimento = vencimento ? new Date(vencimento).toLocaleDateString('pt-BR') : null;
const valorParcelaFormatado = formatarMoeda(emprestimo.valorParcela);

let html = `<strong>📦 Parcela ${i + 1}:</strong> ${valorParcelaFormatado}<br>`;
    if (dataVencimento) {
      html += `<strong>📅 Vencimento:</strong> ${dataVencimento}<br>`;
    }
    if (paga && datasPagamentos[i]) {
      const data = new Date(datasPagamentos[i]).toLocaleDateString('pt-BR');
      html += `<strong>✅ Paga em:</strong> ${data}`;
    }
    label.innerHTML = html;


    chk.addEventListener('change', async () => {
      if (i > 0 && !parcelas[i - 1]) {
        mostrarAlertaWarning(`Você precisa marcar a parcela ${i} como paga antes de marcar a parcela ${i + 1}.`);
        chk.checked = false;
        return;
      }

      const dataPagamento = new Date().toISOString();

      await fetch(`${URL_SERVICO}/emprestimos/${emprestimo.id}/parcela/${i}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataPagamento })
      });

      mostrarAlerta(`Parcela ${i + 1} marcada como paga em ${new Date(dataPagamento).toLocaleString('pt-BR')}`);

      parcelas[i] = true;
      chk.disabled = true;

      abrirModal(emprestimo);
      if (termoAtual) {
        await realizarBusca(termoAtual);
      }
    });

    item.appendChild(chk);
    item.appendChild(label);
    parcelasContainer.appendChild(item);
  });

  modal.style.display = 'flex';
}



// Fecha modal ao clicar no X
modalFechar.onclick = () => {
  modal.style.display = 'none';
}

// Fecha modal ao clicar fora da caixa de conteúdo
window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
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

  const valorComJuros = valorNumerico * 1.2;

  infoValores.innerHTML = `
    <p>Valor original: <strong>${formatarMoeda(valorNumerico)}</strong></p>
    <p>Valor com juros (20%): <strong>${formatarMoeda(valorComJuros)}</strong></p>
  `;
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
      return;
    }

    mostrarAlerta('Empréstimo cadastrado com sucesso!');
    form.reset();
    atualizarResumoValores(); // para atualizar valores e limpar tabela

  } catch (error) {
    mostrarAlertaError(`Erro ao salvar: ${error.message}`);
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
    li.innerHTML = `
      <p><strong>${e.nome}</strong></p>
      <p>Valor original: ${formatarMoeda(e.valorOriginal)}</p>
      <p>Valor com juros: ${formatarMoeda(e.valorComJuros)}</p>
      <p>${e.parcelas}x de ${formatarMoeda(e.valorParcela)}</p>
    `;

    // Abrir modal ao clicar no item (não no botão Ver Parcelas)
    li.addEventListener('click', (event) => {
      if(event.target.tagName.toLowerCase() !== 'button') {
        abrirModal(e);
      }
    });

    const btnVerParcelas = document.createElement('button');
    btnVerParcelas.textContent = 'Ver parcelas';

    const divParcelas = document.createElement('div');
    divParcelas.style.display = 'none';

    btnVerParcelas.onclick = () => {
      if (divParcelas.style.display === 'none') {
        divParcelas.innerHTML = '';

        const parcelas = e.statusParcelas || Array.from({ length: e.parcelas }, () => false);
        parcelas.forEach((paga, i) => {
          const item = document.createElement('div');
          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.checked = paga;
          chk.disabled = paga;

          chk.addEventListener('change', async () => {
            if (i > 0 && !parcelas[i - 1]) {
              mostrarAlertaWarning(`Você precisa marcar a parcela ${i} como paga antes de marcar a parcela ${i + 1}.`);
              chk.checked = false;
              return;
            }

            await fetch(`${URL_SERVICO}/emprestimos/${e.id}/parcela/${i}`, {
              method: 'PATCH'
            });

            mostrarAlerta(`Parcela ${i + 1} marcada como paga`);

            await realizarBusca(termoAtual);
          });

          item.textContent = `Parcela ${i + 1} - R$ ${e.valorParcela.toFixed(2)} `;
          item.appendChild(chk);
          divParcelas.appendChild(item);
        });

        divParcelas.style.display = 'block';
        btnVerParcelas.textContent = 'Ocultar parcelas';
      } else {
        divParcelas.style.display = 'none';
        btnVerParcelas.textContent = 'Ver parcelas';
      }
    };

    li.appendChild(btnVerParcelas);
    li.appendChild(divParcelas);
    resultado.appendChild(li);
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
    li.innerHTML = `
      <p><strong>${e.nome}</strong></p>
      <p>Valor original: ${formatarMoeda(e.valorOriginal)}</p>
      <p>Valor com juros: ${formatarMoeda(e.valorComJuros)}</p>
      <p>${e.parcelas}x de ${formatarMoeda(e.valorParcela)}</p>
      <p style="color: green"><strong>QUITADO</strong></p>
    `;

    li.addEventListener('click', () => abrirModal(e));
    resultadoQuitados.appendChild(li);
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
