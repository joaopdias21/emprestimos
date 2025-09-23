import { URL_SERVICO } from './config.js';
import { mostrarAlerta, mostrarAlertaError, formatarMoeda, mostrarAlertaWarning } from './utils.js';

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('emprestimoForm');
  const tipoParcelamentoRadios = document.querySelectorAll('input[name="tipoParcelamento"]');
  const campoParcelas = document.getElementById('campo-parcelas');
  const inputParcelas = document.getElementById('parcelas');
  const inputValor = document.getElementById('valor');
  const infoValores = document.getElementById('infoValores');
  const tabelaParcelas = document.getElementById('tabelaParcelas');
  
  // ✅ Cria o input de taxa de juros dinamicamente
  const jurosInput = document.createElement('input');
  jurosInput.type = 'number';
  jurosInput.id = 'taxaJuros';
  jurosInput.placeholder = 'Porcentagem de juros';
  jurosInput.min = 0;
  jurosInput.max = 100;
  jurosInput.step = 1;
  jurosInput.value = 20;
  jurosInput.style.margin = '10px 0';
  jurosInput.style.padding = '8px';
  jurosInput.style.width = '100%';
  jurosInput.style.boxSizing = 'border-box';
  
  // ✅ Insere o input de juros antes do infoValores
  infoValores.parentNode.insertBefore(jurosInput, infoValores);

  // Função para formatar input de moeda
  function formatarInputMoeda(input) {
    input.addEventListener('input', () => {
      let valor = input.value.replace(/\D/g, '');

      if (valor.length === 0) {
        input.value = 'R$ 0,00';
        return;
      }

      valor = (parseInt(valor, 10) / 100).toFixed(2) + '';
      valor = valor.replace('.', ',');
      valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');

      input.value = 'R$ ' + valor;
    });

    input.addEventListener('focus', () => {
      if (input.value.trim() === '') {
        input.value = 'R$ 0,00';
      }
    });

    input.addEventListener('blur', () => {
      if (input.value === 'R$ 0,00') {
        input.value = '';
      }
    });
  }

  // Formata o input de valor
  formatarInputMoeda(inputValor);

  // Função para formatar valor monetário
  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  // ✅ FUNÇÃO ÚNICA para calcular e exibir as parcelas
  function calcularParcelas() {
    // Converte o valor para número
    const valorEmprestimo = parseFloat(inputValor.value.replace(/[^\d,]/g, '').replace(',', '.'));
    const tipoSelecionado = document.querySelector('input[name="tipoParcelamento"]:checked').value;
    const numParcelas = tipoSelecionado === 'parcelado' ? parseInt(inputParcelas.value) : 1;
    
    // Pega a taxa de juros do input dinâmico
    let taxaJuros = parseFloat(jurosInput.value);
    if (isNaN(taxaJuros) || taxaJuros === '') {
      taxaJuros = 20; // default
    }

    // Limpa a tabela se não houver valor válido
    if (!valorEmprestimo || isNaN(valorEmprestimo) || valorEmprestimo <= 0) {
      infoValores.innerHTML = '';
      tabelaParcelas.innerHTML = '';
      return;
    }

    const valorTotalComJuros = valorEmprestimo * (1 + taxaJuros / 100);
    const valorJuros = valorTotalComJuros - valorEmprestimo;

    if (tipoSelecionado === 'mes-a-mes') {
      // Mês a mês: cada parcela é apenas o valor dos juros
      const valorParcela = valorJuros;
      
      infoValores.innerHTML = `
        <div class="info-valor">
          <strong>Valor do empréstimo:</strong> ${formatarMoeda(valorEmprestimo)}<br>
          <strong>Juros (${taxaJuros}%):</strong> ${formatarMoeda(valorJuros)}<br>
          <strong>Valor total:</strong> ${formatarMoeda(valorTotalComJuros)}<br>
          <strong>Parcelas:</strong> 1x de ${formatarMoeda(valorParcela)} (apenas juros)
        </div>
      `;

      tabelaParcelas.innerHTML = `
        <table class="tabela-parcelas">
          <tr>
            <th>Parcela</th>
            <th>Valor</th>
            <th>Vencimento</th>
          </tr>
          <tr>
            <td>1ª</td>
            <td>${formatarMoeda(valorParcela)}</td>
            <td><input type="date" class="input-data-parcela" data-index="0"></td>
          </tr>
        </table>
      `;

    } else {
      // Parcelado: divide o valor total com juros igualmente
      const valorParcela = valorTotalComJuros / numParcelas;
      
      infoValores.innerHTML = `
        <div class="info-valor">
          <strong>Valor do empréstimo:</strong> ${formatarMoeda(valorEmprestimo)}<br>
          <strong>Juros (${taxaJuros}%):</strong> ${formatarMoeda(valorJuros)}<br>
          <strong>Valor total:</strong> ${formatarMoeda(valorTotalComJuros)}<br>
          <strong>Parcelas:</strong> ${numParcelas}x de ${formatarMoeda(valorParcela)}
        </div>
      `;

      // Cria a tabela com datas
      const hoje = new Date();
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
      
      for (let i = 0; i < numParcelas; i++) {
        const vencimento = new Date(hoje);
        vencimento.setMonth(vencimento.getMonth() + i + 1);
        const dataFormatada = vencimento.toISOString().split('T')[0];

        tabelaHTML += `
          <tr>
            <td>${i + 1}ª</td>
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
  }

  // Função para atualizar a visibilidade do campo de parcelas
  function atualizarCampoParcelas() {
    const tipoSelecionado = document.querySelector('input[name="tipoParcelamento"]:checked').value;
    
    if (tipoSelecionado === 'parcelado') {
      campoParcelas.style.display = 'block';
      inputParcelas.setAttribute('required', 'true');
      inputParcelas.value = inputParcelas.value || '12';
    } else {
      campoParcelas.style.display = 'none';
      inputParcelas.removeAttribute('required');
      inputParcelas.value = '1';
    }
    
    calcularParcelas();
  }

  // ✅ ADICIONA EVENT LISTENERS PARA TODOS OS INPUTS RELEVANTES
  tipoParcelamentoRadios.forEach(radio => {
    radio.addEventListener('change', atualizarCampoParcelas);
  });

  inputValor.addEventListener('input', calcularParcelas);
  inputParcelas.addEventListener('input', calcularParcelas);
  jurosInput.addEventListener('input', calcularParcelas); // ✅ Adiciona listener para o juros

  // ✅ LISTENER para arquivos
  document.getElementById('anexos').addEventListener('change', function () {
    const files = Array.from(this.files).map(file => file.name);
    document.getElementById('nomeArquivos').textContent = files.length
      ? files.join(', ')
      : 'Nenhum arquivo selecionado';
  });

  // Inicializa o campo
  atualizarCampoParcelas();

  // ✅ SUBMIT do formulário
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const tipoParcelamento = document.querySelector('input[name="tipoParcelamento"]:checked').value;
    const parcelas = tipoParcelamento === 'parcelado' ? parseInt(inputParcelas.value) : 1;
    
    // Define a URL correta
    const url = tipoParcelamento === 'parcelado' ? `${URL_SERVICO}/emprestimos/parcelado` : `${URL_SERVICO}/emprestimos`;
    
    // Coleta os dados do formulário
    const formData = new FormData();
    formData.append('nome', document.getElementById('nome').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('telefone', document.getElementById('telefone').value);
    formData.append('cpf', document.getElementById('cpf').value);
    formData.append('cep', document.getElementById('cep').value);
    formData.append('endereco', document.getElementById('endereco').value);
    formData.append('numero', document.getElementById('numero').value);
    formData.append('complemento', document.getElementById('complemento').value);
    formData.append('cidade', document.getElementById('cidade').value);
    formData.append('estado', document.getElementById('estado').value);
    
    // ✅ Formata o valor corretamente
    const valorNumerico = parseFloat(inputValor.value.replace(/[^\d,]/g, '').replace(',', '.'));
    formData.append('valor', valorNumerico);
    
    formData.append('parcelas', parcelas);
    formData.append('taxaJuros', jurosInput.value || 20);
    
    // ✅ Adiciona datas de vencimento
    const vencimentos = Array.from(document.querySelectorAll('.input-data-parcela'))
      .map(input => input.value)
      .filter(data => data !== '');
    vencimentos.forEach(data => formData.append('datasVencimentos', data));
    
    // Adiciona arquivos
    const anexos = document.getElementById('anexos').files;
    for (let i = 0; i < anexos.length; i++) {
      formData.append('anexos', anexos[i]);
    }
    
    // Envia para a rota correta
    fetch(url, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Erro ao cadastrar empréstimo');
      }
      return response.json();
    })
    .then(data => {
      mostrarAlerta('Empréstimo cadastrado com sucesso!');
      form.reset();
      atualizarCampoParcelas();
    })
    .catch(error => {
      console.error('Erro:', error);
      mostrarAlertaError('Erro ao cadastrar empréstimo: ' + error.message);
    });
  });
});







    const cidadePadraoPorMensal = {
  "Mensal 1": "Cotia",
  "Mensal 2": "São Roque",
  "Mensal 3": "Sorocaba",
  "Mensal 3A": "Sorocaba-3A",
  "Mensal 4": "Santos"
};







// gerarJSON.js
function gerarJSONDaLista(lista, taxaDefault = 20) {
  const linhas = lista
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');

  const emprestimos = [];

  for (const linha of linhas) {
    const partes = linha.split(/\s+/);
    const dia = partes.shift();

    if (!dia || isNaN(Number(dia))) continue;

    let taxa = Number(taxaDefault);
    let ultimo = partes[partes.length - 1];
    if (ultimo && /%$/.test(ultimo)) {
      taxa = parseFloat(ultimo.replace('%', '').replace(',', '.'));
      partes.pop();
    }

    const tokenJuros = partes.pop();
    if (!tokenJuros) continue;

    const jurosStr = tokenJuros.replace(/[^\d,.-]/g, '').replace(',', '.');
    const juros = parseFloat(jurosStr);
    if (isNaN(juros) || taxa === 0) continue;

    const principal = juros / (taxa / 100);
    const principalArred = Math.round((principal + Number.EPSILON) * 100) / 100;

    const nome = partes.join(' ') || 'SEM NOME';



const mensalSelecionado = document.getElementById('mensalSelect').value;
const cidadePadrao = cidadePadraoPorMensal[mensalSelecionado];

emprestimos.push({
  nome,
  email: "teste@teste.com",
  telefone: "11900000000",
  cpf: "000.000.000-00",
  endereco: "Rua",
  cidade: cidadePadrao, // agora dinâmico
  estado: "SP",
  cep: "00000-000",
  numero: "00",
  valor: principalArred,
  parcelas: 1,
  datasVencimentos: [`${ano}-${mes}-${String(dia).padStart(2,'0')}`],
  taxaJuros: taxa
});

  }

  return { emprestimos };
}




let jsonGerado = null;

document.getElementById("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    const texto = result.value.trim();

    // gera JSON e guarda em variável global
    jsonGerado = gerarJSONDaLista(texto);

    // exibe lista
    montarListaEmprestimos(jsonGerado.emprestimos);

    // mostra botão de enviar e select
    document.getElementById("btnEnviar").style.display = "block";
    document.getElementById("btnCancelar").style.display = "block";
    document.getElementById("mensalLabel").style.display = "block";
    document.getElementById("mensalSelect").style.display = "block";
    document.getElementById("listaEmprestimos").style.display = "block";

  } catch (err) {
    console.error("Erro ao ler DOCX:", err);
    mostrarAlertaError("Erro ao ler arquivo.");
  }
});






function montarListaEmprestimos(emprestimos) {
  const container = document.getElementById("listaEmprestimos");
  container.innerHTML = "";

  if (!emprestimos || emprestimos.length === 0) {
    container.innerHTML = `<p class="sem-resultados">Nenhum empréstimo encontrado</p>`;
    return;
  }

  const tabela = document.createElement("div");
  tabela.className = "parcelas-tabela";

  // Cabeçalho
  tabela.innerHTML = `
    <div class="parcelas-cabecalho">
      <span>📅 Dia</span>
      <span>👤 Cliente</span>
      <span>💰 % Juros</span>
      <span>📈 Juros (R$)</span>
    </div>
  `;

  // Corpo
  const corpo = document.createElement("div");
  corpo.id = "parcelas-corpo";
  tabela.appendChild(corpo);

  emprestimos.forEach((emp, index) => {
    const data = emp.datasVencimentos[0];
    const dia = data.split("-")[2];

    const valorJuros = emp.valor * (emp.taxaJuros / 100);

    const linha = document.createElement("div");
    linha.className = `parcela-linha ${index % 2 === 0 ? "linha-par" : "linha-impar"}`;
    linha.innerHTML = `
      <span>${dia}</span>
      <span>${emp.nome}</span>
      <span>${emp.taxaJuros}%</span>
      <span>${formatarMoedaLista(valorJuros)}</span>
    `;
    corpo.appendChild(linha);
  });

  container.appendChild(tabela);
}




document.getElementById("btnEnviar").addEventListener("click", async () => {
  if (!jsonGerado || !jsonGerado.emprestimos) return;

  // Lê o mensal selecionado
  const mensalSelecionado = document.getElementById("mensalSelect").value;
  const cidadePadrao = cidadePadraoPorMensal[mensalSelecionado];

  // Atualiza cidade de todos os empréstimos
  jsonGerado.emprestimos.forEach(emp => {
    emp.cidade = cidadePadrao;
  });

  try {
    const response = await fetch(`${URL_SERVICO}/emprestimos/lote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ emprestimos: jsonGerado.emprestimos })
    });

    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const result = await response.json();
    console.log("Empréstimos enviados:", result);

    // Limpa tela
    document.getElementById("btnCancelar").click();
    mostrarAlerta("Empréstimos enviados com sucesso!");
  } catch (err) {
    console.error(err);
    mostrarAlertaError("Erro ao enviar empréstimos.");
  }
});


document.getElementById("btnCancelar").addEventListener("click", () => {
  // Limpa input de arquivo
  const fileInput = document.getElementById("fileInput");
  fileInput.value = "";

  // Limpa lista de empréstimos
  document.getElementById("listaEmprestimos").innerHTML = "";

  // Esconde botões e select
  document.getElementById("btnEnviar").style.display = "none";
  document.getElementById("btnCancelar").style.display = "none";
  document.getElementById("mensalSelect").style.display = "none";
  document.getElementById("mensalLabel").style.display = "none";
  document.getElementById("listaEmprestimos").style.display = "none";


  // Limpa variável global
  jsonGerado = null;
});



function formatarMoedaLista(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
