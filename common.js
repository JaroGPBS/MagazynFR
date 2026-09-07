// Wspólne funkcje aplikacji Le Magazynier.
// Obsługa numerów S/N, wspólnej sesji auta i bezpiecznych identyfikatorów wysyłek.

const TRANSPORT_SESSION_ID_KEY = "transportSessionId";
const TRANSPORT_SESSION_DATA_KEY = "transportSessionData_v1";
const SUBMISSION_ID_PREFIX = "pendingSubmissionId_";
const PZ_INFO_KEY = "dodatkoweInfoPZ";
const WZ_INFO_KEY = "dodatkoweInfoWZ";
const TRANSPORT_API_URL = "https://script.google.com/macros/s/AKfycby5xJAHto5XHSwXGWDoaUyjvZHB_rEBd6pqhUkk5JrvPw807HazHGvMKr00ZrG5rLGwIg/exec";
const TRANSPORT_ALLOWED_TYPES = [
  "FM", "LQ", "RQ", "XS", "ODL", "ODR", "CU", "DUO", "HICU",
  "HIDUO", "HIUNO", "FMB", "LQB", "RQB", "CUIND", "EXTIND",
  "CUOUT", "EXTOUT"
];

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

function readSavedArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function hasSavedArray(key) {
  return readSavedArray(key).length > 0;
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

function setupTransportDraftScreen() {
  const operation = getTransportOperation();
  if (operation !== "pz" && operation !== "wz") return;

  // PZ/WZ tylko zbierają dane. Wysyłka następuje dopiero przy zakończeniu sesji auta.
  document.querySelectorAll("button").forEach(button => {
    const onclick = String(button.getAttribute("onclick") || "").replace(/\s+/g, "");
    if (onclick === "sendData()") button.remove();
  });

  const infoInput = document.getElementById("dodatkoweInfo");
  if (infoInput) {
    const infoKey = operation === "pz" ? PZ_INFO_KEY : WZ_INFO_KEY;
    infoInput.value = localStorage.getItem(infoKey) || "";
    infoInput.addEventListener("input", () => {
      localStorage.setItem(infoKey, infoInput.value);
    });
  }
}

function hasTransportDraft(operation) {
  if (operation === "pz") {
    return hasSavedArray("codesPZ") || hasSavedArray("partsPZTest");
  }

  if (operation === "wz") {
    return hasSavedArray("codesWZ") || hasSavedArray("partsWZ");
  }

  return false;
}

function validateDraftCodes_(codes, operation) {
  for (const item of codes) {
    const type = String(item && (item.note ?? item.typ) || "").trim().toUpperCase();
    const sn = cleanSN(item && (item.value ?? item.kod) || "");

    if (!sn) {
      throw new Error(`W ${operation.toUpperCase()} jest pusty numer S/N.`);
    }

    if (!TRANSPORT_ALLOWED_TYPES.includes(type)) {
      throw new Error(`W ${operation.toUpperCase()} moduł ${sn} ma nieprawidłowy TYP: ${type || "BRAK"}.`);
    }
  }
}

function buildTransportFormData_(operation) {
  const login = String(localStorage.getItem("login") || "").trim();
  const trasa = String(localStorage.getItem("trasa") || "").trim();
  const przewoznik = String(localStorage.getItem("przewoznik") || "").trim();
  const tablica = String(localStorage.getItem("tablica") || "").trim();

  if (!login || !trasa || !przewoznik || !tablica) {
    throw new Error("Brakuje danych użytkownika lub auta.");
  }

  const isPz = operation === "pz";
  const codes = readSavedArray(isPz ? "codesPZ" : "codesWZ");
  const parts = readSavedArray(isPz ? "partsPZTest" : "partsWZ");

  if (codes.length === 0 && parts.length === 0) return null;

  validateDraftCodes_(codes, operation);

  const finalCodes = codes.map(item => {
    const sn = cleanSN(item && (item.value ?? item.kod) || "");
    const type = String(item && (item.note ?? item.typ) || "").trim().toUpperCase();

    if (isPz) {
      return `${type} - ${sn}${item && item.nok ? " - NOK" : ""}`;
    }

    return `${sn} | ${type}`;
  });

  const formData = new FormData();
  formData.append("login", login.toUpperCase());
  formData.append("trasa", trasa.toUpperCase());
  formData.append("przewoznik", przewoznik.toUpperCase());
  formData.append("tablica", tablica.toUpperCase());
  formData.append("dodatkowe", String(localStorage.getItem(isPz ? PZ_INFO_KEY : WZ_INFO_KEY) || "").trim() || "-");
  formData.append("kody", JSON.stringify(finalCodes));
  formData.append("czesci", JSON.stringify(parts));
  formData.append("strona", operation);

  return formData;
}

function clearTransportDraft_(operation) {
  if (operation === "pz") {
    localStorage.removeItem("codesPZ");
    localStorage.removeItem("partsPZTest");
    localStorage.removeItem(PZ_INFO_KEY);
  } else if (operation === "wz") {
    localStorage.removeItem("codesWZ");
    localStorage.removeItem("partsWZ");
    localStorage.removeItem(WZ_INFO_KEY);
  }

  localStorage.removeItem(SUBMISSION_ID_PREFIX + operation);
}

async function sendTransportDraft_(operation) {
  const formData = buildTransportFormData_(operation);
  if (!formData) return null;

  const response = await fetch(TRANSPORT_API_URL, {
    method: "POST",
    body: formData
  });

  const result = await response.json();
  if (!result || result.ok !== true) {
    throw new Error(result && result.error ? result.error : `Nie udało się zapisać ${operation.toUpperCase()}.`);
  }

  clearTransportDraft_(operation);
  return result;
}

function clearFinishedTransportSession_() {
  localStorage.removeItem("trasa");
  localStorage.removeItem("przewoznik");
  localStorage.removeItem("tablica");
  localStorage.removeItem("tablicaSam");
  localStorage.removeItem("tablicaNacz");
  localStorage.removeItem(PZ_INFO_KEY);
  localStorage.removeItem(WZ_INFO_KEY);
  clearTransportSessionId();
}

async function finishTransportSession() {
  if (!getTransportSessionId()) return;

  const hasPz = hasTransportDraft("pz");
  const hasWz = hasTransportDraft("wz");

  let message = "Czy zakończyć sesję auta?";
  if (hasPz && hasWz) message = "Zakończyć sesję i wysłać zapisane dane PZ oraz WZ?";
  else if (hasPz) message = "Zakończyć sesję i wysłać zapisane dane PZ?";
  else if (hasWz) message = "Zakończyć sesję i wysłać zapisane dane WZ?";
  else message = "Brak zapisanych danych PZ/WZ. Zakończyć sesję bez wysyłania?";

  if (!window.confirm(message)) return;

  const button = document.querySelector(".session-end-btn");
  const oldText = button ? button.textContent : "";

  if (button) {
    button.disabled = true;
    button.textContent = "Wysyłam...";
  }

  try {
    const results = [];

    if (hasPz) {
      const pzResult = await sendTransportDraft_("pz");
      if (pzResult) results.push(pzResult.documentNumber || "PZ");
    }

    if (hasWz) {
      const wzResult = await sendTransportDraft_("wz");
      if (wzResult) results.push(wzResult.documentNumber || "WZ");
    }

    clearFinishedTransportSession_();

    const info = results.length
      ? `Sesja zakończona. Zapisano: ${results.join(" i ")}.`
      : "Sesja zakończona.";

    window.alert(info);

    const routeFields = ["trasa", "przewoznik", "tablicaSam", "tablicaNacz"];
    routeFields.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.value = "";
    });

    if (typeof window.showMenu === "function") window.showMenu();
  } catch (err) {
    const messageText = err && err.message ? err.message : String(err);
    window.alert("Nie udało się zakończyć sesji.\n\n" + messageText + "\n\nNiewysłane dane pozostały zapisane.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText || "Zakończ sesję";
    }
  }
}

function installMainSessionFinishHandler() {
  const button = document.querySelector(".session-end-btn");
  if (!button) return;

  button.textContent = "Zakończ sesję";
  window.endTransportSession = finishTransportSession;
}

function setupServiceLabels() {
  document.querySelectorAll("button").forEach(button => {
    if (button.textContent.trim() === "Serwisy części") {
      button.textContent = "Serwisy";
    }
  });

  const modalTitle = document.querySelector(".team-modal-title");
  if (modalTitle && modalTitle.textContent.trim() === "Serwisy części") {
    modalTitle.textContent = "Serwisy";
  }
}

restoreTransportSessionData();
installTransportApiGuard();

document.addEventListener("DOMContentLoaded", () => {
  restoreTransportSessionData();
  resetSubmissionIdIfNoDraft(getTransportOperation());
  setupTransportDraftScreen();
  installMainSessionFinishHandler();
  setupServiceLabels();
});