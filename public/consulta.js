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
      resultado.innerHTML = 
       `<li class="mensagem-vazia">
          <img src="vazio.png" alt="Sem resultados" width="64" height="64" style="margin-bottom: 10px;" />
          <p>Nenhum empréstimo encontrado</p>
        </li>
`;
      return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // zera hora

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
              <h3>${emprestimo.nome}</h3>
              <p><strong>Valor:</strong> ${formatarMoeda(emprestimo.valorComJuros)} | <strong>Parcelas:</strong> ${emprestimo.parcelas}</p>
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
    const res = await fetch(`${URL_SERVICO}/emprestimos/quitados?termo=${encodeURIComponent(texto)}`);
    if (!res.ok) throw new Error('Erro na busca de quitados');
    const dados = await res.json();

    if (!dados.length) {
      resultadoQuitados.innerHTML =        
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


// Consulta única por cidade e data
document.getElementById('btnBuscarUnico').addEventListener('click', () => {
  const cidade = document.getElementById('seletorCidade').value;
  const data = document.getElementById('inputDataUnica').value;

  if (!cidade || !data) {
    mostrarAlertaWarning('Por favor, selecione uma cidade e uma data.');
    return;
  }

  filtrarPorDataECidade(data, cidade, 'resultadoUnico');
});

// Preenche com a data de hoje e dispara busca se cidade estiver selecionada
document.getElementById('btnHojeUnico').addEventListener('click', () => {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('inputDataUnica').value = hoje;

  const cidade = document.getElementById('seletorCidade').value;
  if (cidade) {
    filtrarPorDataECidade(hoje, cidade, 'resultadoUnico');
  }
});

// Limpa resultados e inputs
document.getElementById('btnLimparUnico').addEventListener('click', () => {
  document.getElementById('resultadoUnico').innerHTML = '';
  document.getElementById('inputDataUnica').value = '';
  document.getElementById('seletorCidade').selectedIndex = 0;
});

document.getElementById('btnHojeUnico').addEventListener('click', () => {
  const cidade = document.getElementById('seletorCidade').value;

  if (!cidade) {
    mostrarAlertaError('Por favor, selecione uma cidade antes de usar o botão "Hoje"');
    return;
  }

  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('inputDataUnica').value = hoje;
  filtrarPorDataECidade(hoje, cidade, 'resultadoUnico');
});


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





