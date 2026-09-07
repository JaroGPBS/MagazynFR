// Automatyczne wylogowanie zostało celowo wyłączone.
// Plik pozostaje tymczasowo, ponieważ odwołują się do niego istniejące strony.
// Dodatkowo zabezpiecza wysyłkę z ekranu Serwisy: aplikacja uznaje zapis za udany
// dopiero po otrzymaniu poprawnej odpowiedzi JSON { ok: true } z Apps Script.

(function installServicePartsApiGuard() {
  if (window.__servicePartsApiGuardInstalled) return;
  window.__servicePartsApiGuardInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function guardedFetch(input, init) {
    const response = await nativeFetch(input, init);

    try {
      const body = init && init.body;

      if (!(body instanceof FormData)) {
        return response;
      }

      const page = String(body.get("strona") || "").trim().toLowerCase();

      if (page !== "czesci") {
        return response;
      }

      let data;

      try {
        data = await response.clone().json();
      } catch (_) {
        throw new Error("Serwer nie potwierdził poprawnego zapisu części.");
      }

      if (!data || data.ok !== true) {
        throw new Error(data && data.error ? data.error : "Nie udało się zapisać części.");
      }

      return response;

    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error(String(err));
    }
  };
})();
