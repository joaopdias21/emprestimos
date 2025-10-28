document.addEventListener('DOMContentLoaded', () => {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isAdminMensal3 = localStorage.getItem("isAdminMensal3") === "true";
  const isOperador = localStorage.getItem("isOperador") === "true";
  
  const authButtonsContainer = document.getElementById("authButtonsContainer");
  authButtonsContainer.innerHTML = '';
  
  if (isAdmin || isAdminMensal3 || isOperador) {
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
    .separadorDataDeVencimento
  `).forEach(el => {
    el.style.display = el.classList.contains("separador") ? "flex" : "block";
  });

  console.log("✅ Admin logado - elementos exibidos");
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

    document.querySelectorAll("#saudacaoOperador, .selecioneData, .btn-pdf, .legenda-status, #totaisResumo, .botoes-filtro-container, .cards-cidades-container, .separadorMensais, .separadorPesquisas, .separadorDataDeVencimento, .separadorGraficos, .form-column, #dashboard, #filtroPagamentos").forEach(el => {
      el.style.display = "none";
    });

    document.querySelectorAll(".sessaoCadastro").forEach(el => {
      el.style.display = "block";
    });
  }
});
