// Automatyczne wylogowanie zostało celowo wyłączone.
// Plik pozostaje tymczasowo, ponieważ odwołują się do niego istniejące strony.
// Po uporządkowaniu wspólnych skryptów zostanie usunięty razem z odwołaniami.

// Tymczasowa korekta nagłówka na stronie Serwisy.
document.addEventListener("DOMContentLoaded", () => {
  const path = String(window.location.pathname || "").toLowerCase();
  if (path.endsWith("/czesci.html") || path.endsWith("czesci.html")) {
    const logo = document.querySelector(".logo");
    if (logo) logo.textContent = "SERWISY";
  }
});
