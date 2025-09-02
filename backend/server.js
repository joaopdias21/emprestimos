// server.js

const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const mongoose = require('mongoose');
const fs       = require('fs');

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
app.use(express.json());

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
    return res.json({ sucesso: true, tipo: 'admin' }); // admin total
  } else if (senha === SENHAS.adminMensal3) {
    return res.json({ sucesso: true, tipo: 'adminMensal3' }); // admin restrito
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
  valorOriginal: Number,
  valorComJuros: Number,
  parcelas: Number,
  valorParcela: Number,
  valorParcelasPendentes: [Number],
  taxaJuros: Number,
  statusParcelas: [Boolean],
  datasPagamentos: [String],
  datasVencimentos: [String],
  valoresRecebidos: [Number],
  recebidoPor: [String],
  arquivos: [{
    nomeOriginal: String,
    caminho: String
  }],
  quitado: { type: Boolean, default: false },
  tipoParcelamento: { type: String, default: 'juros' }
}, { timestamps: true });


const Emprestimo = mongoose.model('Emprestimo', EmprestimoSchema);

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
    console.log('Dados recebidos:', req.body);
    console.log('Valor:', req.body.valor, 'Tipo:', typeof req.body.valor);
    console.log('Parcelas:', req.body.parcelas, 'Tipo:', typeof req.body.parcelas);
    console.log('Taxa Juros:', req.body.taxaJuros, 'Tipo:', typeof req.body.taxaJuros);
    
    const {
      nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
      valor, parcelas, datasVencimentos = []
    } = req.body;

    // ✅ CORREÇÃO: Limpar o valor monetário formatado CORRETAMENTE
    const valorLimpo = valor.replace(/[^\d,.]/g, ''); // Mantém dígitos, vírgula e ponto
    let valorNum;
    
    // Verifica se tem vírgula (formato brasileiro) ou ponto (formato internacional)
    if (valorLimpo.includes(',')) {
      // Formato brasileiro: 1.000,50 → 1000.50
      valorNum = parseFloat(valorLimpo.replace('.', '').replace(',', '.'));
    } else {
      // Formato internacional: 100.00 → 100.00
      valorNum = parseFloat(valorLimpo);
    }
    
    const taxaJuros = req.body.taxaJuros !== undefined ? Number(req.body.taxaJuros) : 20;
    const parcelasNum = Number(parcelas) || 1;

    console.log('Valor limpo:', valorLimpo);
    console.log('Valor numérico:', valorNum);
    console.log('Parcelas numérico:', parcelasNum);
    console.log('Taxa Juros numérico:', taxaJuros);

    // ✅ VALIDAÇÃO: Verificar se os valores são números válidos
    if (isNaN(valorNum) || isNaN(parcelasNum) || isNaN(taxaJuros)) {
      return res.status(400).json({ erro: 'Valores numéricos inválidos' });
    }

    // Garante que datasVencimentos seja array
    const vencimentos = Array.isArray(datasVencimentos) ? datasVencimentos : [datasVencimentos];

    // Preenche datas faltantes com padrão mensal
    const datasCalc = preencherDatasPadrao(vencimentos, parcelasNum);

    const valorComJuros = valorNum * (1 + taxaJuros / 100);
    const valorParcela = valorComJuros / parcelasNum;

    const arquivos = (req.files || []).map(f => ({
      nomeOriginal: f.originalname,
      caminho: `/uploads/${f.filename}`
    }));

    const valorParcelasPendentes = Array.from({ length: parcelasNum }, () => valorParcela);

    const novo = await Emprestimo.create({
      id: Date.now(),
      nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
      valorOriginal: valorNum,
      valorComJuros: valorComJuros,
      parcelas: parcelasNum,
      valorParcela: valorParcela,
      valorParcelasPendentes: valorParcelasPendentes,
      taxaJuros,
      statusParcelas: Array.from({ length: parcelasNum }, () => false),
      datasPagamentos: Array.from({ length: parcelasNum }, () => null),
      datasVencimentos: datasCalc,
      valoresRecebidos: Array.from({ length: parcelasNum }, () => null),
      recebidoPor: Array.from({ length: parcelasNum }, () => null),
      arquivos,
      quitado: false,
      tipoParcelamento: 'parcelado'
    });

    res.status(201).json(novo);
  } catch (err) {
    console.error('POST /emprestimos/parcelado:', err);
    res.status(500).json({ erro: 'Erro ao criar empréstimo parcelado' });
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
  const jurosFixo = getJurosFixo(emp);
  let totalMultas = 0;
  let totalPagoValido = 0;
  const parcelasInfo = [];

  (emp.valoresRecebidos || []).forEach((val, i) => {
    if (typeof val !== 'number') return;

    const diasAtraso = calcularDiasAtraso(emp.datasVencimentos?.[i] || null);
    const multaParcela = diasAtraso * 20;
    totalMultas += (!emp.statusParcelas?.[i] && diasAtraso > 0) ? multaParcela : 0;

    // VALOR EXATO SEM ARREDONDAMENTO
    const valorParcela = emp.valorParcelasPendentes?.[i] ?? jurosFixo;
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
      info.status = '💰 Acima do juros + multa';
      totalPagoValido += info.excedente;
    } else if (val >= valorParcela) {
      info.status = '✅ Pago corretamente';
    } else {
      info.status = '⚠️ Pago abaixo do juros';
    }

    parcelasInfo.push(info);
  });

  const valorTotalComJuros = emp.valorComJuros || 0;
  const valorRestanteUI = Math.max(0, valorTotalComJuros - totalPagoValido);
  const valorPrincipalRestante = Math.max(0, (emp.valorOriginal || 0) - totalPagoValido);

  return {
    parcelasInfo,
    totalMultas,
    totalPagoValido,
    valorRestanteUI,
    valorPrincipalRestante
  };
}

// Rota PATCH - CORREÇÃO DO ARREDONDAMENTO
app.patch('/emprestimos/:id/parcela/:indice', async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    const indice = Number(req.params.indice);
    const emp = await Emprestimo.findOne({ id: idNum });
    if (!emp) return res.status(404).json({ erro: 'Empréstimo não encontrado' });
    if (!Number.isInteger(indice) || indice < 0 || indice >= emp.parcelas)
      return res.status(400).json({ erro: 'Parcela inválida' });

    // Inicializa arrays extras
    const campos = ['statusParcelas', 'datasPagamentos', 'recebidoPor', 'valorParcelasPendentes', 'valoresRecebidos', 'parcelasPagasParciais', 'datasVencimentos'];
    campos.forEach(campo => {
      if (!Array.isArray(emp[campo])) emp[campo] = [];
      while (emp[campo].length < emp.parcelas) {
        emp[campo].push(campo === 'statusParcelas' ? false : null);
      }
    });

    const recebido = parseFloat(req.body.valorRecebido);
    if (!Number.isFinite(recebido) || recebido <= 0) {
      return res.status(400).json({ erro: 'valorRecebido inválido' });
    }

    const dataPagamento = req.body.dataPagamento || new Date().toISOString();

    // Calcula multa se houver atraso
    let diasAtraso = 0, multa = 0;
    const vencimentoAtual = emp.datasVencimentos?.[indice];
    if (vencimentoAtual) {
      const dataVenc = new Date(vencimentoAtual);
      const dataPag = new Date(dataPagamento);
      if (dataPag > dataVenc) {
        diasAtraso = Math.floor((dataPag - dataVenc) / (1000*60*60*24));
        multa = diasAtraso * 20;
      }
    }

    const valorBaseDaParcela = emp.valorParcelasPendentes?.[indice] ?? 0;
    const valorTotalNecessario = valorBaseDaParcela + multa;

    // ✅ Soma valor recebido (parcial)
    const recebidoAnterior = emp.valoresRecebidos?.[indice] || 0;
    const novoTotalRecebido = recebidoAnterior + recebido;

    emp.valoresRecebidos[indice] = novoTotalRecebido;
    emp.recebidoPor[indice] = req.body.nomeRecebedor || 'Desconhecido';

    // Calcula quanto ainda falta
    const valorFaltante = Math.max(0, valorTotalNecessario - novoTotalRecebido);

    if (valorFaltante <= 0) {
      // Considera quitada
      emp.statusParcelas[indice] = true;
      emp.datasPagamentos[indice] = dataPagamento;
    } else {
      // Mantém como pendente, mas registra o que já foi pago
      emp.statusParcelas[indice] = false;
      emp.parcelasPagasParciais[indice] = {
        pago: novoTotalRecebido,
        falta: valorFaltante,
        ultimaData: dataPagamento
      };
    }

    // Salva progresso
    await emp.save();

    // Recalcula resumo
    const resumoFinal = calcularResumoParcelas(emp);
    const todasParcelasPagas = emp.statusParcelas.every(s => s === true);
    const quitado = todasParcelasPagas && resumoFinal.valorPrincipalRestante <= 0;
    emp.quitado = quitado;

    // 🔹 Regras para GERAR NOVA PARCELA:
    if (!quitado && valorFaltante <= 0 && indice === emp.parcelas - 1) {
      emp.parcelas++;
      emp.statusParcelas.push(false);
      emp.datasPagamentos.push(null);
      emp.recebidoPor.push(null);
      emp.valoresRecebidos.push(0);
      emp.parcelasPagasParciais.push(null);

      const taxa = emp.taxaJuros || 20;
      const jurosSobreSaldo = resumoFinal.valorPrincipalRestante * (taxa / 100);

      const valorNovaParcela = parseFloat(
        Math.min(resumoFinal.valorPrincipalRestante, jurosSobreSaldo).toFixed(2)
      );

      emp.valorParcelasPendentes.push(valorNovaParcela);

      const base = emp.datasVencimentos[emp.datasVencimentos.length - 1]
        ? new Date(emp.datasVencimentos[emp.datasVencimentos.length - 1])
        : new Date();
      base.setMonth(base.getMonth() + 1);
      emp.datasVencimentos.push(base.toISOString().slice(0, 10));
    }

    await emp.save();

    res.json({
      ...emp.toObject(),
      ...resumoFinal,
      diasAtraso,
      multa,
      valorFaltante,
      quitado,
      todasParcelasPagas
    });

  } catch (err) {
    console.error('PATCH /parcela:', err);
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
    if (isNaN(idNum)) {
      return res.status(400).json({ erro: 'ID inválido' });
    }

    const emprestimo = await Emprestimo.findOne({ id: idNum });
    if (!emprestimo) {
      return res.status(404).json({ erro: 'Empréstimo não encontrado' });
    }

    const dadosAtualizados = req.body;

    // Segurança: remove campos que não devem ser alterados diretamente
    delete dadosAtualizados._id;
    delete dadosAtualizados.id;

    // Atualiza os campos enviados
    Object.assign(emprestimo, dadosAtualizados);

    // Parse dos campos numéricos
    const valorOriginal  = parseFloat(dadosAtualizados.valorOriginal);
    const taxaJuros      = parseFloat(dadosAtualizados.taxaJuros);
    const parcelas       = parseInt(dadosAtualizados.parcelas, 10);

    if (!isNaN(valorOriginal) && !isNaN(taxaJuros) && !isNaN(parcelas)) {
      emprestimo.valorOriginal = valorOriginal;
      emprestimo.taxaJuros = taxaJuros;
      emprestimo.parcelas = parcelas;

      const valorComJuros = valorOriginal * (1 + taxaJuros / 100);
      emprestimo.valorComJuros = valorComJuros;

      // Preenche as datas vencimentos já existentes e completa as que estiverem faltando
      const novasDatasVencimento = preencherDatasPadrao(
        Array.isArray(emprestimo.datasVencimentos) ? emprestimo.datasVencimentos : [],
        parcelas
      );

      // Inicializa os arrays novos do tamanho correto
      const novosStatus = Array(parcelas).fill(false);
      const novosDatasPagamentos = Array(parcelas).fill(null);
      const novosRecebidoPor = Array(parcelas).fill(null);
      const novosValoresRecebidos = Array(parcelas).fill(null);
      const novosValoresPendentes = Array(parcelas).fill(0); // vamos setar depois

      const qtdAntiga = emprestimo.statusParcelas.length;

      // Copia dados antigos para os novos arrays (preserva o que já tem)
      for (let i = 0; i < Math.min(qtdAntiga, parcelas); i++) {
        novosStatus[i] = emprestimo.statusParcelas[i];
        novosDatasPagamentos[i] = emprestimo.datasPagamentos[i];
        novosRecebidoPor[i] = emprestimo.recebidoPor[i];
        novosValoresRecebidos[i] = emprestimo.valoresRecebidos[i];
      }

      // Soma do valor já pago (parcelas marcadas como pagas)
      const totalPago = novosValoresRecebidos.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);

      // Quantidade de parcelas pendentes
      const numPendentes = novosStatus.filter(paga => !paga).length;

      // Valor que falta pagar
      const saldoRestante = valorComJuros - totalPago;

      // Valor da parcela pendente (divide o saldo restante igualmente)
      const valorParcelaPendente = numPendentes > 0 ? saldoRestante / numPendentes : 0;

      // Atualiza valorParcelasPendentes
      for (let i = 0; i < parcelas; i++) {
        if (novosStatus[i]) {
          // Parcela já paga: mantém o valor pendente original
          // Para manter o valor pendente antigo, podemos usar valorParcelaPendentes[i] antigo ou calcular como (valorRecebido[i] ?? 0)
          // Porém o valor pendente geralmente é zero para pagas, então manteremos o valor que já existia ou zero.
          novosValoresPendentes[i] = emprestimo.valorParcelasPendentes && emprestimo.valorParcelasPendentes[i] != null
            ? emprestimo.valorParcelasPendentes[i]
            : 0;
        } else {
          // Parcela pendente recebe o valor recalculado
          novosValoresPendentes[i] = parseFloat(valorParcelaPendente.toFixed(2));
        }
      }

      // Atualiza os campos no empréstimo
      emprestimo.statusParcelas = novosStatus;
      emprestimo.datasPagamentos = novosDatasPagamentos;
      emprestimo.recebidoPor = novosRecebidoPor;
      emprestimo.valoresRecebidos = novosValoresRecebidos;
      emprestimo.valorParcelasPendentes = novosValoresPendentes;
      emprestimo.datasVencimentos = novasDatasVencimento;

      // Atualiza o valorParcela com o valor das parcelas pendentes (que agora são todas iguais)
      emprestimo.valorParcela = valorParcelaPendente;
    }

    emprestimo.quitado = emprestimo.statusParcelas.every(Boolean);

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





/* ----------------------- START SERVER ---------------------- */
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
