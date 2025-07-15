import { carregarEstatisticas } from './dashboard.js';


document.addEventListener('DOMContentLoaded', () => {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const authButtonsContainer = document.getElementById("authButtonsContainer");
  const adminPanel = document.querySelector(".admin-panel");

  authButtonsContainer.innerHTML = '';

  if (isAdmin) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.textContent = 'Sair';
    authButtonsContainer.appendChild(logoutBtn);

    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isAdmin");
      location.reload();
    });

    adminPanel && (adminPanel.style.display = "flex");
    document.getElementById("buscarEmprestimos").style.display = "block";
    document.getElementById("buscarQuitados").style.display = "block";
    document.getElementById("emprestimosPorData").style.display = "block";
    document.getElementById("dashboard").style.display = "flex";

    carregarEstatisticas(); // se for admin
  } else {
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Fazer login como administrador';
    loginBtn.onclick = () => { window.location.href = 'login.html'; };
    authButtonsContainer.appendChild(loginBtn);

    adminPanel && (adminPanel.style.display = "none");
    document.getElementById("buscarEmprestimos").style.display = "none";
    document.getElementById("buscarQuitados").style.display = "none";
    document.getElementById("emprestimosPorData").style.display = "none";
    document.getElementById("dashboard").style.display = "none";
  }
});
