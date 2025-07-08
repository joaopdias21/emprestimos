
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

  const vencimentos = Array.isArray(datasVencimentos) ? datasVencimentos : [datasVencimentos];

  const arquivos = req.files?.map(file => ({
    nomeOriginal: file.originalname,
    caminho: `/uploads/${file.filename}`


  })) || [];

  const taxa = parseFloat(taxaJuros) / 100;
  const valorComJuros = valor * (1 + taxa);
  const valorParcela = valorComJuros / parcelas;

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
    valorOriginal: valor,
    valorComJuros,
    parcelas,
    valorParcela,
    taxaJuros,
    statusParcelas: Array.from({ length: parcelas }, () => false),
    datasPagamentos: Array.from({ length: parcelas }, () => null),
    datasVencimentos: vencimentos.length === parcelas ? vencimentos : Array.from({ length: parcelas }, (_, i) => {
      const data = new Date();
      data.setMonth(data.getMonth() + i + 1);
      return formatarDataLocal(data);
    }),

    arquivos,
    quitado: false
  };

  dados.push(novoEmprestimo);
  salvarDados(dados);

  res.status(201).json(novoEmprestimo);
});





app.patch('/emprestimos/:id/parcela/:indice', (req, res) => {
  const dados = lerDados();
  const emprestimo = dados.find(e => e.id == req.params.id);

  if (!emprestimo) return res.status(404).json({ erro: 'Empréstimo não encontrado' });

  const indice = parseInt(req.params.indice);
  if (indice < 0 || indice >= emprestimo.parcelas) {
    return res.status(400).json({ erro: 'Parcela inválida' });
  }

  if (!Array.isArray(emprestimo.statusParcelas)) {
    emprestimo.statusParcelas = Array.from({ length: emprestimo.parcelas }, () => false);
  }

  if (!Array.isArray(emprestimo.datasPagamentos)) {
    emprestimo.datasPagamentos = Array.from({ length: emprestimo.parcelas }, () => null);
  }

  // Marcar como paga
  emprestimo.statusParcelas[indice] = true;
  emprestimo.datasPagamentos[indice] = req.body.dataPagamento || new Date().toISOString();

  // Verifica se todas foram pagas
  emprestimo.quitado = emprestimo.statusParcelas.every(p => p === true);

  salvarDados(dados);
  res.json({ sucesso: true, quitado: emprestimo.quitado });
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



app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});


