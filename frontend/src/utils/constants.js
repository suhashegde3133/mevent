// API Base URL (normalized, removes trailing slash if present)
export const API_BASE_URL = (process.env.REACT_APP_API_URL || "").replace(
  /\/$/,
  "",
);

// App Constants
export const APP_NAME = "PhotoFlow";
export const APP_VERSION = "1.0.0";

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "photoflow_auth_token",
  USER_DATA: "photoflow_user_data",
  THEME: "photoflow_theme",
  APP_STATE: "photoflow_app_state_v1",
  SERVICES: "photoflow_services",
  QUOTATIONS: "photoflow_quotations_v1",
  PROJECTS: "photoflow_projects",
  TEAM: "photoflow_team",
  EVENTS: "photoflow_events",
  INVOICES: "photoflow_invoices_v1",
  POLICY: "photoflow_policy_v1",
  CONVERSATIONS: "photoflow_conversations",
  CHAT_MESSAGES: "photoflow_chat_messages",
  SETTINGS: "photoflow_settings",
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  LOGOUT: "/auth/logout",
  GOOGLE_AUTH: "/auth/google",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  VERIFY_RESET_TOKEN: (token) => `/auth/verify-reset-token/${token}`,
  CHANGE_PASSWORD: "/auth/change-password",

  // Projects
  PROJECTS: "/projects",
  PROJECT_DETAIL: (id) => `/projects/${id}`,

  // Clients
  CLIENTS: "/clients",
  CLIENT_DETAIL: (id) => `/clients/${id}`,

  // Team
  TEAM: "/team",
  TEAM_MEMBER: (id) => `/team/${id}`,

  // Gallery
  GALLERY: "/gallery",
  UPLOAD_PHOTOS: "/gallery/upload",

  // Calendar
  EVENTS: "/calendar/events",
  EVENT_DETAIL: (id) => `/calendar/events/${id}`,

  // Chat
  MESSAGES: "/chat/messages",
  CONVERSATIONS: "/chat/conversations",
};

// User Roles
export const USER_ROLES = {
  ADMIN: "admin",
  PHOTOGRAPHER: "photographer",
  EDITOR: "editor",
  CLIENT: "client",
};

// Project Status
export const PROJECT_STATUS = {
  PLANNING: "planning",
  IN_PROGRESS: "in_progress",
  EDITING: "editing",
  REVIEW: "review",
  COMPLETED: "completed",
  DELIVERED: "delivered",
};

// Event Types
export const EVENT_TYPES = {
  SHOOT: "shoot",
  MEETING: "meeting",
  DELIVERY: "delivery",
  EDITING: "editing",
  OTHER: "other",
};

// Date Formats
export const DATE_FORMATS = {
  FULL: "MMMM dd, yyyy",
  SHORT: "MM/dd/yyyy",
  TIME: "hh:mm a",
  DATETIME: "MM/dd/yyyy hh:mm a",
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  PAGE_SIZE_OPTIONS: [12, 24, 48, 96],
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"],
};

// Toast Messages
export const TOAST_MESSAGES = {
  SUCCESS: {
    LOGIN: "Successfully logged in!",
    LOGOUT: "Successfully logged out!",
    REGISTER: "Account created successfully!",
    PROJECT_CREATED: "Project created successfully!",
    PROJECT_UPDATED: "Project updated successfully!",
    PROJECT_DELETED: "Project deleted successfully!",
    PHOTO_UPLOADED: "Photo(s) uploaded successfully!",
  },
  ERROR: {
    LOGIN_FAILED: "Login failed. Please check your credentials.",
    REGISTER_FAILED: "Registration failed. Please try again.",
    NETWORK_ERROR: "Network error. Please check your connection.",
    UPLOAD_FAILED: "Upload failed. Please try again.",
    GENERIC: "Something went wrong. Please try again.",
  },
};
