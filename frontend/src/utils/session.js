// Session helper that persists auth to localStorage so page refreshes keep the user logged in.
import { STORAGE_KEYS } from "./constants";

const readJSON = (k) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
};

const writeJSON = (k, v) => {
  try {
    if (v === null || v === undefined) {
      localStorage.removeItem(k);
    } else {
      localStorage.setItem(k, JSON.stringify(v));
    }
    return true;
  } catch (e) {
    return false;
  }
};

const session = {
  token: readJSON(STORAGE_KEYS.AUTH_TOKEN) || null,
  user: readJSON(STORAGE_KEYS.USER_DATA) || null,

  setToken(t) {
    this.token = t || null;
    writeJSON(STORAGE_KEYS.AUTH_TOKEN, this.token);
  },

  getToken() {
    return this.token;
  },

  setUser(u) {
    this.user = u || null;
    writeJSON(STORAGE_KEYS.USER_DATA, this.user);
  },

  getUser() {
    return this.user;
  },

  clear() {
    this.token = null;
    this.user = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    } catch (e) {
      // ignore
    }
  },
};

export default session;
