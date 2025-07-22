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
  btnHoje
} from './dom.js';


import { abrirModal } from './modal.js';
import {aplicarMascaraCPF} from './mascaras.js';
let termoAtual = ''; // Certifique-se de que termoAtual está declarado globalmente

pesquisa.addEventListener('input', (e) => {
  e.target.value = aplicarMascaraCPF(e.target.value);

  const cpfNumeros = e.target.value.replace(/\D/g, '');

  // Se tiver menos de 11 dígitos, limpa os resultados
  if (cpfNumeros.length < 11) {
    resultado.innerHTML = '';
    termoAtual = '';
  }
});


pesquisaQuitados.addEventListener('input', (e) => {
  e.target.value = aplicarMascaraCPF(e.target.value);

  const cpfNumeros = e.target.value.replace(/\D/g, '');

  if (cpfNumeros.length < 11) {
    resultadoQuitados.innerHTML = '';
  }
});

// --- Busca empréstimos ativos ---
btnConsultarAtivos.addEventListener('click', async () => {
  const texto = pesquisa.value.trim();
  resultado.innerHTML = '';
  if (!texto) return;

  try {
    const res = await fetch(`${URL_SERVICO}/emprestimos?termo=${encodeURIComponent(texto)}`);
    if (!res.ok) throw new Error('Erro na busca');
    const dados = await res.json();

    if (!dados.length) {
      resultado.innerHTML = '<li>Nenhum empréstimo encontrado.</li>';
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
      `;

li.addEventListener('click', (e) => {
  e.preventDefault();           // impede comportamento padrão
  e.stopPropagation();          // impede propagação que pode causar scroll
  abrirModal(emprestimo);      // abre modal
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
    const res = await fetch(`${URL_SERVICO}/emprestimos/quitados?termo=${encodeURIComponent(texto)}`);
    if (!res.ok) throw new Error('Erro na busca de quitados');
    const dados = await res.json();

    if (!dados.length) {
      resultadoQuitados.innerHTML = '<li>Nenhum empréstimo quitado encontrado.</li>';
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
  e.preventDefault();           // impede comportamento padrão
  e.stopPropagation();          // impede propagação que pode causar scroll
  abrirModal(emprestimo);      // abre modal
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