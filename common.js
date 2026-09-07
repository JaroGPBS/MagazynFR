// Wspólne funkcje aplikacji Le Magazynier.
// Ten plik nie wysyła danych i nie zmienia stanu magazynowego.

const TRANSPORT_SESSION_ID_KEY = "transportSessionId";
const TRANSPORT_SESSION_DATA_KEY = "transportSessionData_v1";

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

function createTransportSessionId() {
  const now = new Date();
  const pad = value => String(value).padStart(2, "0");
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  let randomPart = "0000";
  try {
    const bytes = new Uint16Array(1);
    crypto.getRandomValues(bytes);
    randomPart = String(bytes[0] % 10000).padStart(4, "0");
  } catch (_) {
    randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  }

  return `SES-${datePart}-${timePart}-${randomPart}`;
}

function getTransportSessionId() {
  return String(localStorage.getItem(TRANSPORT_SESSION_ID_KEY) || "").trim();
}

function getTransportSessionData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRANSPORT_SESSION_DATA_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

function saveTransportSessionData() {
  const id = getTransportSessionId();
  const trasa = String(localStorage.getItem("trasa") || "").trim();
  const przewoznik = String(localStorage.getItem("przewoznik") || "").trim();
  const tablica = String(localStorage.getItem("tablica") || "").trim();
  const tablicaSam = String(localStorage.getItem("tablicaSam") || "").trim();
  const tablicaNacz = String(localStorage.getItem("tablicaNacz") || "").trim();

  if (!id || !trasa || !przewoznik || !tablica) return false;

  localStorage.setItem(TRANSPORT_SESSION_DATA_KEY, JSON.stringify({
    id,
    trasa,
    przewoznik,
    tablica,
    tablicaSam,
    tablicaNacz
  }));

  return true;
}

function restoreTransportSessionData() {
  const data = getTransportSessionData();
  if (!data || !data.id) return false;

  // Nie nadpisuj świadomie rozpoczętej nowej sesji innym ID.
  const currentId = getTransportSessionId();
  if (currentId && currentId !== data.id) return false;

  localStorage.setItem(TRANSPORT_SESSION_ID_KEY, data.id);

  if (data.trasa) localStorage.setItem("trasa", data.trasa);
  if (data.przewoznik) localStorage.setItem("przewoznik", data.przewoznik);
  if (data.tablica) localStorage.setItem("tablica", data.tablica);
  if (data.tablicaSam) localStorage.setItem("tablicaSam", data.tablicaSam);
  if (data.tablicaNacz) localStorage.setItem("tablicaNacz", data.tablicaNacz);

  return true;
}

function ensureTransportSessionId() {
  let id = getTransportSessionId();
  if (!id) {
    id = createTransportSessionId();
    localStorage.setItem(TRANSPORT_SESSION_ID_KEY, id);
  }

  // Gdy dane auta są już wpisane, od razu zachowaj ich kopię dla całej sesji.
  saveTransportSessionData();
  return id;
}

function clearTransportSessionId() {
  localStorage.removeItem(TRANSPORT_SESSION_ID_KEY);
  localStorage.removeItem(TRANSPORT_SESSION_DATA_KEY);
}

// Stare ekrany PZ/WZ po udanej wysyłce czyszczą pola trasy.
// Przy aktywnej sesji odtwarzamy je automatycznie przed uruchomieniem strony.
document.addEventListener("DOMContentLoaded", () => {
  restoreTransportSessionData();
});
