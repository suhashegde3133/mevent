import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import storage, { clearAllLocalAppData } from "./utils/storage";

// export const url = "http://localhost:3000";

// CLEAR ALL LOCAL/TEMPORARY DATA ON APP LOAD
// This ensures only database data is used (no stale localStorage cache)
try {
  // clearAllLocalAppData is async (clears caches, service workers, indexedDB)
  clearAllLocalAppData()
    .then((ok) => {
      if (ok) console.log("✓ Cleared all local app data");
      else console.warn("clearAllLocalAppData returned false");
    })
    .catch((err) => console.warn("Failed to clear local data:", err));
} catch (e) {
  console.warn("Failed to clear local data:", e);
}

// NOTE: Pages will fetch data from server via their own useEffect hooks
// We do NOT pre-populate localStorage here to avoid temporary/cached data

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

reportWebVitals();
