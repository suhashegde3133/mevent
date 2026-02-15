import axios from "axios";
import { API_BASE_URL } from "./constants";
import session from "./session";
import logger from "./logger";
import errorHandler from "./errorHandler";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = session.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.debug(
      `API Request: ${config.method?.toUpperCase()} ${config.url}`,
      null,
      "API",
    );
    return config;
  },
  (error) => {
    logger.error("API Request Error", error, "API");
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    logger.debug(
      `API Response: ${response.status} ${response.config.url}`,
      null,
      "API",
    );
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized — clear in-memory session and redirect to login
    if (error.response?.status === 401) {
      session.clear();
      logger.info("Session expired, redirecting to login", null, "API");
      window.location.href = "/login";
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      logger.warn("Access forbidden", { url: error.config?.url }, "API");
    }

    // Handle 404 Not Found (skip logging for optional chat routes)
    if (error.response?.status === 404) {
      const isChatRoute = error.config?.url?.includes("/chat/");
      if (!isChatRoute) {
        logger.debug("Resource not found", { url: error.config?.url }, "API");
      }
    }

    // Handle 500 Server Error
    if (error.response?.status >= 500) {
      logger.error(
        "Server error occurred",
        {
          status: error.response?.status,
          url: error.config?.url,
        },
        "API",
      );
    }

    return Promise.reject(error);
  },
);

// API helper functions
export const apiHelper = {
  // GET request
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // POST request
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PUT request
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PATCH request
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // DELETE request
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload file
  upload: async (url, formData, onUploadProgress) => {
    try {
      const response = await api.post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api;
