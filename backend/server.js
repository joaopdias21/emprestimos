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
  statusParcelas:   [Boolean],
  datasPagamentos:  [String],
  datasVencimentos: [String],
  valoresRecebidos: [Number],
  recebidoPor:      [String],
  arquivos: [{
    nomeOriginal: String,
    caminho:      String
  }],
  quitado: { type: Boolean, default: false }
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
app.post('/emprestimos', upload.array('anexos'), async (req, res) => {
  try {
    const {
  nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
  valor, parcelas, datasVencimentos = []
} = req.body;
console.log(req.body.taxaJuros)
const taxaJuros = req.body.taxaJuros !== undefined ? Number(req.body.taxaJuros) : 20;


    const valorNum      = Number(valor);
    const parcelasNum   = Number(parcelas);
    const taxa          = parseFloat(taxaJuros) / 100;
    const vencimentos   = Array.isArray(datasVencimentos) ? datasVencimentos : [datasVencimentos];

    const datasCalc = vencimentos.length === parcelasNum
      ? vencimentos
      : Array.from({ length: parcelasNum }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() + i + 1);
          return formatarDataLocal(d);
        });

    const valorComJuros = valorNum * (1 + taxa);
    const valorParcela  = valorComJuros / parcelasNum;

    const arquivos = (req.files || []).map(f => ({
      nomeOriginal: f.originalname,
      caminho:      `/uploads/${f.filename}`
    }));

    const novo = await Emprestimo.create({
      id: Date.now(),
      nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento,
      valorOriginal: valorNum,
      valorComJuros,
      parcelas: parcelasNum,
      valorParcela,
      valorParcelasPendentes: Array.from({ length: parcelasNum }, () => +valorParcela.toFixed(2)),
      taxaJuros,
      statusParcelas: Array.from({ length: parcelasNum }, () => false),
      datasPagamentos: Array.from({ length: parcelasNum }, () => null),
      datasVencimentos: datasCalc,
      arquivos,
      quitado: false
    });

    // Loga o caminho completo dos arquivos no servidor
    (req.files || []).forEach(f => console.log('Arquivo salvo em:', path.join(uploadDir, f.filename)));

    res.status(201).json(novo);
  } catch (err) {
    console.error('POST /emprestimos:', err);
    res.status(500).json({ erro: 'Erro ao criar empréstimo' });
  }
});

/* ⇢ Empréstimos inadimplentes */
app.get('/emprestimos/inadimplentes', async (_req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // zera a hora para comparar apenas a data

    const lista = await Emprestimo.find({ quitado: false });

    const inadimplentes = lista.filter(emp => {
      return emp.datasVencimentos.some((data, i) => {
        const [a, m, d] = data.split('-').map(Number);
        const venc = new Date(a, m - 1, d);
        venc.setHours(0, 0, 0, 0); // zera também o vencimento

        // considera inadimplente apenas se o vencimento for anterior a hoje
        return venc < hoje && !emp.statusParcelas[i];
      });
    });

    res.json(inadimplentes);
  } catch (err) {
    console.error('GET /inadimplentes:', err);
    res.status(500).json({ erro: 'Erro ao buscar inadimplentes' });
  }
});


/* ⇢ Marcar parcela como paga */
app.patch('/emprestimos/:id/parcela/:indice', async (req, res) => {
  try {
    const idNum   = Number(req.params.id);
    const indice  = Number(req.params.indice);

    const emp = await Emprestimo.findOne({ id: idNum });
    if (!emp) return res.status(404).json({ erro: 'Empréstimo não encontrado' });

    if (indice < 0 || indice >= emp.parcelas)
      return res.status(400).json({ erro: 'Parcela inválida' });

    /* garante arrays */
    ['statusParcelas','datasPagamentos','recebidoPor','valorParcelasPendentes','valoresRecebidos']
      .forEach(campo => { if (!Array.isArray(emp[campo])) emp[campo] = Array.from(
        { length: emp.parcelas },
        () => campo === 'statusParcelas' ? false : null
      ); });

    const recebido = parseFloat(req.body.valorRecebido);
    const previsto = emp.valorParcelasPendentes[indice];

    emp.statusParcelas[indice]   = true;
    emp.datasPagamentos[indice]  = req.body.dataPagamento || new Date().toISOString();
    emp.recebidoPor[indice]      = req.body.nomeRecebedor || 'Desconhecido';
    emp.valoresRecebidos[indice] = recebido;

    /* redistribui diferença */
    const diff   = previsto - recebido;
    const rest   = emp.statusParcelas
      .map((paga, i) => (!paga ? i : null))
      .filter(i => i !== null && i > indice);

    if (rest.length && diff !== 0) {
      const ajuste = diff / rest.length;
      rest.forEach((i, k) => {
        if (k === rest.length - 1) {
          const somaParcial = rest.slice(0,-1)
            .reduce((s,j)=>s+emp.valorParcelasPendentes[j],0);
          emp.valorParcelasPendentes[i] = parseFloat(
            (emp.valorParcelasPendentes[i]
             + (diff - ajuste * (rest.length - 1))).toFixed(2));
        } else {
          emp.valorParcelasPendentes[i] = parseFloat(
            (emp.valorParcelasPendentes[i] + ajuste).toFixed(2));
        }
      });
    }

    emp.quitado = emp.statusParcelas.every(Boolean);
    await emp.save();

    res.json(emp);
  } catch (err) {
    console.error('PATCH /parcela:', err);
    res.status(500).json({ erro: 'Erro ao atualizar parcela' });
  }
});

/* ⇢ Quitados */
app.get('/emprestimos/quitados', async (_req, res) => {
  try {
    const lista = await Emprestimo.find({ quitado: true });
    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar quitados' });
  }
});

/* ⇢ Listagem geral ou busca por CPF */
app.get('/emprestimos', async (req, res) => {
  try {
    const { termo } = req.query;
    let filtro = {};
    if (termo) filtro = { quitado: false, cpf: { $regex: termo, $options: 'i' } };
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
app.get('/ping', (_req, res) => res.send('pong'));



/* ⇢ Dados do Dashboard */

app.get('/dashboard/dados', async (_req, res) => {
  try {
    const todos = await Emprestimo.find();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let ativos = 0, quitados = 0, inadimplentes = 0;
    const porMes = {}; // Valor original por mês
    const jurosMes = {}; // Juros a receber por mês
    const parcelasVencimento = {}; // Parcelas com vencimento no mês

    for (const emp of todos) {
      const dataCriacao = new Date(emp.createdAt);
      const mesCriacao = `${String(dataCriacao.getMonth() + 1).padStart(2, '0')}/${dataCriacao.getFullYear()}`;
      porMes[mesCriacao] = (porMes[mesCriacao] || 0) + emp.valorOriginal;

      const totalJuros = emp.valorComJuros - emp.valorOriginal;
      const jurosPorParcela = totalJuros / emp.parcelas;

      emp.datasVencimentos?.forEach((dataStr, idx) => {
        const data = new Date(dataStr);
        const chave = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;

        // Juros para parcela do mês
        jurosMes[chave] = (jurosMes[chave] || 0) + jurosPorParcela;

        // Valor da parcela prevista para o mês
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


    // Função para ordenar as chaves no formato MM/AAAA
    function ordenarDatas(a, b) {
      const [mesA, anoA] = a.split('/').map(Number);
      const [mesB, anoB] = b.split('/').map(Number);
      
      // Primeiro compara o ano, depois o mês
      return anoA - anoB || mesA - mesB;
    }

    // Criar objetos ordenados
    const porMesOrdenado = {};
    const jurosMesOrdenado = {};
    const parcelasVencimentoOrdenado = {};

    Object.keys(porMes).sort(ordenarDatas).forEach(key => {
      porMesOrdenado[key] = porMes[key];
    });

    Object.keys(jurosMes).sort(ordenarDatas).forEach(key => {
      jurosMesOrdenado[key] = jurosMes[key];
    });

    Object.keys(parcelasVencimento).sort(ordenarDatas).forEach(key => {
      parcelasVencimentoOrdenado[key] = parcelasVencimento[key];
    });

    res.json({
      ativos,
      quitados,
      inadimplentes,
      porMes: porMesOrdenado,
      jurosMes: jurosMesOrdenado,
      parcelasVencimento: parcelasVencimentoOrdenado
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



// Atualizar dados gerais do empréstimo (ex: nome, email, telefone, etc)
app.patch('/emprestimos/:id', async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    if (isNaN(idNum)) {
      return res.status(400).json({ erro: 'ID inválido' });
    }

    const dadosAtualizados = req.body;

    // Remova campos que não quer atualizar direto, por segurança (opcional)
    delete dadosAtualizados._id;
    delete dadosAtualizados.id; // se quiser manter id fixo

    const emprestimo = await Emprestimo.findOne({ id: idNum });
    if (!emprestimo) {
      return res.status(404).json({ erro: 'Empréstimo não encontrado' });
    }

    // Atualiza apenas os campos enviados no corpo
    Object.assign(emprestimo, dadosAtualizados);

    await emprestimo.save();

    res.json(emprestimo);
  } catch (err) {
    console.error('PATCH /emprestimos/:id:', err);
    res.status(500).json({ erro: 'Erro ao atualizar empréstimo' });
  }
});






/* ----------------------- START SERVER ---------------------- */
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
