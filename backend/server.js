// server.js

const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const mongoose = require('mongoose');
const fs       = require('fs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

require('dotenv').config();

/* ----------------------- CONFIG APP ----------------------- */
const app  = express();
const PORT = 3000;

/* --------------------- PASTA UPLOADS ---------------------- */
const uploadDir = path.join(__dirname, 'uploads');
// Garante que a pasta exista para evitar erro no multer
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ------------------- MIDDLEWARES --------------------------- */
app.use(cors());
app.use(express.json({ limit: '50mb' })); // aumenta limite do JSON
app.use(express.urlencoded({ limit: '50mb', extended: true })); // aumenta limite de forms
// ✅ Servir a pasta public como frontend
app.use(express.static(path.join(__dirname, "../public")));
// ✅ Forçar carregamento do index.html no acesso raiz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});


// Middleware para servir arquivos estáticos da pasta uploads
// Deve ficar antes das rotas que usam uploads
app.use('/uploads', express.static(uploadDir));

// Função auxiliar para preencher datasVencimentos faltantes com datas mensais a partir do próximo mês
function preencherDatasPadrao(datasVencimentos, parcelas) {
  if (!Array.isArray(datasVencimentos)) {
    datasVencimentos = [];
  }

  for (let i = 0; i < parcelas; i++) {
    if (!datasVencimentos[i]) {
      const data = new Date();
      data.setMonth(data.getMonth() + i + 1); // 1 mês adicionado para a primeira parcela
      const yyyy = data.getFullYear();
      const mm = String(data.getMonth() + 1).padStart(2, '0');
      const dd = String(data.getDate()).padStart(2, '0');
      datasVencimentos[i] = `${yyyy}-${mm}-${dd}`;
    }
  }

  return datasVencimentos;
}



/* --------------------- ROTA LOGIN ------------------------- */



// Defina suas senhas seguras aqui (ou melhor ainda, use variáveis de ambiente)
const SENHAS = {
  admin: 'Z9#vLp!2@WdXq7&Fs', // Admin total
  adminMensal3: 'X4$kMn!8@QrLp2#Hs', // Admin restrito ao Mensal 3
  operadores: {
    Gugu: 'N7%rTb$5!QmVz1@Wy',
    Bigu: 'K2!xFd#8@PcJs6%Rt',
  }
};

app.post('/login', (req, res) => {
  const { tipo, senha } = req.body;

  if (!tipo || !senha) {
    return res.status(400).json({ erro: 'Insira a senha para login' });
  }

  if (!['admin', 'adminMensal3', 'operador'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido' });
  }

if (tipo === 'admin') {
  if (senha === SENHAS.admin) {
    return res.json({ sucesso: true, tipo: 'admin', user: 'Bruno' }); // envia o nome
  } else if (senha === SENHAS.adminMensal3) {
    return res.json({ sucesso: true, tipo: 'adminMensal3', user: 'Admin Mensal 3' }); // envia o nome
  } else {
    return res.status(401).json({ erro: 'Senha incorreta' });
  }
}

  if (tipo === 'operador') {
    const operadorLogado = Object.entries(SENHAS.operadores).find(
      ([nome, senhaOperador]) => senha === senhaOperador
    );

    if (operadorLogado) {
      const [nomeOperador] = operadorLogado;
      return res.json({ sucesso: true, tipo: 'operador', user: nomeOperador });
    } else {
      return res.status(401).json({ erro: 'Senha incorreta' });
    }
  }
});





/* ------------------- CONEXÃO COM MONGODB ------------------ */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });

/* --------------------- SCHEMA & MODEL --------------------- */
/* --------------------- SCHEMA & MODEL --------------------- */
const EmprestimoSchema = new mongoose.Schema({
  id: { type: Number, unique: true },

  nome: String,
  email: String,
  telefone: String,
  cpf: String,
  endereco: String,
  cidade: String,
  estado: String,
  cep: String,
  numero: String,
  complemento: String,

  // ✅ SALDO PRINCIPAL
  valorOriginal: Number,

  // ⚠️ usado apenas para juros — parcelado não usa.
  valorComJuros: Number,

  parcelas: Number,

  // ❗ esse campo virou obsoleto, mas pode manter por compatibilidade
  valorParcela: Number,

  // ✅ parcelado e juros usam
  valorParcelasPendentes: {
    type: [Number],
    default: []
  },

  // ✅ NOVO — ESSENCIAL!
  valoresOriginaisParcelas: {
    type: [Number],
    default: []
  },

  taxaJuros: Number,

  statusParcelas: {
    type: [Boolean],
    default: []
  },

  datasPagamentos: {
    type: [String],
    default: []
  },

  datasVencimentos: {
    type: [String],
    default: []
  },

  valoresRecebidos: {
    type: [Number],
    default: []
  },

  multasParcelas: {
    type: [Number],
    default: []
  },

  recebidoPor: {
    type: [String],
    default: []
  },

  // ✅ NOVO — usado quando parcela é parcialmente paga
  parcelasPagasParciais: {
    type: [Object],
    default: []
  },

  // ✅ histórico
  historicoAlteracoes: [
    {
      data: { type: Date, default: Date.now },
      valorOriginal: Number,
      taxaJuros: Number,
      valorParcela: Number,
      valorComJuros: Number,
      saldoPrincipal: Number,
      usuario: String
    }
  ],

  arquivos: [{
    nomeOriginal: String,
    caminho: String
  }],

  quitado: { type: Boolean, default: false },

  // ✅ parcelado ou juros
  tipoParcelamento: { type: String, default: 'juros' }

}, { timestamps: true });

const Emprestimo = mongoose.model('Emprestimo', EmprestimoSchema);

/* --------------------- SCHEMA DE SOLICITAÇÕES --------------------- */
const SolicitacaoEmprestimoSchema = new mongoose.Schema({
  id: { type: Number, unique: true, default: Date.now },

  nome: String,
  email: String,
  telefone: String,
  cpf: String,
  endereco: String,
  cidade: String,
  estado: String,
  cep: String,
  numero: String,
  complemento: String,

  // 💰 Valor solicitado (mantém como string pra aceitar formato "R$ 5.000,00")
  valor: String,

  parcelas: Number,
  tipoParcelamento: { type: String, default: 'juros' },

  // Datas de vencimento sugeridas (usuário pode enviar ou deixar em branco)
  datasVencimentos: {
    type: [String],
    default: []
  },

  // 📎 Arquivos anexados
  anexos: [
    {
      nomeOriginal: String,
      caminho: String
    }
  ],

  // 🟡 Status da solicitação
  status: {
    type: String,
    enum: ['pendente', 'aprovado', 'rejeitado'],
    default: 'pendente'
  },

  // 🕓 Data de envio da solicitação
  dataEnvio: { type: Date, default: Date.now },

  // 📅 Data da decisão (preenchida quando o admin aprova/rejeita)
  dataDecisao: Date,

  // 👤 Usuário que aprovou/rejeitou (caso queira registrar)
  decididoPor: String

}, { timestamps: true });

const SolicitacaoEmprestimo = mongoose.model('SolicitacaoEmprestimo', SolicitacaoEmprestimoSchema);

/* --------------------- SCHEMA DE REJEIÇÕES --------------------- */
const SolicitacaoRejeitadaSchema = new mongoose.Schema({
  nome: String,
  cpf: String,
  valor: String,
  taxaJuros: Number,
  valorJuros: Number,
  dataRejeicao: { type: Date, default: Date.now }
});

const SolicitacaoRejeitada = mongoose.model('SolicitacaoRejeitada', SolicitacaoRejeitadaSchema);



/* -------------------- FUNÇÕES AUXILIARES ------------------ */
function formatarDataLocal(data) {
  const offsetMs = data.getTimezoneOffset() * 60 * 1000;
  return new Date(data.getTime() - offsetMs).toISOString().split('T')[0];
}

/* ------------------- CONFIGURAÇÃO MULTER ------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

/* ------------------------- ROTAS -------------------------- */

app.post('/solicitacoes', upload.array('anexos'), async (req, res) => {
  console.log(req.body)
  try {
    const {
      nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
      valor, parcelas, tipoParcelamento, datasVencimentos = []
    } = req.body;

    // 🔧 CORREÇÃO: garante que datasVencimentos seja sempre array
    const datasArray = Array.isArray(datasVencimentos)
      ? datasVencimentos
      : [datasVencimentos].filter(Boolean);

    const arquivos = (req.files || []).map(f => ({
      nomeOriginal: f.originalname,
      caminho: `/uploads/${f.filename}`
    }));

const novaSolicitacao = await SolicitacaoEmprestimo.create({
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
  valor,
  parcelas,
  tipoParcelamento,
  datasVencimentos: datasArray, // ✅ usa o array corrigido
  anexos: arquivos
});



    res.status(201).json({ mensagem: "Solicitação enviada para análise", id: novaSolicitacao.id });
  } catch (err) {
    console.error("POST /solicitacoes:", err);
    res.status(500).json({ erro: "Erro ao enviar solicitação" });
  }
});


app.get('/solicitacoes', async (req, res) => {
  console.log("Body recebido:", req.body);

  try {
    const pendentes = await SolicitacaoEmprestimo.find({ status: "pendente" }).sort({ dataEnvio: -1 });
    res.json(pendentes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao listar solicitações" });
  }
});


app.post('/solicitacoes/:id/acao', async (req, res) => {
  try {
    const { id } = req.params;
    const { acao } = req.body; // "aprovar" ou "rejeitar"

    const solicitacao = await SolicitacaoEmprestimo.findById(id);
    if (!solicitacao) {
      return res.status(404).json({ erro: "Solicitação não encontrada" });
    }

    // Caso seja rejeição
   if (acao === "rejeitar") {
  solicitacao.status = "rejeitado";
  await solicitacao.save();

  const valorNumerico = parseFloat(solicitacao.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const taxaJuros = solicitacao.taxaJuros ?? 20;
  const valorJuros = valorNumerico * (taxaJuros / 100);

  // 🔹 Salva dados essenciais da rejeição
  await SolicitacaoRejeitada.create({
    nome: solicitacao.nome,
    cpf: solicitacao.cpf,
    valor: solicitacao.valor,
    taxaJuros,
    valorJuros
  });

  return res.json({ mensagem: "Solicitação rejeitada e registrada no histórico" });
}

    // =============== APROVAÇÃO ===================
// Se for aprovar → cria o empréstimo
const valorNumerico = parseFloat(
  solicitacao.valor.replace(/[^\d,]/g, '').replace(',', '.')
) || 0;

const parcelasNum = parseInt(solicitacao.parcelas) || 1;

// 🔹 Mapeia tipo do formulário para o tipo real do sistema
let tipoParcelamento = solicitacao.tipoParcelamento;
if (tipoParcelamento === "mes-a-mes") tipoParcelamento = "juros";

// 🔹 Define taxa conforme tipo
const taxaJuros = tipoParcelamento === "parcelado" ? 0 : 20;

// 🔹 Mantém datas originais
const datasArray = Array.isArray(solicitacao.datasVencimentos)
  ? solicitacao.datasVencimentos
  : [solicitacao.datasVencimentos];

// 🔹 Cria arrays e estrutura (como antes)
const valorJuros = valorNumerico * (taxaJuros / 100);
const valorParcela = tipoParcelamento === "juros"
  ? valorJuros
  : valorNumerico / parcelasNum;

// Arrays base
const statusParcelas = Array.from({ length: parcelasNum }, () => false);
const datasPagamentos = Array.from({ length: parcelasNum }, () => null);
const valoresRecebidos = Array.from({ length: parcelasNum }, () => 0);
const recebidoPor = Array.from({ length: parcelasNum }, () => null);
const valorParcelasPendentes = Array.from({ length: parcelasNum }, () => valorParcela);
const multasParcelas = Array.from({ length: parcelasNum }, () => 0);
const valoresOriginaisParcelas = Array.from({ length: parcelasNum }, () => valorParcela);

const novoEmprestimo = await Emprestimo.create({
  id: Date.now(),
  nome: solicitacao.nome,
  email: solicitacao.email,
  telefone: solicitacao.telefone,
  cpf: solicitacao.cpf,
  endereco: solicitacao.endereco,
  cidade: solicitacao.cidade,
  estado: solicitacao.estado,
  cep: solicitacao.cep,
  numero: solicitacao.numero,
  complemento: solicitacao.complemento,
  valorOriginal: valorNumerico,
  valorComJuros: valorNumerico + valorJuros,
  parcelas: parcelasNum,
  taxaJuros,
  tipoParcelamento, // 🔹 agora padronizado corretamente
  datasVencimentos: datasArray,
  statusParcelas,
  datasPagamentos,
  valoresRecebidos,
  recebidoPor,
  valorParcelasPendentes,
  multasParcelas,
  valoresOriginaisParcelas,
  quitado: false,
  arquivos: solicitacao.anexos || []
});


    // Atualiza status da solicitação
    solicitacao.status = "aprovado";
    await solicitacao.save();

    res.json({ mensagem: "✅ Empréstimo aprovado e criado com sucesso!", novoEmprestimo });
  } catch (erro) {
    console.error("❌ Erro ao processar solicitação:", erro);
    res.status(500).json({ erro: "Erro ao processar solicitação" });
  }
});

app.get('/solicitacoes-rejeitadas', async (req, res) => {
  try {
    const rejeitadas = await SolicitacaoRejeitada.find().sort({ dataRejeicao: -1 });
    res.json(rejeitadas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao listar solicitações rejeitadas" });
  }
});



// Criar empréstimo com upload de arquivos
// Criar empréstimo
app.post('/emprestimos', upload.array('anexos'), async (req, res) => {
  try {
    const {
      nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
      valor, parcelas, datasVencimentos = []
    } = req.body;

    // ✅ CORREÇÃO: Usar a mesma lógica de limpeza
    const valorLimpo = valor.replace(/[^\d,.]/g, '');
    let valorNum;
    
    if (valorLimpo.includes(',')) {
      valorNum = parseFloat(valorLimpo.replace('.', '').replace(',', '.'));
    } else {
      valorNum = parseFloat(valorLimpo);
    }
    
    const taxaJuros = req.body.taxaJuros !== undefined ? Number(req.body.taxaJuros) : 20;
    const parcelasNum = Number(parcelas) || 1;

    // Resto do código...

    // Garante que datasVencimentos seja array
    const vencimentos = Array.isArray(datasVencimentos) ? datasVencimentos : [datasVencimentos];

    // Preenche datas faltantes com padrão mensal
    const datasCalc = preencherDatasPadrao(vencimentos, parcelasNum);

    const valorComJuros = valorNum * (1 + taxaJuros / 100);

    const arquivos = (req.files || []).map(f => ({
      nomeOriginal: f.originalname,
      caminho: `/uploads/${f.filename}`
    }));

const valorJuros = valorNum * (taxaJuros / 100); // só o juros
const valorParcelasPendentes = Array.from({ length: parcelasNum }, (_, i) =>
  i === 0 ? valorJuros : 0
);

const novo = await Emprestimo.create({
  id: Date.now(),
  nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
  valorOriginal: valorNum,
  valorComJuros: valorJuros, // se quiser guardar só o juros, ou total com juros se preferir
  parcelas: parcelasNum,
  valorParcela: valorJuros, // valor inicial da primeira parcela
  valorParcelasPendentes,
  taxaJuros,
  statusParcelas: Array.from({ length: parcelasNum }, () => false),
  datasPagamentos: Array.from({ length: parcelasNum }, () => null),
  datasVencimentos: datasCalc,
  valoresRecebidos: Array.from({ length: parcelasNum }, () => null),
  recebidoPor: Array.from({ length: parcelasNum }, () => null),
  arquivos,
  quitado: false,
  tipoParcelamento: 'juros'
});


    res.status(201).json(novo);
  } catch (err) {
    console.error('POST /emprestimos:', err);
    res.status(500).json({ erro: 'Erro ao criar empréstimo' });
  }
});



// Rota para empréstimos parcelados (divide o valor total pelas parcelas)
app.post('/emprestimos/parcelado', upload.array('anexos'), async (req, res) => {
  try {
    const {
      nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
      valor, parcelas, datasVencimentos = []
    } = req.body;

    // ✅ LIMPEZA DO VALOR MONETÁRIO
    const valorLimpo = valor.replace(/[^\d,.]/g, '');
    let valorNum;

    if (valorLimpo.includes(',')) {
      valorNum = parseFloat(valorLimpo.replace(/\./g, '').replace(',', '.'));
    } else {
      valorNum = parseFloat(valorLimpo);
    }

    const parcelasNum = Number(parcelas);

    // ✅ VALIDAÇÕES
    if (isNaN(valorNum) || valorNum <= 0) {
      return res.status(400).json({ erro: "Valor inválido" });
    }

    if (isNaN(parcelasNum) || parcelasNum <= 0) {
      return res.status(400).json({ erro: "Número de parcelas inválido" });
    }

    // ✅ AJUSTE DE DATAS
    const vencimentos = Array.isArray(datasVencimentos) ? datasVencimentos : [datasVencimentos];
    const datasCalc = preencherDatasPadrao(vencimentos, parcelasNum);

    // ✅ AMORTIZAÇÃO DINÂMICA — VALOR INICIAL DAS PARCELAS
    const valorParcelaInicial = valorNum / parcelasNum;

    // ✅ ARQUIVOS
    const arquivos = (req.files || []).map(f => ({
      nomeOriginal: f.originalname,
      caminho: `/uploads/${f.filename}`
    }));

    // ✅ CRIAÇÃO DO EMPRÉSTIMO PARCELADO (SEM JUROS)
    const novo = await Emprestimo.create({
      id: Date.now(),
      nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,

      // ✅ Saldo principal
      valorOriginal: valorNum,

      // ✅ Sem juros no parcelado
      taxaJuros: 0,

      parcelas: parcelasNum,
      tipoParcelamento: "parcelado",

      // ✅ Arrays essenciais (100% compatíveis com o PATCH)
      valoresOriginaisParcelas: Array(parcelasNum).fill(valorParcelaInicial),
      valorParcelasPendentes: Array(parcelasNum).fill(valorParcelaInicial),

      statusParcelas: Array(parcelasNum).fill(false),
      valoresRecebidos: Array(parcelasNum).fill(0),
      recebidoPor: Array(parcelasNum).fill(null),
      multasParcelas: Array(parcelasNum).fill(0),
      parcelasPagasParciais: Array(parcelasNum).fill(null),

      datasPagamentos: Array(parcelasNum).fill(null),
      datasVencimentos: datasCalc,

      arquivos,
      quitado: false
    });

    return res.status(201).json(novo);

  } catch (err) {
    console.error("POST /emprestimos/parcelado:", err);
    return res.status(500).json({ erro: "Erro ao criar empréstimo parcelado" });
  }
});




// Rota temporária para atualizar empréstimos existentes
app.patch('/atualizar-tipo-parcelamento', async (req, res) => {
  try {
    // Atualiza todos os empréstimos sem tipoParcelamento para 'juros'
    const result = await Emprestimo.updateMany(
      { tipoParcelamento: { $exists: false } },
      { $set: { tipoParcelamento: 'juros' } }
    );
    
    res.json({ 
      sucesso: true, 
      mensagem: `Atualizados ${result.modifiedCount} empréstimos` 
    });
  } catch (err) {
    console.error('Erro ao atualizar tipoParcelamento:', err);
    res.status(500).json({ erro: 'Erro ao atualizar empréstimos' });
  }
});



// Helpers
function calcularDiasAtraso(dataVencimento) {
  if (!dataVencimento) return 0;
  const hoje = new Date();
  const venc = new Date(dataVencimento);
  const diffMs = hoje - venc;
  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

function getJurosFixo(emp) {
  const j = (emp.valorComJuros || 0) - (emp.valorOriginal || 0);
  return j > 0 ? j : 0;
}

/**
 * Replica a lógica do front:
 * - valor mínimo por parcela = juros fixo + multa da parcela
 * - excedente = pago - mínimo
 * - totalPagoValido = soma dos excedentes (amortização do principal)
 * - valorRestante (p/ UI) = valorComJuros - totalPagoValido
 */


// Utilitário para cálculos monetários exatos
function calcularJurosExatos(valorPrincipal, taxaJuros) {
  // Evita problemas de ponto flutuante
  const juros = (valorPrincipal * taxaJuros) / 100;
  return parseFloat(juros.toFixed(2));
}

function calcularValorMinimoExato(valorParcela, diasAtraso) {
  const multa = diasAtraso * 20;
  return parseFloat((valorParcela + multa).toFixed(2));
}


function calcularResumoParcelas(emp) {
  const jurosFixo = getJurosFixo(emp); // valor do juros fixo ou calculado
  let totalMultas = 0;
  let totalPagoValido = 0;
  const parcelasInfo = [];

  (emp.valoresRecebidos || []).forEach((val, i) => {
    if (typeof val !== 'number') return;

    const diasAtraso = calcularDiasAtraso(emp.datasVencimentos?.[i] || null);
    const multaParcela = diasAtraso * 20;
    totalMultas += (!emp.statusParcelas?.[i] && diasAtraso > 0) ? multaParcela : 0;

    // Define valor base da parcela
    let valorParcela;
    if (emp.tipoParcelamento === 'mes-a-mes') {
      valorParcela = emp.valorParcelasPendentes?.[i] ?? jurosFixo; // só juros
    } else {
      valorParcela = emp.valorParcelasPendentes?.[i] ?? 0; // parcelado: parcela total
    }

    const valorMinimoParcela = valorParcela + multaParcela;

    const info = {
      indice: i + 1,
      valorParcela,
      valorPago: val,
      multa: multaParcela,
      excedente: 0,
      status: ''
    };

    if (val > valorMinimoParcela) {
      info.excedente = val - valorMinimoParcela;
      info.status = '💰 Acima do valor + multa';
      // Para parcelado, o excedente abate do valor principal
      if (emp.tipoParcelamento === 'parcelado') {
        totalPagoValido += info.excedente + valorParcela;
      } else {
        // mes-a-mes: excedente não abate principal
        totalPagoValido += 0;
      }
    } else if (val >= valorParcela) {
      info.status = '✅ Pago corretamente';
      totalPagoValido += emp.tipoParcelamento === 'parcelado' ? valorParcela : 0;
    } else {
      info.status = '⚠️ Pago abaixo do valor';
    }

    parcelasInfo.push(info);
  });

  const valorTotalComJuros = emp.valorComJuros || 0;

  // Para parcelado: exibe quanto falta do valor total
  const valorRestanteUI = emp.tipoParcelamento === 'parcelado'
    ? Math.max(0, valorTotalComJuros - totalPagoValido)
    : 0;

  const valorPrincipalRestante = emp.tipoParcelamento === 'parcelado'
    ? Math.max(0, (emp.valorOriginal || 0) - totalPagoValido)
    : emp.valorOriginal || 0;

  return {
    parcelasInfo,
    totalMultas,
    totalPagoValido,
    valorRestanteUI,
    valorPrincipalRestante
  };
}

// Rota PATCH - CORREÇÃO DO ARREDONDAMENTO
// ✅ PATCH - Atualizar pagamento de uma parcela
app.patch('/emprestimos/:id/parcela/:indice', async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    let indice = Number(req.params.indice);

    const emp = await Emprestimo.findOne({ id: idNum });
    if (!emp) return res.status(404).json({ erro: 'Empréstimo não encontrado' });

    if (!Number.isInteger(indice) || indice < 0)
      return res.status(400).json({ erro: 'Índice de parcela inválido' });

    if (indice >= emp.parcelas) indice = emp.parcelas - 1;

    // 🚫 Não permite alteração se já paga
    if (emp.statusParcelas[indice]) {
      return res.status(400).json({ erro: 'Parcela já quitada, não pode ser alterada' });
    }

    const recebido = parseFloat(req.body.valorRecebido);
    if (!Number.isFinite(recebido) || recebido <= 0)
      return res.status(400).json({ erro: 'valorRecebido inválido' });

    const valorMulta = parseFloat(req.body.valorMulta) || 0;
    const dataPagamento = req.body.dataPagamento || new Date().toISOString();
    const taxa = emp.taxaJuros / 100;

    // ✅ Garante integridade dos arrays
    const campos = [
      'statusParcelas', 'datasPagamentos', 'recebidoPor',
      'valorParcelasPendentes', 'valoresRecebidos',
      'parcelasPagasParciais', 'datasVencimentos', 'multasParcelas',
      'valoresOriginaisParcelas'
    ];
    campos.forEach(campo => {
      if (!Array.isArray(emp[campo])) emp[campo] = [];
      while (emp[campo].length < emp.parcelas) emp[campo].push(null);
    });

    // Inicializa defaults corretos
    emp.statusParcelas = emp.statusParcelas.map(v => v ?? false);
    emp.multasParcelas = emp.multasParcelas.map(v => v ?? 0);
    emp.valoresRecebidos = emp.valoresRecebidos.map(v => v ?? 0);

    // ✅ Define valorOriginalParcela se ainda não existir
    let valorOriginalParcela = emp.valoresOriginaisParcelas[indice];

    if (valorOriginalParcela == null) {

      if (emp.tipoParcelamento === "parcelado") {

        // 📌 Parcelado INICIAL: valor = saldo atual / parcelas restantes
        const parcelasRestantes = emp.parcelas - indice;
        valorOriginalParcela = emp.valorOriginal / parcelasRestantes;

      } else {

        // 📌 Juros mês a mês: valor = saldo * taxa
        valorOriginalParcela = emp.valorOriginal * taxa;
      }

      emp.valoresOriginaisParcelas[indice] = valorOriginalParcela;
    }

    // =========================================================
    // ✅ PAGAMENTO — lógica principal
    // =========================================================

    emp.valoresRecebidos[indice] += recebido;
    emp.recebidoPor[indice] = req.body.nomeRecebedor || "Desconhecido";
    emp.multasParcelas[indice] += valorMulta;

    // QUITOU?
    if (emp.valoresRecebidos[indice] >= valorOriginalParcela) {
      emp.statusParcelas[indice] = true;
      emp.datasPagamentos[indice] = dataPagamento;

    } else {
      // Pagamento parcial
      emp.parcelasPagasParciais[indice] = {
        pago: emp.valoresRecebidos[indice],
        falta: valorOriginalParcela - emp.valoresRecebidos[indice],
        ultimaData: dataPagamento
      };
    }

    // =========================================================
    // ✅ MODELO 1: PARCELADO → amortização dinâmica
    // =========================================================

    if (emp.tipoParcelamento === "parcelado") {

      // 1. Abater diretamente do saldo principal
      emp.valorOriginal = Math.max(0, emp.valorOriginal - recebido);

      // 2. Se quitou a parcela atual, recalcular futuras
      if (emp.statusParcelas[indice] && emp.valorOriginal > 0) {

        const parcelasRestantes = emp.parcelas - (indice + 1);

        if (parcelasRestantes > 0) {
          const novoValor = emp.valorOriginal / parcelasRestantes;

          // Recalcular apenas as não pagas
          for (let i = indice + 1; i < emp.parcelas; i++) {
            if (!emp.statusParcelas[i]) {
              emp.valoresOriginaisParcelas[i] = novoValor;
              emp.valorParcelasPendentes[i] = novoValor;
            }
          }
        }
      }

      // Quitação completa do empréstimo
      emp.quitado = emp.valorOriginal <= 0;

    }

    // =========================================================
    // ✅ MODELO 2: JUROS → mantém sua lógica atual
    // =========================================================

    if (emp.tipoParcelamento === "juros") {

      const excedente = Math.max(0, recebido - valorOriginalParcela);

      // Amortização
      if (excedente > 0) {
        emp.valorOriginal = Math.max(0, emp.valorOriginal - excedente);
      }

      // Recalcular futuras
      for (let i = indice + 1; i < emp.parcelas; i++) {
        if (!emp.statusParcelas[i]) {
          emp.valoresOriginaisParcelas[i] = emp.valorOriginal * taxa;
          emp.valorParcelasPendentes[i] = emp.valoresOriginaisParcelas[i];
        }
      }

      // Criar nova parcela se saldo > 0
      if (emp.statusParcelas[indice] && emp.valorOriginal > 0) {

        emp.parcelas++;

        emp.statusParcelas.push(false);
        emp.datasPagamentos.push(null);
        emp.recebidoPor.push(null);
        emp.valoresRecebidos.push(0);
        emp.parcelasPagasParciais.push(null);
        emp.multasParcelas.push(0);

        const nova = emp.valorOriginal * taxa;
        emp.valoresOriginaisParcelas.push(nova);
        emp.valorParcelasPendentes.push(nova);

        // vencimento
        const ultimaData = new Date(emp.datasVencimentos[emp.datasVencimentos.length - 1]);
        ultimaData.setMonth(ultimaData.getMonth() + 1);
        emp.datasVencimentos.push(ultimaData.toISOString().slice(0, 10));
      }

      emp.quitado = emp.valorOriginal <= 0;
    }

    // =========================================================

    await emp.save();

    res.json({
      ...emp.toObject(),
      valorOriginalParcela,
      saldoPrincipalRestante: emp.valorOriginal
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar parcela' });
  }
});












// Atualizar datas de vencimento das parcelas de um empréstimo
app.patch('/emprestimos/:id/datas-vencimento', async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    const { datasVencimentos } = req.body;

    if (isNaN(idNum)) {
      return res.status(400).json({ erro: 'ID inválido' });
    }

    if (!Array.isArray(datasVencimentos)) {
      return res.status(400).json({ erro: 'O campo datasVencimentos deve ser um array de strings' });
    }

    for (const data of datasVencimentos) {
      if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ erro: `Data inválida no array: ${data}` });
      }
    }

    const emprestimo = await Emprestimo.findOne({ id: idNum });
    if (!emprestimo) {
      return res.status(404).json({ erro: 'Empréstimo não encontrado' });
    }

    // Atualiza o array e o número de parcelas
    emprestimo.datasVencimentos = datasVencimentos;
    emprestimo.parcelas = datasVencimentos.length;  // <---- aqui

    await emprestimo.save();

    return res.json({ sucesso: true, emprestimo });
  } catch (err) {
    console.error('PATCH /emprestimos/:id/datas-vencimento:', err);
    return res.status(500).json({ erro: 'Erro ao atualizar datas de vencimento' });
  }
});



/* ⇢ Empréstimos inadimplentes */
/* ⇢ Empréstimos inadimplentes */
app.get('/emprestimos/inadimplentes', async (_req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const lista = await Emprestimo.find({ quitado: false, datasVencimentos: { $exists: true, $not: { $size: 0 } } });

    const inadimplentes = lista.filter(emp => {
      // Usamos .some() para encontrar pelo menos uma parcela inadimplente
      return emp.datasVencimentos.some((dataStr, i) => {
        // Valida se a parcela existe e se não foi paga
        if (!emp.statusParcelas?.[i]) {
          const venc = new Date(dataStr);
          venc.setHours(0, 0, 0, 0);
          return venc < hoje; // Inadimplente se o vencimento foi antes de hoje
        }
        return false;
      });
    });

    res.json(inadimplentes);
  } catch (err) {
    console.error('GET /emprestimos/inadimplentes:', err);
    res.status(500).json({ erro: 'Erro ao buscar inadimplentes', detalhes: err.message });
  }
});


/* ⇢ Empréstimos vencidos ou vencendo hoje */
/* ⇢ Empréstimos vencidos ou vencendo hoje */
app.get('/emprestimos/vencidos-ou-hoje', async (_req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const lista = await Emprestimo.find({ quitado: false, datasVencimentos: { $exists: true, $not: { $size: 0 } } });

    const resultado = lista.filter(emp => {
      return emp.datasVencimentos.some((dataStr, i) => {
        // Valida se a parcela existe e se não foi paga
        if (emp.statusParcelas?.[i]) return false;

        const venc = new Date(dataStr);
        venc.setHours(0, 0, 0, 0);
        return venc <= hoje; // Vencidos ou vencendo hoje
      });
    });

    res.json(resultado);
  } catch (err) {
    console.error('GET /emprestimos/vencidos-ou-hoje:', err);
    res.status(500).json({ erro: 'Erro ao buscar vencidos ou vencendo hoje', detalhes: err.message });
  }
});

/* ⇢ Quitados */
app.get('/emprestimos/quitados', async (req, res) => {
  try {
    const termo = req.query.termo || '';
    const regex = new RegExp(termo, 'i'); // case insensitive

    const lista = await Emprestimo.find({
      quitado: true,
      $or: [
        { nome: { $regex: regex } },
        { cpf: { $regex: regex } },
      ]
    });

    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar quitados' });
  }
});

/* ⇢ Listagem geral ou busca por CPF */
app.get('/emprestimos', async (req, res) => {
  try {
    const { termo, status } = req.query;
    let filtro = {};

    // Filtro por termo (busca tanto no nome quanto no CPF)
    if (termo) {
      filtro.$or = [
        { nome: { $regex: termo, $options: 'i' } },
        { cpf: { $regex: termo, $options: 'i' } }
      ];
    }

    // Resto do código permanece igual...
    if (status === 'ativo') {
      filtro.quitado = false;
    } else if (status === 'quitado') {
      filtro.quitado = true;
    } else if (status === 'inadimplente') {
      return res.status(400).json({ erro: 'Use /emprestimos/inadimplentes para status inadimplente' });
    }

    const lista = await Emprestimo.find(filtro);
    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar empréstimos' });
  }
});


/* ⇢ Por data de vencimento */
app.get('/emprestimos/vencimento/:data', async (req, res) => {
  try {
    const data = req.params.data;
    const lista = await Emprestimo.find({
      quitado: false,
      datasVencimentos: data
    });
    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar por data' });
  }
});

/* ⇢ Upload avulso */
app.post('/upload-arquivos', upload.array('anexos'), (req, res) => {
  res.json({ sucesso: true, arquivos: req.files });
});

/* health‑check */
// server.js ou app.js
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});



/* ⇢ Dados do Dashboard */

/* ⇢ Dados do Dashboard */
app.get('/dashboard/dados', async (req, res) => {
  try {
    const { mes } = req.query; // ex: "2025-08"
    const todos = await Emprestimo.find();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let ativos = 0, quitados = 0, inadimplentes = 0;
    const jurosMes = {};
    const parcelasVencimento = {};

    // Função auxiliar para formatar mês: MM/YYYY
    function formatarMesAno(date) {
      return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    // Se parâmetro mes informado, extrair ano e mês
    let filtroAno, filtroMes;
    if (mes) {
      const partes = mes.split('-');
      if (partes.length === 2) {
        filtroAno = Number(partes[0]);
        filtroMes = Number(partes[1]);
      }
    }

    for (const emp of todos) {
      const totalJuros = emp.valorComJuros - emp.valorOriginal;
      const jurosPorParcela = emp.parcelas > 0 ? totalJuros / emp.parcelas : 0;

      emp.datasVencimentos?.forEach((dataStr, idx) => {
        const data = new Date(dataStr);
        const chave = formatarMesAno(data);

        // Filtra parcelas para o mês, se mes informado
        if (filtroAno && filtroMes) {
          if (data.getFullYear() !== filtroAno || (data.getMonth() + 1) !== filtroMes) {
            return; // pula esta parcela
          }
        }

        jurosMes[chave] = (jurosMes[chave] || 0) + jurosPorParcela;
        const valorParcela = emp.valorParcelasPendentes?.[idx] || emp.valorParcela;
        parcelasVencimento[chave] = (parcelasVencimento[chave] || 0) + valorParcela;
      });

      if (emp.quitado) {
        quitados++;
        continue;
      }

      const temParcelaVencida = emp.datasVencimentos?.some((d, i) => {
        const venc = new Date(d);
        venc.setHours(0, 0, 0, 0);
        return venc < hoje && !emp.statusParcelas[i];
      });

      if (temParcelaVencida) {
        inadimplentes++;
      } else {
        ativos++;
      }
    }

    // Ordenação das chaves MM/YYYY
    function ordenarDatas(a, b) {
      const [mesA, anoA] = a.split('/').map(Number);
      const [mesB, anoB] = b.split('/').map(Number);
      return anoA - anoB || mesA - mesB;
    }

    const ordenarEConstruir = (obj) => {
      const ordenado = {};
      Object.keys(obj).sort(ordenarDatas).forEach(k => {
        ordenado[k] = obj[k];
      });
      return ordenado;
    };

    res.json({
      ativos,
      quitados,
      inadimplentes,
      jurosMes: ordenarEConstruir(jurosMes),
      parcelasVencimento: ordenarEConstruir(parcelasVencimento)
    });
  } catch (err) {
    console.error('Erro em /dashboard/dados:', err);
    res.status(500).json({ erro: 'Erro ao calcular estatísticas' });
  }
});






app.get('/relatorio/pagamentos', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ erro: 'Informe os parâmetros ?inicio=AAAA-MM-DD&fim=AAAA-MM-DD' });
    }

    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);
    dataFim.setHours(23, 59, 59, 999); // incluir o dia inteiro

    const emprestimos = await Emprestimo.find();

    const resultado = [];
    let totalPago = 0;

    for (const emp of emprestimos) {
      const pagamentos = [];

      emp.datasPagamentos?.forEach((dataPag, idx) => {
        const data = new Date(dataPag);
        if (data >= dataInicio && data <= dataFim) {
          const valor = emp.valoresRecebidos?.[idx] || emp.valorParcela || 0;
          pagamentos.push({
          parcela: idx + 1,
          dataPagamento: dataPag,
          valor,
          recebidoPor: emp.recebidoPor?.[idx] || 'N/A'
        });

          totalPago += valor;
        }
      });

      if (pagamentos.length > 0) {
      resultado.push({
        nomeCliente: emp.nome,
        id: emp._id,
        pagamentos
      });

      }
    }

    res.json({ emprestimos: resultado, totalPago });
  } catch (err) {
    console.error('Erro em /relatorio/pagamentos:', err);
    res.status(500).json({ erro: 'Erro ao processar relatório' });
  }
});




/* ⇢ Detalhes por mês (para uso nos gráficos) */
app.get('/dashboard/detalhes/:tipo/:mesAno', async (req, res) => {
  try {
    const { tipo, mesAno } = req.params; // tipo: 'emprestimos' ou 'parcelas'
    const [mes, ano] = mesAno.split('-').map(Number);

    if (!['emprestimos', 'parcelas'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido. Use emprestimos ou parcelas.' });
    }

    const emprestimos = await Emprestimo.find();

    const resultado = [];

    for (const emp of emprestimos) {
      if (tipo === 'emprestimos') {
        const dataCriacao = new Date(emp.createdAt);
        if (dataCriacao.getMonth() + 1 === mes && dataCriacao.getFullYear() === ano) {
          resultado.push({
            nome: emp.nome,
            valorOriginal: emp.valorOriginal,
            valorComJuros: emp.valorComJuros,
            parcelas: emp.parcelas,
            valorParcela: emp.valorParcela,
            criadoEm: emp.createdAt,
            quitado: emp.quitado
          });
        }
      } else if (tipo === 'parcelas') {
        const vencimentos = emp.datasVencimentos || [];
        vencimentos.forEach((dataStr, idx) => {
          const data = new Date(dataStr);
          if (data.getMonth() + 1 === mes && data.getFullYear() === ano) {
            resultado.push({
              nome: emp.nome,
              parcela: idx + 1,
              valorPrevisto: emp.valorParcelasPendentes?.[idx] || emp.valorParcela,
              status: emp.statusParcelas?.[idx] ? 'Paga' : 'Pendente',
              dataVencimento: dataStr
            });
          }
        });
      }
    }

    res.json(resultado);
  } catch (err) {
    console.error('Erro em /dashboard/detalhes:', err);
    res.status(500).json({ erro: 'Erro ao buscar dados detalhados' });
  }
});



// Atualizar dados gerais do empréstimo (ex: nome, email, telefone, etc)
/* ⇢ Atualizar dados gerais do empréstimo */
app.patch('/emprestimos/:id', async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    if (isNaN(idNum)) return res.status(400).json({ erro: 'ID inválido' });

    const emprestimo = await Emprestimo.findOne({ id: idNum });
    if (!emprestimo) return res.status(404).json({ erro: 'Empréstimo não encontrado' });

    const dadosAtualizados = req.body;
    delete dadosAtualizados._id;
    delete dadosAtualizados.id;

    const valorOriginalAntigo = emprestimo.valorOriginal;
    const taxaJurosAntiga = emprestimo.taxaJuros;

    // Atualiza apenas campos simples
    const camposParaAtualizar = { ...dadosAtualizados };
    delete camposParaAtualizar.statusParcelas;
    delete camposParaAtualizar.datasPagamentos;
    delete camposParaAtualizar.recebidoPor;
    delete camposParaAtualizar.valoresRecebidos;
    delete camposParaAtualizar.valorParcelasPendentes;
    delete camposParaAtualizar.datasVencimentos;
    Object.assign(emprestimo, camposParaAtualizar);

    // Campos numéricos
    const valorOriginal = parseFloat(dadosAtualizados.valorOriginal);
    const taxaJuros = parseFloat(dadosAtualizados.taxaJuros);

    const valoresAlterados = !isNaN(valorOriginal) && !isNaN(taxaJuros) &&
      (valorOriginal !== valorOriginalAntigo || taxaJuros !== taxaJurosAntiga);

    if (valoresAlterados) {
      if (!Array.isArray(emprestimo.historicoAlteracoes)) emprestimo.historicoAlteracoes = [];

      if (valorOriginal !== valorOriginalAntigo) {
        emprestimo.historicoAlteracoes.push({ campo: "valorOriginal", de: valorOriginalAntigo, para: valorOriginal, data: new Date() });
      }
      if (taxaJuros !== taxaJurosAntiga) {
        emprestimo.historicoAlteracoes.push({ campo: "taxaJuros", de: taxaJurosAntiga, para: taxaJuros, data: new Date() });
      }

      emprestimo.valorOriginal = valorOriginal;
      emprestimo.taxaJuros = taxaJuros;

      // 🔹 Atualiza apenas a **última parcela pendente**
      const ultimaParcelaIndex = emprestimo.statusParcelas.lastIndexOf(false);
      if (ultimaParcelaIndex >= 0) {
        const saldoPrincipal = valorOriginal; // ou você pode recalcular com base no principal restante
        const valorParcelaAtualizada = saldoPrincipal * (taxaJuros / 100);

        if (!Array.isArray(emprestimo.valorParcelasPendentes)) emprestimo.valorParcelasPendentes = [];
        emprestimo.valorParcelasPendentes[ultimaParcelaIndex] = valorParcelaAtualizada;

        // Atualiza o campo global de valorParcela apenas para referência
        emprestimo.valorParcela = valorParcelaAtualizada;
      }
    }

    await emprestimo.save();
    res.json(emprestimo);

  } catch (err) {
    console.error('PATCH /emprestimos/:id:', err);
    res.status(500).json({ erro: 'Erro ao atualizar empréstimo' });
  }
});







/* ⇢ Detalhes por mês (para uso nos gráficos) */
app.get('/dashboard/detalhes/:tipo/:mesAno', async (req, res) => {
  try {
    const { tipo, mesAno } = req.params; // tipo: 'emprestimos' ou 'parcelas'
    const [mes, ano] = mesAno.split('-').map(Number);

    if (!['emprestimos', 'parcelas'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo inválido. Use emprestimos ou parcelas.' });
    }

    const emprestimos = await Emprestimo.find();

    const resultado = [];

    for (const emp of emprestimos) {
      if (tipo === 'emprestimos') {
        const dataCriacao = new Date(emp.createdAt);
        if (dataCriacao.getMonth() + 1 === mes && dataCriacao.getFullYear() === ano) {
          resultado.push({
            nome: emp.nome,
            valorOriginal: emp.valorOriginal,
            valorComJuros: emp.valorComJuros,
            parcelas: emp.parcelas,
            valorParcela: emp.valorParcela,
            criadoEm: emp.createdAt,
            quitado: emp.quitado
          });
        }
      } else if (tipo === 'parcelas') {
        const vencimentos = emp.datasVencimentos || [];
        vencimentos.forEach((dataStr, idx) => {
          const data = new Date(dataStr);
          if (data.getMonth() + 1 === mes && data.getFullYear() === ano) {
            resultado.push({
              nome: emp.nome,
              parcela: idx + 1,
              valorPrevisto: emp.valorParcelasPendentes?.[idx] || emp.valorParcela,
              status: emp.statusParcelas?.[idx] ? 'Paga' : 'Pendente',
              dataVencimento: dataStr
            });
          }
        });
      }
    }

    res.json(resultado);
  } catch (err) {
    console.error('Erro em /dashboard/detalhes:', err);
    res.status(500).json({ erro: 'Erro ao buscar dados detalhados' });
  }
});


// Criar vários empréstimos de uma vez
app.post('/emprestimos/lote', upload.none(), async (req, res) => {
  try {
    const lista = req.body.emprestimos;

    if (!Array.isArray(lista) || lista.length === 0) {
      return res.status(400).json({ erro: 'Envie um array de empréstimos.' });
    }

    const emprestimosFormatados = lista.map((dados, i) => {
      const {
        nome, email, telefone, cpf, endereco, cidade, estado, cep, numero,
        valor, parcelas, datasVencimentos = [], taxaJuros
      } = dados;

      // Definir complemento como string vazia se não existir
      const complemento = dados.complemento || '';

      const taxa = taxaJuros !== undefined ? Number(taxaJuros) : 20;
      const valorNum = Number(valor);
      const parcelasNum = Number(parcelas);
      const vencimentos = Array.isArray(datasVencimentos) ? datasVencimentos : [datasVencimentos];
      const datasCalc = preencherDatasPadrao(vencimentos, parcelasNum);
      const valorComJuros = valorNum * (1 + taxa / 100);

      return {
        // REMOVER a geração manual do ID - o MongoDB gerará _id automaticamente
        nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
        valorOriginal: valorNum,
        valorComJuros,
        parcelas: parcelasNum,
        valorParcela: null,
        valorParcelasPendentes: Array.from({ length: parcelasNum }, () => null),
        id: Date.now() + i, // i é o índice do map
        taxaJuros: taxa,
        statusParcelas: Array.from({ length: parcelasNum }, () => false),
        datasPagamentos: Array.from({ length: parcelasNum }, () => null),
        datasVencimentos: datasCalc,
        valoresRecebidos: Array.from({ length: parcelasNum }, () => null),
        recebidoPor: Array.from({ length: parcelasNum }, () => null),
        arquivos: [],
        quitado: false
      };
    });

    const inseridos = await Emprestimo.insertMany(emprestimosFormatados);

    res.status(201).json({ sucesso: true, inseridos });
  } catch (err) {
    console.error('POST /emprestimos/lote:', err);
    res.status(500).json({ erro: 'Erro ao criar empréstimos em lote' });
  }
});


app.post('/emprestimos/parcelado/lote', upload.none(), async (req, res) => {
  try {
    let { linhas } = req.body;

    if (!linhas) {
      return res.status(400).json({ erro: 'Envie o campo "linhas" com os empréstimos.' });
    }

    if (typeof linhas === 'string') {
      linhas = linhas
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
    }

    if (!Array.isArray(linhas) || linhas.length === 0) {
      return res.status(400).json({ erro: 'Nenhuma linha válida encontrada.' });
    }

    const emprestimosFormatados = linhas.map((linha, i) => {
      // Formato: nome;cidade;valor;parcelas;dataPrimeira
      const partes = linha.split(';').map(p => p.trim());
      if (partes.length < 5) {
        throw new Error(`Linha inválida (${i + 1}): "${linha}"`);
      }

      const [nome, cidade, valor, parcelas, dataPrimeira] = partes;

      // ✅ LIMPEZA DO VALOR (ESSENCIAL!)
      const valorLimpo = valor.replace(/[^\d,.]/g, '');
      let valorNum;

      if (valorLimpo.includes(',')) {
        valorNum = parseFloat(valorLimpo.replace(/\./g, '').replace(',', '.'));
      } else {
        valorNum = parseFloat(valorLimpo);
      }

      const parcelasNum = Number(parcelas);
      const primeiraData = new Date(dataPrimeira);

      // ✅ VALIDAÇÕES
      if (isNaN(valorNum) || valorNum <= 0) {
        throw new Error(`Valor inválido na linha ${i + 1}`);
      }
      if (isNaN(parcelasNum) || parcelasNum <= 0) {
        throw new Error(`Parcelas inválidas na linha ${i + 1}`);
      }
      if (isNaN(primeiraData)) {
        throw new Error(`Data inválida na linha ${i + 1}: ${dataPrimeira}`);
      }

      // ✅ Datas mensais
      const datasVencimentos = Array.from({ length: parcelasNum }, (_, idx) => {
        const d = new Date(primeiraData);
        d.setMonth(primeiraData.getMonth() + idx);
        return d.toISOString().split('T')[0];
      });

      // ✅ AMORTIZAÇÃO DINÂMICA — valor inicial das parcelas
      const valorParcelaInicial = valorNum / parcelasNum;

      // ✅ Dados fixos
      const email = 'teste@teste.com';
      const telefone = '11999999999';
      const cpf = '00000000000';
      const endereco = 'Rua';
      const estado = 'SP';
      const cep = '00000-000';
      const numero = '00';
      const complemento = 'Casa';

      return {
        id: Date.now() + i,
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

        valorOriginal: valorNum,
        parcelas: parcelasNum,
        tipoParcelamento: 'parcelado',

        // ✅ ARRAYS DO MODELO PARCELADO (sem juros)
        valoresOriginaisParcelas: Array(parcelasNum).fill(valorParcelaInicial),
        valorParcelasPendentes: Array(parcelasNum).fill(valorParcelaInicial),

        statusParcelas: Array(parcelasNum).fill(false),
        valoresRecebidos: Array(parcelasNum).fill(0),
        recebidoPor: Array(parcelasNum).fill(null),
        multasParcelas: Array(parcelasNum).fill(0),
        parcelasPagasParciais: Array(parcelasNum).fill(null),

        datasPagamentos: Array(parcelasNum).fill(null),
        datasVencimentos,

        arquivos: [],
        quitado: false,
        taxaJuros: 0
      };
    });

    // ✅ Insere tudo de uma vez
    const inseridos = await Emprestimo.insertMany(emprestimosFormatados);

    // ✅ DEBUG CORRETO: Agora sim conseguimos ver os valores criados!
    console.log("=== DEBUG LOTE: valoresOriginaisParcelas ===");
    inseridos.forEach((e, idx) => {
      console.log(`Empréstimo ${idx + 1}:`, e.valoresOriginaisParcelas);
    });

    res.status(201).json({ sucesso: true, inseridos });

  } catch (err) {
    console.error('POST /emprestimos/parcelado/lote:', err);
    res.status(500).json({ erro: err.message || 'Erro ao criar empréstimos parcelados em lote' });
  }
});








// DELETE /emprestimos/:id
app.delete('/emprestimos/:id', async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    if (isNaN(idNum)) return res.status(400).json({ erro: 'ID inválido' });

    const emprestimo = await Emprestimo.findOneAndDelete({ id: idNum });
    if (!emprestimo) {
      return res.status(404).json({ erro: 'Empréstimo não encontrado' });
    }

    res.json({ sucesso: true, mensagem: `Empréstimo ${idNum} deletado com sucesso.` });
  } catch (err) {
    console.error('DELETE /emprestimos/:id:', err);
    res.status(500).json({ erro: 'Erro ao deletar empréstimo' });
  }
});



/* ----------------------- ROTA PARA DELETAR TUDO (TESTE) ---------------------- */
// ⚠️ ROTA PERIGOSA - APENAS PARA AMBIENTE DE TESTE ⚠️
app.delete('/api/test/limpar-tudo', async (req, res) => {
  try {
    console.log('⚠️  LIMPANDO TODOS OS DADOS - AMBIENTE DE TESTE');
    
    // Deleta todos os empréstimos
    const resultado = await Emprestimo.deleteMany({});
    
    console.log(`✅ ${resultado.deletedCount} registros deletados`);
    
    res.json({
      message: 'Base de dados limpa com sucesso',
      deletedCount: resultado.deletedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
    res.status(500).json({ 
      error: 'Erro ao limpar dados',
      details: error.message 
    });
  }
});


/* ------------------- ROTA PARA DELETAR CLIENTES POR CIDADE ------------------- */
// ⚠️ ROTA PERIGOSA - USE COM CUIDADO ⚠️
app.delete('/api/test/limpar-clientes/:cidade', async (req, res) => {
  try {
    const { cidade } = req.params;

    console.log(`⚠️ Deletando todos os clientes da cidade: ${cidade}`);

    const resultado = await Emprestimo.deleteMany({ cidade: new RegExp(`^${cidade}$`, 'i') });

    console.log(`✅ ${resultado.deletedCount} clientes de ${cidade} deletados`);

    res.json({
      message: `Clientes da cidade ${cidade} deletados com sucesso`,
      deletedCount: resultado.deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao deletar clientes:', error);
    res.status(500).json({
      error: 'Erro ao deletar clientes',
      details: error.message
    });
  }
});





/* ----------------------- START SERVER ---------------------- */
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});