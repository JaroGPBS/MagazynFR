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