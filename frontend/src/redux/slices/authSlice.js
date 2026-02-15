import { createSlice } from "@reduxjs/toolkit";
import session from "../../utils/session";

// In-memory session is the single source of truth for token/user (no localStorage)
const initialState = {
  user: session.getUser() || null,
  token: session.getToken() || null,
  isAuthenticated: !!session.getToken(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;

      // Persist in-memory session only (no localStorage)
      try {
        session.setToken(action.payload.token);
        session.setUser(action.payload.user);
      } catch (e) {
        // ignore
      }
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;

      // Clear in-memory session
      try {
        session.clear();
        sessionStorage.removeItem("trial_modal_shown");
      } catch (e) {}
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      try {
        session.setUser(state.user);
      } catch (e) {}
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
