document.addEventListener('DOMContentLoaded', () => {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isOperador = localStorage.getItem("isOperador") === "true";
  
  const authButtonsContainer = document.getElementById("authButtonsContainer");

  authButtonsContainer.innerHTML = '';
  
  if (isAdmin || isOperador) {
    // Botão de sair
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.textContent = 'Sair';
    authButtonsContainer.appendChild(logoutBtn);
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("isOperador");
      location.reload();
    });

    if (isAdmin) {
      // Mostra tudo
      document.querySelectorAll(".form-column, #dashboard, #filtroPagamentos").forEach(el => {
        el.style.display = "block";
      });
      //carregarEstatisticas();
    }

    if (isOperador) {
      // Esconde tudo
      document.querySelectorAll(".separadorCadastro,.separadorPesquisas, .separadorGraficos, .form-column, #dashboard, #filtroPagamentos").forEach(el => {
        el.style.display = "none";
      });

      // Mostra só o permitido
      document.querySelectorAll("#emprestimosPorDataDia, #emprestimosPorData, #painelUnificado").forEach(el => {
        el.style.display = "block";
      });

      // ATENÇÃO: se o "Vencimentos do dia" está dentro de #emprestimosPorData, ele já será exibido
    }

  } else {
    // Usuário não logado
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Fazer login';
    loginBtn.onclick = () => { window.location.href = 'login.html'; };
    authButtonsContainer.appendChild(loginBtn);

    document.querySelectorAll(".separadorPesquisas, .separadorDataDeVencimento, .separadorGraficos, .form-column, #dashboard, #filtroPagamentos").forEach(el => {
      el.style.display = "none";
    });

          document.querySelectorAll(".sessaoCadastro").forEach(el => {
        el.style.display = "block";
      });
  }
});


