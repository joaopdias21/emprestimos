import { URL_SERVICO } from './config.js';
import { mostrarAlerta, mostrarAlertaError, formatarMoeda, mostrarAlertaWarning } from './utils.js';

document.addEventListener('DOMContentLoaded', function () {
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
  jurosInput.classList.add('input-juros'); // (opcional para estilização)
  infoValores.parentNode.insertBefore(jurosInput, infoValores);

  // Função para formatar input de moeda
  function formatarInputMoeda(input) {
    input.addEventListener('input', () => {
      let valor = input.value.replace(/\D/g, '');
      if (valor.length === 0) {
        input.value = 'R$ 0,00';
        return;
      }
      valor = (parseInt(valor, 10) / 100).toFixed(2);
      valor = valor.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
      input.value = 'R$ ' + valor;
    });

    input.addEventListener('focus', () => {
      if (input.value.trim() === '') input.value = 'R$ 0,00';
    });

    input.addEventListener('blur', () => {
      if (input.value === 'R$ 0,00') input.value = '';
    });
  }

  formatarInputMoeda(inputValor);

  // Função para formatar moeda
  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  // ✅ Calcula e exibe parcelas
  function calcularParcelas() {
    const valorEmprestimo = parseFloat(inputValor.value.replace(/[^\d,]/g, '').replace(',', '.'));
    const tipoSelecionado = document.querySelector('input[name="tipoParcelamento"]:checked').value;
    const numParcelas = tipoSelecionado === 'parcelado' ? parseInt(inputParcelas.value) : 1;

    let taxaJuros = parseFloat(jurosInput.value);
    if (isNaN(taxaJuros)) taxaJuros = 20;

    if (!valorEmprestimo || valorEmprestimo <= 0) {
      infoValores.innerHTML = '';
      tabelaParcelas.innerHTML = '';
      return;
    }

    const valorTotalComJuros = valorEmprestimo * (1 + taxaJuros / 100);
    const valorJuros = valorTotalComJuros - valorEmprestimo;

    if (tipoSelecionado === 'mes-a-mes') {
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
          <tr><th>Parcela</th><th>Valor</th><th>Vencimento</th></tr>
          <tr>
            <td>1ª</td>
            <td>${formatarMoeda(valorParcela)}</td>
            <td><input type="date" class="input-data-parcela" data-index="0"></td>
          </tr>
        </table>
      `;
    } else {
      const valorParcela = valorTotalComJuros / numParcelas;
      infoValores.innerHTML = `
        <div class="info-valor">
          <strong>Valor do empréstimo:</strong> ${formatarMoeda(valorEmprestimo)}<br>
          <strong>Juros (${taxaJuros}%):</strong> ${formatarMoeda(valorJuros)}<br>
          <strong>Valor total:</strong> ${formatarMoeda(valorTotalComJuros)}<br>
          <strong>Parcelas:</strong> ${numParcelas}x de ${formatarMoeda(valorParcela)}
        </div>
      `;

      const hoje = new Date();
      let tabelaHTML = `
        <table class="tabela-parcelas">
          <thead><tr><th>Parcela</th><th>Valor</th><th>Vencimento</th></tr></thead><tbody>
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
      tabelaHTML += `</tbody></table>`;
      tabelaParcelas.innerHTML = tabelaHTML;
    }
  }

  // Mostra ou esconde o campo de parcelas
  function atualizarCampoParcelas() {
    const tipoSelecionado = document.querySelector('input[name="tipoParcelamento"]:checked').value;
    campoParcelas.style.display = tipoSelecionado === 'parcelado' ? 'block' : 'none';
    inputParcelas.required = tipoSelecionado === 'parcelado';
    inputParcelas.value = tipoSelecionado === 'parcelado' ? inputParcelas.value || '12' : '1';
    calcularParcelas();
  }

  tipoParcelamentoRadios.forEach(r => r.addEventListener('change', atualizarCampoParcelas));
  inputValor.addEventListener('input', calcularParcelas);
  inputParcelas.addEventListener('input', calcularParcelas);
  jurosInput.addEventListener('input', calcularParcelas);

  document.getElementById('anexos').addEventListener('change', function () {
    const files = Array.from(this.files).map(f => f.name);
    document.getElementById('nomeArquivos').textContent = files.length ? files.join(', ') : 'Nenhum arquivo selecionado';
  });

  atualizarCampoParcelas();

 // ✅ SUBMIT
// ✅ SUBMIT
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isAdminMensal3 = localStorage.getItem("isAdminMensal3") === "true";
  const isOperador = localStorage.getItem("isOperador") === "true";
  const formData = new FormData(form);

  console.log("🟡 Enviando formulário...");
  console.log("isAdmin:", isAdmin, "isAdminMensal3:", isAdminMensal3, "isOperador:", isOperador);

  // adiciona vencimentos
  const vencimentos = Array.from(document.querySelectorAll('.input-data-parcela'))
    .map(i => i.value)
    .filter(v => v !== '');
  vencimentos.forEach(v => formData.append('datasVencimentos', v));

  // --- SE ESTIVER LOGADO ---
  if (isAdmin || isAdminMensal3 || isOperador) {
    console.log("🟢 Usuário logado, enviando empréstimo direto.");

    try {
      const tipoParcelamento = document.querySelector('input[name="tipoParcelamento"]:checked').value;
      const parcelas = tipoParcelamento === 'parcelado' ? parseInt(inputParcelas.value) : 1;
      const valorNumerico = parseFloat(inputValor.value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

      formData.set('valor', valorNumerico);
      formData.set('parcelas', parcelas);
      formData.set('taxaJuros', jurosInput.value || 20);

      const url = tipoParcelamento === 'parcelado'
        ? `${URL_SERVICO}/emprestimos/parcelado`
        : `${URL_SERVICO}/emprestimos`;

      console.log("📤 Enviando para:", url);
      const resp = await fetch(url, { method: 'POST', body: formData });
      const data = await resp.json();
      console.log("📥 Resposta:", data);

      if (resp.ok) {
        mostrarAlerta("✅ Empréstimo cadastrado com sucesso!");
        form.reset();
        atualizarCampoParcelas();
      } else {
        mostrarAlertaError("Erro: " + (data.erro || "Falha ao cadastrar."));
      }

    } catch (err) {
      console.error("❌ Erro no envio logado:", err);
      mostrarAlertaError("Erro ao cadastrar empréstimo: " + err.message);
    }

  } else {
    // --- SE NÃO ESTIVER LOGADO ---
    console.log("🟠 Usuário NÃO logado — enviando solicitação para aprovação...");

try {
  const resp = await fetch(`${URL_SERVICO}/solicitacoes`, { method: 'POST', body: formData });
  const data = await resp.json();

  if (resp.ok) {
    mostrarAlerta("✅ Solicitação enviada! Aguarde a análise do administrador.");
    form.reset();
    atualizarCampoParcelas();
  } else {
    mostrarAlertaError("Erro: " + (data.erro || "Falha ao enviar solicitação."));
  }

} catch (err) {
  mostrarAlertaError("Erro ao enviar solicitação: " + err.message);
}

  }
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

// Verifica se o usuário escolheu um mês manualmente
const mesInput = document.getElementById("mesSelecionado");
let ano, mes;

if (mesInput && mesInput.value) {
  const [anoSel, mesSel] = mesInput.value.split("-");
  ano = anoSel;
  mes = mesSel;
} else {
  const now = new Date();
  ano = now.getFullYear();
  mes = String(now.getMonth() + 1).padStart(2, '0');
}


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
    document.getElementById("mesLabel").style.display = "block";
document.getElementById("mesSelecionado").style.display = "block";


  } catch (err) {
    console.error("Erro ao ler DOCX:", err);
    mostrarAlertaError("Erro ao ler arquivo.");
  }
});


document.getElementById("btnGerarListaManual").addEventListener("click", () => {
  const textoManual = document.getElementById("inputManual").value.trim();
  if (!textoManual) {
    mostrarAlertaError("Digite pelo menos uma linha antes de gerar a lista.");
    return;
  }

  // Gera JSON usando a mesma função dos arquivos
  jsonGerado = gerarJSONDaLista(textoManual);

  // Monta a lista na tela
  montarListaEmprestimos(jsonGerado.emprestimos);

  // Exibe controles (mesmo comportamento do upload)
  document.getElementById("btnEnviar").style.display = "block";
  document.getElementById("btnCancelar").style.display = "block";
  document.getElementById("mensalLabel").style.display = "block";
  document.getElementById("mensalSelect").style.display = "block";
  document.getElementById("listaEmprestimos").style.display = "block";
  document.getElementById("mesLabel").style.display = "block";
document.getElementById("mesSelecionado").style.display = "block";

});

document.getElementById("btnLimparTextoManual").addEventListener("click", () => {
  const textarea = document.getElementById("inputManual");
  textarea.value = "";
  textarea.focus();
});

document.getElementById('mesSelecionado').addEventListener('change', function () {
  const novoMes = this.value;
  
  // Seleciona todos os campos individuais de mês (ajuste o seletor se necessário)
  document.querySelectorAll('.mes-individual').forEach(campo => {
    campo.value = novoMes;
  });
});




function montarListaEmprestimos(emprestimos) {
  const container = document.getElementById("listaEmprestimos");
  container.innerHTML = "";

  if (!emprestimos || emprestimos.length === 0) {
    container.innerHTML = `<p class="sem-resultados">Nenhum empréstimo encontrado</p>`;
    return;
  }

  const tabela = document.createElement("div");
  tabela.className = "parcelas-tabela-cadastro";

  // Cabeçalho
  tabela.innerHTML = `
    <div class="parcelas-cabecalho-cadastro">
      <span>📅 Dia</span>
      <span>👤 Cliente</span>
      <span>💰 % Juros</span>
      <span>📈 Juros (R$)</span>
    </div>
  `;

  // Corpo
  const corpo = document.createElement("div");
  corpo.id = "parcelas-corpo-cadastro";
  tabela.appendChild(corpo);

  emprestimos.forEach((emp, index) => {
    const data = emp.datasVencimentos[0];
    const dia = data.split("-")[2];

    const valorJuros = emp.valor * (emp.taxaJuros / 100);

    const linha = document.createElement("div");
    linha.className = `parcela-linha-cadastro ${index % 2 === 0 ? "linha-par" : "linha-impar"}`;
linha.innerHTML = `
  <span>${dia}</span>
  <span>${emp.nome}</span>
  <span>${emp.taxaJuros}%</span>
  <span>${formatarMoedaLista(valorJuros)}</span>
  <input type="month" class="mes-individual" value="${emp.datasVencimentos[0].slice(0,7)}" />
`;

    corpo.appendChild(linha);
  });

  container.appendChild(tabela);
}





document.getElementById("btnEnviar").addEventListener("click", async () => {
  const mesesIndividuais = document.querySelectorAll(".mes-individual");
mesesIndividuais.forEach((input, i) => {
  const [ano, mes] = input.value.split("-");
  const dia = jsonGerado.emprestimos[i].datasVencimentos[0].split("-")[2];
  jsonGerado.emprestimos[i].datasVencimentos[0] = `${ano}-${mes}-${dia}`;
});

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
