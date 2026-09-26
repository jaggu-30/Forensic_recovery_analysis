export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const SESSION_KEY = "recoverai:selected-evidence";

export function saveSelectedEvidence(evidence) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(evidence));
}

export function getSelectedEvidence() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSelectedEvidence() {
  localStorage.removeItem(SESSION_KEY);
}
