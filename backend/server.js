
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
function formatarDataLocal(data) {
  const offset = data.getTimezoneOffset();
  const local = new Date(data.getTime() - offset * 60000);
  return local.toISOString().split('T')[0]; // yyyy-mm-dd
}

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
 // permite acessar os arquivos via navegador

const FILE = './dados.json';

function lerDados() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function salvarDados(dados) {
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}


function formatarDataLocal(data) {
  // Garante que o horário local não afete a data final
  const offsetMs = data.getTimezoneOffset() * 60 * 1000;
  const localISOTime = new Date(data.getTime() - offsetMs).toISOString().split('T')[0];
  return localISOTime;
}


// Configuração do multer para salvar arquivos no diretório "uploads"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

app.post('/emprestimos', upload.array('anexos'), (req, res) => {
  console.log('Arquivos recebidos:', req.files);
  const dados = lerDados();
  const {
    nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
    valor, parcelas, taxaJuros = 20, datasVencimentos = []
  } = req.body;

  // Conversões seguras
  const valorNumerico = Number(valor);
  const parcelasNumerico = Number(parcelas);
  const taxa = parseFloat(taxaJuros) / 100;

  // Garante array
  const vencimentos = Array.isArray(datasVencimentos) ? datasVencimentos : [datasVencimentos];

  // Verifica se as datas estão corretas ou gera novas
  const datasCalculadas = vencimentos.length === parcelasNumerico
    ? vencimentos
    : Array.from({ length: parcelasNumerico }, (_, i) => {
        const data = new Date();
        data.setMonth(data.getMonth() + i + 1);
        return formatarDataLocal(data);
      });

  const arquivos = req.files?.map(file => ({
    nomeOriginal: file.originalname,
    caminho: `/uploads/${file.filename}`
  })) || [];

  const valorComJuros = valorNumerico * (1 + taxa);
  const valorParcela = valorComJuros / parcelasNumerico;
const valorParcelasPendentes = Array.from(
  { length: parcelasNumerico },
  () => parseFloat(valorParcela.toFixed(2))
);


  const novoEmprestimo = {
    id: Date.now(),
    nome,
    email,
    telefone,
    cpf,
    endereco,
    cidade,
    estado,
    cep,
    numero,
    complemento,
    valorOriginal: valorNumerico,
    valorComJuros,
    parcelas: parcelasNumerico,
    valorParcela,
    valorParcelasPendentes,
    taxaJuros,
    statusParcelas: Array.from({ length: parcelasNumerico }, () => false),
    datasPagamentos: Array.from({ length: parcelasNumerico }, () => null),
    datasVencimentos: datasCalculadas,
    arquivos,
    quitado: false
  };

  dados.push(novoEmprestimo);
  salvarDados(dados);

  console.log('📅 Datas finais salvas:', novoEmprestimo.datasVencimentos);

  res.status(201).json(novoEmprestimo);
});


app.get('/emprestimos/inadimplentes', (req, res) => {
  try {
    const dados = lerDados();

    const hoje = new Date();

    const inadimplentes = dados.filter(e => {
      if (e.quitado) return false;

      if (!Array.isArray(e.datasVencimentos) || !Array.isArray(e.statusParcelas)) {
        return false;
      }

      for (let i = 0; i < e.datasVencimentos.length; i++) {
        const [ano, mes, dia] = e.datasVencimentos[i].split('-').map(Number);
        const dataVenc = new Date(ano, mes - 1, dia);


        const vencimentoAntesDeHoje = (
          dataVenc.getFullYear() < hoje.getFullYear() ||
          (dataVenc.getFullYear() === hoje.getFullYear() && dataVenc.getMonth() < hoje.getMonth()) ||
          (dataVenc.getFullYear() === hoje.getFullYear() && dataVenc.getMonth() === hoje.getMonth() && dataVenc.getDate() < hoje.getDate())
        );

        if (vencimentoAntesDeHoje && !e.statusParcelas[i]) {
          console.log(`⚠️ Parcela vencida detectada para ${e.nome || 'sem nome'} - Data: ${dataVenc.toLocaleDateString('pt-BR')}, status: ${e.statusParcelas[i]}`);
          return true;
        }
      }

      return false;
    });

    console.log('Inadimplentes identificados:');
    inadimplentes.forEach((e, index) => {
      console.log(`🧾 Empréstimo ${index + 1}: Nome: ${e.nome}, Parcelas: ${e.datasVencimentos}`);
    });

    res.json(inadimplentes);
  } catch (error) {
    console.error('Erro na rota /emprestimos/inadimplentes:', error);
    res.status(500).json({ erro: 'Erro interno no servidor ao buscar inadimplentes' });
  }
});






app.patch('/emprestimos/:id/parcela/:indice', (req, res) => {
  const dados = lerDados();
  const emprestimo = dados.find(e => e.id == req.params.id);

  if (!emprestimo) return res.status(404).json({ erro: 'Empréstimo não encontrado' });

  const indice = parseInt(req.params.indice);
  if (indice < 0 || indice >= emprestimo.parcelas) {
    return res.status(400).json({ erro: 'Parcela inválida' });
  }

  // Garante que os arrays existem
if (!Array.isArray(emprestimo.statusParcelas))
  emprestimo.statusParcelas = Array.from({ length: emprestimo.parcelas }, () => false);

if (!Array.isArray(emprestimo.datasPagamentos))
  emprestimo.datasPagamentos = Array.from({ length: emprestimo.parcelas }, () => null);

if (!Array.isArray(emprestimo.recebidoPor))
  emprestimo.recebidoPor = Array.from({ length: emprestimo.parcelas }, () => null);

// Array de valores dinâmicos (se não existir em empréstimos antigos)
if (!Array.isArray(emprestimo.valorParcelasPendentes)) {
  emprestimo.valorParcelasPendentes = Array.from(
    { length: emprestimo.parcelas },
    () => parseFloat(emprestimo.valorParcela.toFixed(2))
  );
}

const recebido = parseFloat(req.body.valorRecebido);
const previsto = emprestimo.valorParcelasPendentes[indice];

// 1. Marca como paga
emprestimo.statusParcelas[indice] = true;
emprestimo.datasPagamentos[indice] = req.body.dataPagamento || new Date().toISOString();
emprestimo.recebidoPor[indice] = req.body.nomeRecebedor || 'Desconhecido';

// 2. Registra o valor realmente recebido (em novo campo)
if (!Array.isArray(emprestimo.valoresRecebidos))
  emprestimo.valoresRecebidos = Array.from({ length: emprestimo.parcelas }, () => null);

emprestimo.valoresRecebidos[indice] = recebido;


// 3. Calcula a diferença e redistribui
const diff = previsto - recebido; // +: faltou | -: sobrou

const indicesRestantes = emprestimo.statusParcelas
  .map((paga, i) => (!paga ? i : null))
  .filter(i => i !== null && i > indice);

if (indicesRestantes.length > 0 && diff !== 0) {
  const ajuste = diff / indicesRestantes.length;

  indicesRestantes.forEach((i, k) => {
    if (k === indicesRestantes.length - 1) {
      // Última parcela recebe o que sobrar de arredondamentos
      const somaParcial = indicesRestantes
        .slice(0, -1)
        .reduce((s, j) => s + emprestimo.valorParcelasPendentes[j], 0);
      emprestimo.valorParcelasPendentes[i] = parseFloat(
        (emprestimo.valorParcelasPendentes[i] + (diff - ajuste * (indicesRestantes.length - 1))).toFixed(2)
      );
    } else {
      emprestimo.valorParcelasPendentes[i] = parseFloat(
        (emprestimo.valorParcelasPendentes[i] + ajuste).toFixed(2)
      );
    }
  });
}

// 4. Verifica quitação
emprestimo.quitado = emprestimo.statusParcelas.every(p => p);

// ------------------------------------------------------------------
// FIM DA NOVA LÓGICA
// ------------------------------------------------------------------

salvarDados(dados);
return res.json(emprestimo);
});


app.get('/emprestimos/quitados', (req, res) => {
  const dados = lerDados();
  const quitados = dados.filter(e => e.quitado === true);
  res.json(quitados);
});

app.get('/emprestimos', (req, res) => {
  const dados = lerDados();
  const { termo } = req.query;

  if (termo) {
    const termoNormalizado = termo.toLowerCase();

    const filtrado = dados.filter(e =>
      !e.quitado &&
      (
       
        e.cpf && e.cpf.toLowerCase().includes(termoNormalizado)
      )
    );

    res.json(filtrado);
  } else {
    res.json(dados);
  }
});



app.post('/upload-arquivos', upload.array('anexos'), (req, res) => {
  console.log(req.files); // Arquivos enviados
  res.status(200).json({ sucesso: true, arquivos: req.files });
});


app.get('/emprestimos/vencimento/:data', (req, res) => {
  const dados = lerDados();
  const dataSelecionada = req.params.data;
  console.log('Data selecionada:', dataSelecionada);

  const resultado = dados.filter(e => {
    if (!Array.isArray(e.datasVencimentos)) return false;
    console.log('Datas vencimentos do empréstimo:', e.datasVencimentos);

    return !e.quitado && e.datasVencimentos.includes(dataSelecionada);
  });

  console.log('Resultado:', resultado);
  res.json(resultado);
});









app.get('/ping', (req, res) => {
  res.send('pong');
});




app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});


