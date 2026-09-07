// Wspólne funkcje aplikacji Le Magazynier.
// Ten plik nie wysyła danych i nie zmienia stanu magazynowego.

function cleanSN(value) {
  let val = String(value || "").toUpperCase().trim();

  // Kody QR mogą zawierać dodatkowe dane, np. "26/CQU123456789 MZ 234567".
  // Do aplikacji trafia tylko właściwy numer S/N.
  val = val.replace(/\s+MZ(?:\s+.*)?$/i, "");

  // Usuń spację przed dwuliterową końcówką kraju, np. "... PL" -> "...PL".
  val = val.replace(/\s+([A-Z]{2})$/i, "$1");

  return val.trim();
}

function detectModuleType(value) {
  const sn = cleanSN(value);
  const body = sn.includes("/") ? sn.split("/").pop() : sn;

  // Kolejność ma znaczenie: najpierw dłuższe prefiksy.
  // Prefiksy konfliktowe CDD, CDI, LD i RD nie są przypisywane automatycznie.
  const rules = [
    ["LQBN", "LQB"],
    ["RQBN", "RQB"],
    ["LSUX", "XS"],
    ["CDHI", "HICU"],
    ["CQBM", "FMB"],
    ["CQM", "FM"],
    ["CQU", "FM"],
    ["LQU", "LQ"],
    ["RQU", "RQ"],
    ["LSX", "XS"],
    ["CDH", "HICU"],
    ["LDI", "DUO"],
    ["RDI", "DUO"],
    ["RDH", "HIDUO"],
    ["RSH", "HIUNO"],
    ["LDU", "ODL"],
    ["RDU", "ODR"],
    ["CDJ", "CUIND"],
    ["DDJ", "EXTIND"],
    ["CDT", "CUOUT"],
    ["DDT", "EXTOUT"],
    ["LQ", "LQ"],
    ["RQ", "RQ"],
    ["LS", "XS"]
  ];

  for (const [prefix, type] of rules) {
    if (body.startsWith(prefix)) return type;
  }

  return "";
}

function hasDuplicateSN(items, value) {
  const wanted = cleanSN(value);
  if (!wanted) return false;

  return Array.isArray(items) && items.some(item => cleanSN(item && item.value) === wanted);
}
