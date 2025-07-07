
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const FILE = './dados.json';

function lerDados() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function salvarDados(dados) {
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

app.post('/emprestimos', (req, res) => {
  const dados = lerDados();
  const { nome, email, telefone, cpf, endereco, cidade, estado, cep, numero, complemento, valor, parcelas, taxaJuros = 20 } = req.body;

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


app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
