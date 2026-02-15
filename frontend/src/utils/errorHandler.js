/**
 * Centralized Error Handler
 *
 * Provides a unified way to handle errors across the application:
 * - Maps error codes to user-friendly messages
 * - Handles API errors consistently
 * - Reports errors to monitoring (extensible)
 * - Shows appropriate user notifications
 */

import { showNotification } from "./notifications";
import logger from "./logger";

// User-friendly error messages mapped by error code
const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  TIMEOUT_ERROR: "Request timed out. Please try again.",
  SERVER_ERROR: "Something went wrong on our end. Please try again later.",

  // Authentication errors
  AUTH_INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
  AUTH_SESSION_EXPIRED: "Your session has expired. Please log in again.",
  AUTH_UNAUTHORIZED: "You don't have permission to perform this action.",
  AUTH_FORBIDDEN:
    "Access denied. Please contact support if you believe this is an error.",
  AUTH_ACCOUNT_LOCKED:
    "Your account has been temporarily locked. Please try again later.",

  // Validation errors
  VALIDATION_ERROR: "Please check your input and try again.",
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_PASSWORD: "Password must be at least 8 characters.",
  REQUIRED_FIELD: "Please fill in all required fields.",

  // Resource errors
  NOT_FOUND: "The requested resource was not found.",
  ALREADY_EXISTS: "This item already exists.",
  CONFLICT: "This action conflicts with existing data.",

  // Rate limiting
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",

  // Generic
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",

  // Plan/subscription errors
  PLAN_LIMIT_REACHED: "You've reached the limit for your current plan.",
  UPGRADE_REQUIRED: "Please upgrade your plan to access this feature.",
  TRIAL_EXPIRED: "Your trial period has ended. Please upgrade to continue.",
};

/**
 * Map HTTP status codes to error types
 */
const getErrorTypeFromStatus = (status) => {
  const statusMap = {
    400: "VALIDATION_ERROR",
    401: "AUTH_SESSION_EXPIRED",
    403: "AUTH_FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    429: "RATE_LIMITED",
    500: "SERVER_ERROR",
    502: "SERVER_ERROR",
    503: "SERVER_ERROR",
    504: "TIMEOUT_ERROR",
  };
  return statusMap[status] || "UNKNOWN_ERROR";
};

/**
 * Extract user-friendly message from error
 */
const getUserFriendlyMessage = (error, defaultMessage = null) => {
  // If the server provides a user-friendly message, use it
  if (error?.response?.data?.userMessage) {
    return error.response.data.userMessage;
  }

  // Check for specific error codes from the server
  if (error?.response?.data?.errorCode) {
    const code = error.response.data.errorCode;
    if (ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }
  }

  // Map HTTP status to error type
  if (error?.response?.status) {
    const errorType = getErrorTypeFromStatus(error.response.status);
    return ERROR_MESSAGES[errorType];
  }

  // Network error (no response)
  if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
    return ERROR_MESSAGES.TIMEOUT_ERROR;
  }

  if (error?.message === "Network Error" || !error?.response) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // Use provided default or generic message
  return defaultMessage || ERROR_MESSAGES.UNKNOWN_ERROR;
};

/**
 * Central error handler
 */
const errorHandler = {
  /**
   * Handle an error - logs it and optionally shows notification
   * @param {Error} error - The error object
   * @param {Object} options - Options for handling
   * @param {string} options.context - Context/source of the error
   * @param {boolean} options.showNotification - Whether to show user notification
   * @param {string} options.fallbackMessage - Fallback message if none can be determined
   * @param {string} options.notificationType - Type of notification (error, warning, info)
   */
  handle: (error, options = {}) => {
    const {
      context = "App",
      showNotification: shouldNotify = true,
      fallbackMessage = null,
      notificationType = "error",
    } = options;

    // Log the error
    logger.error(`Error in ${context}`, error, context);

    // Get user-friendly message
    const userMessage = getUserFriendlyMessage(error, fallbackMessage);

    // Show notification if requested
    if (shouldNotify) {
      showNotification(userMessage, { type: notificationType });
    }

    // Return the user message for custom handling
    return userMessage;
  },

  /**
   * Handle API errors specifically
   */
  handleApiError: (error, context = "API") => {
    return errorHandler.handle(error, { context, showNotification: true });
  },

  /**
   * Handle form validation errors
   */
  handleValidationError: (errors, context = "Form") => {
    const errorMessages = Object.values(errors).filter(Boolean);
    const message =
      errorMessages.length > 0
        ? errorMessages[0]
        : ERROR_MESSAGES.VALIDATION_ERROR;

    showNotification(message, { type: "warning" });
    logger.debug(`Validation error in ${context}`, errors, context);

    return message;
  },

  /**
   * Handle authentication errors
   */
  handleAuthError: (error, context = "Auth") => {
    const status = error?.response?.status;

    // Special handling for auth errors
    if (status === 401) {
      showNotification(ERROR_MESSAGES.AUTH_SESSION_EXPIRED, {
        type: "warning",
      });
      // The API interceptor will handle the redirect
    } else if (status === 403) {
      showNotification(ERROR_MESSAGES.AUTH_FORBIDDEN, { type: "error" });
    } else {
      return errorHandler.handle(error, { context, showNotification: true });
    }
  },

  /**
   * Get error message without showing notification
   */
  getMessage: (error, fallbackMessage = null) => {
    return getUserFriendlyMessage(error, fallbackMessage);
  },

  /**
   * Wrap an async function with error handling
   */
  wrapAsync: (fn, options = {}) => {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        errorHandler.handle(error, options);
        throw error;
      }
    };
  },
};

export default errorHandler;
export { ERROR_MESSAGES, getUserFriendlyMessage };
