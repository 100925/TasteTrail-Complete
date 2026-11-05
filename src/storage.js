export function readSaved(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? [...new Set(data.filter(Number.isInteger))] : [];
  } catch { return []; }
}

export function readObject(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch { return {}; }
}

export function writeSaved(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

export function readAuth() {
  try {
    const token = localStorage.getItem('tt-auth-token') || null;
    const userStr = localStorage.getItem('tt-user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function writeAuth(token, user) {
  try {
    if (token && user) {
      localStorage.setItem('tt-auth-token', token);
      localStorage.setItem('tt-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('tt-auth-token');
      localStorage.removeItem('tt-user');
    }
    return true;
  } catch {
    return false;
  }
}
