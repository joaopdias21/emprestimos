import { URL_SERVICO } from './config.js';
import { mostrarAlerta, mostrarAlertaError, formatarMoeda, mostrarAlertaWarning } from './utils.js';


document.addEventListener('DOMContentLoaded', () => {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isAdminMensal3 = localStorage.getItem("isAdminMensal3") === "true";
  const isOperador = localStorage.getItem("isOperador") === "true";
  
  const authButtonsContainer = document.getElementById("authButtonsContainer");
  authButtonsContainer.innerHTML = '';
  
  if (isAdmin || isAdminMensal3 || isOperador) {

    const atualizarBtn = document.createElement('button');
atualizarBtn.id = 'btnAtualizar';
atualizarBtn.className = 'btn-atualizar';
atualizarBtn.innerHTML = `
  <span class="icon-refresh"></span>
  Atualizar
`;
atualizarBtn.addEventListener("click", () => {
  location.reload(true);
});
authButtonsContainer.appendChild(atualizarBtn);


    // Botão de sair
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.textContent = 'Sair';
    authButtonsContainer.appendChild(logoutBtn);
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("isAdminMensal3");
      localStorage.removeItem("isOperador");
      location.reload();
    });

if (isAdmin) {
  // Admin completo → mostra tudo
  document.querySelectorAll(`
    .form-column,
    #dashboard,
    #filtroPagamentos,
    .separador,
    .separadorCadastro,
    .separadorPesquisas,
    .separadorGraficos,
    .separadorMensais,
    .separadorDataDeVencimento,
    .separadorSolicitacoes,
    #listaSolicitacoes
  `).forEach(el => {
    el.style.display = el.classList.contains("separador") ? "flex" : "block";
  });

  console.log("✅ Admin logado - elementos exibidos");

  // --- Função de carregar solicitações ---
  async function carregarSolicitacoes() {
    try {
      const resp = await fetch(`${URL_SERVICO}/solicitacoes`);
      if (!resp.ok) throw new Error("Erro ao buscar solicitações");
      const solicitacoes = await resp.json();

      const container = document.getElementById("listaSolicitacoes");
      if (!container) {
        console.error("❌ Elemento #listaSolicitacoes não encontrado no DOM");
        return;
      }

      // limpar antes de renderizar
      container.innerHTML = "";

      if (solicitacoes.length === 0) {
        container.innerHTML = "<p>Nenhuma solicitação pendente.</p>";
        return;
      }

      // montar cada solicitação
      solicitacoes.forEach(sol => {
        const div = document.createElement("div");
        div.className = "solicitacao-card";
        div.innerHTML = `
          <p><strong>${sol.nome || "Sem nome"}</strong> — ${sol.email || "Sem e-mail"}</p>
          <p>Valor: ${sol.valor || "—"} | Parcelas: ${sol.parcelas || "—"}</p>
          <p>Tipo: ${sol.tipoParcelamento || "—"}</p>
          <p>Status: <strong>${sol.status}</strong></p>
          <button class="aprovar" data-id="${sol._id}">Aprovar</button>
          <button class="rejeitar" data-id="${sol._id}">Rejeitar</button>

        `;
        container.appendChild(div);
      });

      // ações dos botões
      container.querySelectorAll(".aprovar").forEach(btn => {
        btn.onclick = async () => {
          await fetch(`${URL_SERVICO}/solicitacoes/${btn.dataset.id}/acao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acao: "aprovar" })
          });
          mostrarAlerta("Solicitação aprovada!");
          carregarSolicitacoes();
        };
      });

      container.querySelectorAll(".rejeitar").forEach(btn => {
        btn.onclick = async () => {
          await fetch(`${URL_SERVICO}/solicitacoes/${btn.dataset.id}/acao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acao: "rejeitar" })
          });
          mostrarAlerta("Solicitação rejeitada com sucesso!");
          carregarSolicitacoes();
        };
      });
    } catch (err) {
      console.error("Erro ao carregar solicitações:", err);
    }
  }

  // --- Chama após DOM pronto ---
  window.addEventListener("load", carregarSolicitacoes);
}





    if (isAdminMensal3) {
      // Esconde tudo primeiro
      document.querySelectorAll(".separadorCadastro, .form-column, #dashboard, #filtroPagamentos, .card-cidade").forEach(el => {
        el.style.display = "none";
      });

      // Mostra apenas Mensal 3
      document.querySelectorAll('.card-cidade[data-grupo="Mensal 3"]').forEach(el => {
        el.style.display = "block";
      });

      // Se precisar: mostrar também a lista de empréstimos do Mensal 3
      document.querySelector("#listaEmprestimosCidade").style.display = "block";
    }

    if (isOperador) {
      // Operador → acesso reduzido
      document.querySelectorAll("#btnExcluirEmprestimo, #totaisResumo, .separadorCadastro,.separadorPesquisas, .separadorGraficos, .form-column, #dashboard, #filtroPagamentos").forEach(el => {
        el.style.display = "none";
      });

      // Mostra só o permitido
      document.querySelectorAll("#emprestimosPorDataDia, #emprestimosPorData, #painelUnificado").forEach(el => {
        el.style.display = "block";
      });
    }

  } else {
    // Usuário não logado
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Fazer login';
    loginBtn.onclick = () => { window.location.href = 'login.html'; };
    authButtonsContainer.appendChild(loginBtn);

    document.querySelectorAll("#listaSolicitacoes, .separadorSolicitacoes, #saudacaoOperador, .selecioneData, .btn-pdf, .legenda-status, #totaisResumo, .botoes-filtro-container, .cards-cidades-container, .separadorMensais, .separadorPesquisas, .separadorDataDeVencimento, .separadorGraficos, .form-column, #dashboard, #filtroPagamentos").forEach(el => {
      el.style.display = "none";
    });

    document.querySelectorAll(".sessaoCadastro").forEach(el => {
      el.style.display = "block";
    });
  }
});

