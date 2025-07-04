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

let termoAtual = '';

// Função para formatar número como moeda brasileira
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Função para abrir modal com dados do empréstimo
// ... (código anterior até abrirModal)

async function abrirModal(emprestimo) {
  modalCorpo.innerHTML = `
    <div style="display: flex; gap: 40px; align-items: flex-start;">
      <div id="detalhesEmprestimo" style="flex: 1;">
        <p><strong>Nome:</strong> ${emprestimo.nome}</p>
        <p><strong>Email:</strong> ${emprestimo.email}</p>
        <p><strong>Telefone:</strong> ${emprestimo.telefone}</p>
        <p><strong>CPF:</strong> ${emprestimo.cpf}</p>
        <hr />
        <p><strong>Valor original:</strong> ${formatarMoeda(emprestimo.valorOriginal)}</p>
        <p><strong>Valor com juros:</strong> ${formatarMoeda(emprestimo.valorComJuros)}</p>
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
        alert(`Você precisa marcar a parcela ${i} como paga antes de marcar a parcela ${i + 1}.`);
        chk.checked = false;
        return;
      }

      const dataPagamento = new Date().toISOString();

      await fetch(`http://localhost:3000/emprestimos/${emprestimo.id}/parcela/${i}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataPagamento })
      });

      alert(`Parcela ${i + 1} marcada como paga em ${new Date(dataPagamento).toLocaleString('pt-BR')}`);

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
    valor: +document.getElementById('valor').value.replace(/\D/g, '') / 100,
    parcelas: parseInt(document.getElementById('parcelas').value),
  };

  await fetch('http://localhost:3000/emprestimos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  alert('Empréstimo cadastrado!');
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
  const res = await fetch(`http://localhost:3000/emprestimos?termo=${termo}`);
  const dados = await res.json();

  const termoNormalizado = termo.toLowerCase();

  const filtrado = dados.filter(e => {
    const nome = e.nome ? e.nome.toLowerCase() : '';
    const cpf = e.cpf ? e.cpf.toLowerCase() : '';
    return nome.includes(termoNormalizado) || cpf.includes(termoNormalizado);
  });

  resultado.innerHTML = '';

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
              alert(`Você precisa marcar a parcela ${i} como paga antes de marcar a parcela ${i + 1}.`);
              chk.checked = false;
              return;
            }

            await fetch(`http://localhost:3000/emprestimos/${e.id}/parcela/${i}`, {
              method: 'PATCH'
            });

            alert(`Parcela ${i + 1} marcada como paga`);

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

  const res = await fetch('http://localhost:3000/emprestimos/quitados');
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
