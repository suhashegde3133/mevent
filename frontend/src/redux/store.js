import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import projectsReducer from "./slices/projectsSlice";
import uiReducer from "./slices/uiSlice";
import settingsReducer from "./slices/settingsSlice";
import { appStateStorage } from "../utils/storage";

// Load persisted state (if any) and merge with slice defaults safely
const persisted = appStateStorage.load();

// Build preloaded state by merging with slice defaults to avoid missing fields
const preloadedState = persisted
  ? {
      // Let authSlice initialize itself from its own localStorage handling
      // auth: undefined,
      projects: {
        projects: [],
        currentProject: null,
        loading: false,
        error: null,
        filters: { status: "all", search: "" },
        ...(persisted.projects || {}),
      },
      ui: {
        sidebarOpen: true,
        theme: "light",
        notifications: [],
        modal: { isOpen: false, type: null, data: null },
        ...(persisted.ui || {}),
      },
    }
  : undefined;

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    ui: uiReducer,
    settings: settingsReducer,
  },
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Throttle function to limit persistence frequency
let lastSave = 0;
const THROTTLE_MS = 500;

store.subscribe(() => {
  const now = Date.now();
  if (now - lastSave < THROTTLE_MS) return;
  lastSave = now;

  const state = store.getState();
  // Choose what to persist (avoid large/volatile data)
  const toPersist = {
    auth: {
      isAuthenticated: state.auth.isAuthenticated,
      // don't store token here (authSlice already stores it); don't store errors/loading
      user: state.auth.user,
    },
    projects: {
      // keep lightweight parts only; if projects is large, consider trimming
      projects: state.projects.projects,
      currentProject: state.projects.currentProject,
      filters: state.projects.filters,
    },
    ui: {
      sidebarOpen: state.ui.sidebarOpen,
      theme: state.ui.theme,
      // do not persist ephemeral notifications/modals
    },
  };

  appStateStorage.save(toPersist);
});

export default store;
