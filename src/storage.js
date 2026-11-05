export function readSaved(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? [...new Set(data.filter(Number.isInteger))] : [];
  } catch { return []; }
}
export function readObject(key) {
  try { const data = JSON.parse(localStorage.getItem(key)); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; }
  catch { return {}; }
}
export function writeSaved(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
