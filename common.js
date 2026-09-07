// Wspólne funkcje aplikacji Le Magazynier.
// Obsługa numerów S/N, wspólnej sesji auta i bezpiecznych identyfikatorów wysyłek.

const TRANSPORT_SESSION_ID_KEY = "transportSessionId";
const TRANSPORT_SESSION_DATA_KEY = "transportSessionData_v1";
const SUBMISSION_ID_PREFIX = "pendingSubmissionId_";

function cleanSN(value) {
  let val = String(value || "").toUpperCase().trim();

  // Kody QR mogą zawierać dodatkowe dane, np. "26/CQU123456789 MZ 234567".
  val = val.replace(/\s+MZ(?:\s+.*)?$/i, "");

  // Usuń spację przed dwuliterową końcówką kraju, np. "... PL" -> "...PL".
  val = val.replace(/\s+([A-Z]{2})$/i, "$1");

  return val.trim();
}

function detectModuleType(value) {
  const sn = cleanSN(value);
  const body = sn.includes("/") ? sn.split("/").pop() : sn;

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

  saveTransportSessionData();
  return id;
}

function clearTransportSessionId() {
  localStorage.removeItem(TRANSPORT_SESSION_ID_KEY);
  localStorage.removeItem(TRANSPORT_SESSION_DATA_KEY);
  localStorage.removeItem(SUBMISSION_ID_PREFIX + "pz");
  localStorage.removeItem(SUBMISSION_ID_PREFIX + "wz");
}

function getTransportOperation() {
  const path = String(window.location.pathname || "").toLowerCase();
  if (path.endsWith("/pz.html") || path.endsWith("pz.html")) return "pz";
  if (path.endsWith("/wz.html") || path.endsWith("wz.html")) return "wz";
  return "";
}

function createSubmissionId(operation) {
  const sessionId = ensureTransportSessionId();
  const now = Date.now();

  let randomPart = "000000";
  try {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    randomPart = String(bytes[0] % 1000000).padStart(6, "0");
  } catch (_) {
    randomPart = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  }

  return `TX-${operation.toUpperCase()}-${sessionId}-${now}-${randomPart}`;
}

function getOrCreateSubmissionId(operation) {
  if (!operation) return "";

  const key = SUBMISSION_ID_PREFIX + operation;
  let id = String(localStorage.getItem(key) || "").trim();

  if (!id) {
    id = createSubmissionId(operation);
    localStorage.setItem(key, id);
  }

  return id;
}

function hasSavedArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) && parsed.length > 0;
  } catch (_) {
    return false;
  }
}

function resetSubmissionIdIfNoDraft(operation) {
  if (operation === "pz") {
    if (!hasSavedArray("codesPZ") && !hasSavedArray("partsPZTest")) {
      localStorage.removeItem(SUBMISSION_ID_PREFIX + "pz");
    }
  }

  if (operation === "wz") {
    if (!hasSavedArray("codesWZ") && !hasSavedArray("partsWZ")) {
      localStorage.removeItem(SUBMISSION_ID_PREFIX + "wz");
    }
  }
}

// PZ/WZ korzystają jeszcze ze zwykłego fetch(). Ten wspólny adapter dodaje metadane
// tylko do ich wysyłek i nie pozwala wyczyścić danych, jeśli serwer nie potwierdzi zapisu.
function installTransportApiGuard() {
  if (window.__transportApiGuardInstalled) return;
  window.__transportApiGuardInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function(input, init) {
    const options = init || {};
    const method = String(options.method || "GET").toUpperCase();
    const body = options.body;

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const operation = isFormData ? String(body.get("strona") || "").toLowerCase() : "";
    const isTransportPost = method === "POST" && (operation === "pz" || operation === "wz");

    if (isTransportPost) {
      const sessionId = ensureTransportSessionId();
      const submissionId = getOrCreateSubmissionId(operation);

      if (sessionId && !body.has("sessionId")) body.append("sessionId", sessionId);
      if (submissionId && !body.has("submissionId")) body.append("submissionId", submissionId);
    }

    const response = await nativeFetch(input, init);

    if (isTransportPost) {
      let result;

      try {
        result = JSON.parse(await response.clone().text());
      } catch (_) {
        throw new Error("Serwer nie potwierdził poprawnego zapisu. Dane pozostają w aplikacji.");
      }

      if (!response.ok || !result || result.ok !== true) {
        const message = result && result.error
          ? result.error
          : "Nie udało się potwierdzić zapisu. Dane pozostają w aplikacji.";
        throw new Error(message);
      }
    }

    return response;
  };
}

restoreTransportSessionData();
installTransportApiGuard();

document.addEventListener("DOMContentLoaded", () => {
  restoreTransportSessionData();
  resetSubmissionIdIfNoDraft(getTransportOperation());
});
