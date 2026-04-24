function wykonajWylogowanie() {
  localStorage.clear();

  if (!window.location.pathname.endsWith("index.html")) {
    window.location.href = "index.html";
  } else {
    location.reload();
  }
}

function ustawWylogowanieNa23() {
  const now = new Date();
  const hour = now.getHours();

  // Po 23:00 i przed 7:00 od razu wyloguj
  if (hour >= 23 || hour < 7) {
    wykonajWylogowanie();
    return;
  }

  // Ustaw wylogowanie dokładnie na 23:00
  const logoutTime = new Date();
  logoutTime.setHours(23, 0, 0, 0);

  const timeToLogout = logoutTime - now;

  setTimeout(() => {
    wykonajWylogowanie();
  }, timeToLogout);
}

document.addEventListener("DOMContentLoaded", () => {
  ustawWylogowanieNa23();
});
