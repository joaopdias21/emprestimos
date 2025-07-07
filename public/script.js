const URL_SERVICO = 'https://emprestimos-om94.onrender.com'
//const URL_SERVICO = 'http://localhost:3000'

const form = document.getElementById('emprestimoForm');
const pesquisa = document.getElementById('pesquisa');
const resultado = document.getElementById('resultado');
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


// Função para formatar número como moeda brasileira
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}


function atualizarResumoValores() {
  const valorNumerico = +valorInput.value.replace(/\D/g, '') / 100;
  const qtdParcelas = parseInt(parcelasInput.value);

  // Se jurosInput.value for vazio, usa 20
  let taxaJuros = parseFloat(jurosInput.value);
  if (isNaN(taxaJuros) || taxaJuros === '') {
    taxaJuros = 20; // valor default 20%
  }
  taxaJuros = taxaJuros / 100;

  if (isNaN(valorNumerico) || isNaN(qtdParcelas) || qtdParcelas <= 0) {
    infoValores.innerHTML = '';
    return;
  }

  const valorComJuros = valorNumerico * (1 + taxaJuros);
  const valorParcela = valorComJuros / qtdParcelas;

infoValores.innerHTML = `
  <p>Valor original: <strong>${formatarMoeda(valorNumerico)}</strong></p>
  <p>Valor com juros (${(taxaJuros * 100).toFixed(0)}%): <strong>${formatarMoeda(valorComJuros)}</strong></p>
  <p>${qtdParcelas}x de <strong>${formatarMoeda(valorParcela)}</strong></p>
`;

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
        <p><strong>Valor com juros (${(emprestimo.taxaJuros || 20).toFixed(0)}%):</strong> ${formatarMoeda(emprestimo.valorComJuros)}</p>
        <br>
        <p><strong>Parcelas:</strong> ${emprestimo.parcelas}x de ${formatarMoeda(emprestimo.valorParcela)}</p>
        ${emprestimo.quitado ? '<p style="color: green"><strong>QUITADO</strong></p>' : ''}
      </div>

      <div id="parcelasContainer" style="flex: 1;">
        <h3>Parcelas</h3>
      </div>
    </div>
  `;

  const parcelasContainer = document.getElementById('parcelasContainer');
  const parcelas = emprestimo.statusParcelas || Array.from({ length: emprestimo.parcelas }, () => false);
  const datasPagamentos = emprestimo.datasPagamentos || Array.from({ length: emprestimo.parcelas }, () => null);

  parcelas.forEach((paga, i) => {
    const item = document.createElement('div');
    item.style.marginBottom = '8px';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = paga;
    chk.disabled = paga;

    const label = document.createElement('label');
    label.style.marginLeft = '6px';
    label.textContent = `Parcela ${i + 1} - ${formatarMoeda(emprestimo.valorParcela)}`;

    // Exibir data se já foi paga
    if (paga && datasPagamentos[i]) {
      const data = new Date(datasPagamentos[i]).toLocaleDateString('pt-BR');
      label.textContent += ` (paga em ${data})`;
    }

    chk.addEventListener('change', async () => {
      if (i > 0 && !parcelas[i - 1]) {
        mostrarAlerta(`Você precisa marcar a parcela ${i} como paga antes de marcar a parcela ${i + 1}.`);
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
  const data = {
    nome: document.getElementById('nome').value,
    email: document.getElementById('email').value,
    telefone: document.getElementById('telefone').value,
    cpf: document.getElementById('cpf').value,
    endereco: document.getElementById('endereco').value,
    cidade: document.getElementById('cidade').value,
    estado: document.getElementById('estado').value,
    numero: document.getElementById('numero').value,
    complemento: document.getElementById('complemento').value,
    cep: document.getElementById('cep').value,
    valor: +document.getElementById('valor').value.replace(/\D/g, '') / 100,
    parcelas: parseInt(document.getElementById('parcelas').value),
    taxaJuros: parseFloat(jurosInput.value) || 20
  };

  await fetch(`${URL_SERVICO}/emprestimos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  mostrarAlerta('Empréstimo cadastrado!');
  form.reset();
});

pesquisa.addEventListener('input', async () => {
  termoAtual = pesquisa.value.trim();

  if (termoAtual === '') {
    resultado.innerHTML = '';
    return;
  }

  await realizarBusca(termoAtual);
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
              mostrarAlerta(`Você precisa marcar a parcela ${i} como paga antes de marcar a parcela ${i + 1}.`);
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




pesquisaQuitados.addEventListener('input', async () => {
  const termo = pesquisaQuitados.value.trim().toLowerCase();

  if (termo === '') {
    resultadoQuitados.innerHTML = '';
    return;
  }

  const res = await fetch(`${URL_SERVICO}/emprestimos/quitados`);
  const dados = await res.json();

  const termoNormalizado = termo.toLowerCase();

  const filtrado = dados.filter(e =>
    e.cpf && e.cpf.toLowerCase().includes(termoNormalizado)
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

  li.addEventListener('click', () => {
    abrirModal(e);
  });

  resultadoQuitados.appendChild(li);
});

});
