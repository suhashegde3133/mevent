// Storage utility - minimal database-only storage
// All data is fetched from and stored to the backend database only
// No local/temporary storage is used

import { API_BASE_URL } from "./constants";
import session from "./session";
import logger from "./logger";

// Minimal storage object - methods return no-ops or fetch from server
export const storage = {
  getRaw: (_key, fallback = null) => fallback,
  setRaw: (_key, _value) => false,
  remove: (_key) => false,

  getJSON: (_key, fallback = null) => fallback,
  setJSON: (_key, _value) => false,
  setJSONAndSync: (_key, _value) => false,

  async syncToServer(_key, _value) {
    // No-op: all data changes should go through Redux and API calls
  },

  async syncFromServer(key) {
    // Fetch data from server for supported keys
    const mapping = {
      photoflow_quotations_v1: "/quotations",
      photoflow_events: "/events",
      photoflow_invoices_v1: "/billing",
      photoflow_services: "/services",
      photoflow_team: "/team",
      photoflow_projects: "/projects",
      photoflow_policy_v1: "/policy",
    };
    const path = mapping[key];
    if (!path) return null;

    const token = session.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : null;
      }
      return null;
    } catch (e) {
      logger.error("syncFromServer failed", e, "Storage");
      return null;
    }
  },
};

// App-state specific helpers
export const appStateStorage = {
  load: () => undefined,
  save: (_state) => false,
  clear: () => false,
};

// Clear all app data (logout)
export const clearAllLocalAppData = async () => {
  try {
    // Clear caches (Service Worker cache) if available
    if (typeof window !== "undefined" && window.caches) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((n) => caches.delete(n)));
      } catch (e) {
        // ignore
      }
    }

    // Try to delete indexedDB databases
    if (typeof window !== "undefined" && window.indexedDB) {
      try {
        if (typeof window.indexedDB.databases === "function") {
          const dbs = await window.indexedDB.databases();
          await Promise.all(
            (dbs || []).map(
              (d) =>
                new Promise((res) => {
                  try {
                    const req = window.indexedDB.deleteDatabase(d.name);
                    req.onsuccess = () => res(true);
                    req.onerror = () => res(false);
                  } catch (e) {
                    res(false);
                  }
                }),
            ),
          );
        }
      } catch (e) {
        // ignore
      }
    }

    // Unregister service workers
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
      } catch (e) {
        // ignore
      }
    }

    return true;
  } catch (e) {
    return false;
  }
};

export default storage;
