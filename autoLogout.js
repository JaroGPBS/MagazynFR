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

  const logoutTime = new Date();
  logoutTime.setHours(23, 0, 0, 0);

  if (now >= logoutTime) {
    logoutTime.setDate(logoutTime.getDate() + 1);
  }

  const timeToLogout = logoutTime - now;

  setTimeout(() => {
    wykonajWylogowanie();
  }, timeToLogout);
}

document.addEventListener("DOMContentLoaded", () => {
  ustawWylogowanieNa23();
});
