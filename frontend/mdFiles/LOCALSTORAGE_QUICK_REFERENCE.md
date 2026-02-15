# Local Storage Quick Reference

This app persists a subset of Redux state to localStorage so it survives page refreshes and tab closes.

- Keys

  - `photoflow_auth_token` — JWT/Token (managed by auth slice and axios interceptor)
  - `photoflow_user_data` — Authenticated user object (auth slice)
  - `photoflow_theme` — UI theme preference
  - `photoflow_app_state_v1` — Serialized subset of Redux state (ui, projects)

- What we persist in `photoflow_app_state_v1`

  - `ui`: `sidebarOpen`, `theme`
  - `projects`: `projects`, `currentProject`, `filters`
  - We intentionally do not persist transient fields like `notifications`, `modal`, or loading/error flags.

- Resetting state
  - Clear the above keys in Application > Local Storage or run `localStorage.clear()` in DevTools.
