/**
 * Centralized Logger Utility
 *
 * Provides environment-aware logging that:
 * - Shows detailed logs in development
 * - Suppresses sensitive information in production
 * - Provides consistent logging interface across the app
 */

const isDevelopment = process.env.NODE_ENV !== "production";

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Current log level based on environment
const currentLogLevel = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;

/**
 * Sanitize data to remove sensitive information before logging
 */
const sanitizeData = (data) => {
  if (!data) return data;

  const sensitiveKeys = [
    "password",
    "token",
    "authorization",
    "cookie",
    "secret",
    "apiKey",
    "api_key",
    "creditCard",
    "ssn",
    "socialSecurity",
  ];

  if (typeof data === "object") {
    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (
        sensitiveKeys.some((sensitive) =>
          lowerKey.includes(sensitive.toLowerCase()),
        )
      ) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof sanitized[key] === "object") {
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  return data;
};

/**
 * Format log message with timestamp and context
 */
const formatMessage = (level, message, context = "") => {
  const timestamp = new Date().toISOString();
  const prefix = context ? `[${context}]` : "";
  return `[${timestamp}] [${level}] ${prefix} ${message}`;
};

/**
 * Logger object with methods for different log levels
 */
const logger = {
  /**
   * Debug level logging - only in development
   */
  debug: (message, data = null, context = "") => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const formattedMessage = formatMessage("DEBUG", message, context);
      if (data) {
        console.log(formattedMessage, sanitizeData(data));
      } else {
        console.log(formattedMessage);
      }
    }
  },

  /**
   * Info level logging - only in development
   */
  info: (message, data = null, context = "") => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formattedMessage = formatMessage("INFO", message, context);
      if (data) {
        console.info(formattedMessage, sanitizeData(data));
      } else {
        console.info(formattedMessage);
      }
    }
  },

  /**
   * Warning level logging
   */
  warn: (message, data = null, context = "") => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const formattedMessage = formatMessage("WARN", message, context);
      if (data) {
        console.warn(formattedMessage, sanitizeData(data));
      } else {
        console.warn(formattedMessage);
      }
    }
  },

  /**
   * Error level logging - always logged but sanitized in production
   */
  error: (message, error = null, context = "") => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const formattedMessage = formatMessage("ERROR", message, context);

      if (isDevelopment) {
        // Full error details in development
        if (error) {
          console.error(formattedMessage, error);
        } else {
          console.error(formattedMessage);
        }
      } else {
        // Minimal, sanitized error info in production
        const safeError = error
          ? {
              message: error.message || "An error occurred",
              code: error.code,
              status: error.response?.status,
            }
          : null;

        if (safeError) {
          console.error(formattedMessage, safeError);
        } else {
          console.error(formattedMessage);
        }
      }
    }
  },

  /**
   * Group related logs together
   */
  group: (label, logFn) => {
    if (isDevelopment) {
      console.group(label);
      logFn();
      console.groupEnd();
    }
  },

  /**
   * Performance timing
   */
  time: (label) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
};

export default logger;
export { LOG_LEVELS, sanitizeData };
