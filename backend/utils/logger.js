/**
 * Backend Logger Utility
 *
 * Provides environment-aware logging for the backend:
 * - Development: Full detailed logging
 * - Production: Minimal, sanitized logging
 *
 * Automatically redacts sensitive information
 */

const isDevelopment = process.env.NODE_ENV !== "production";

// Sensitive fields to redact in logs
const SENSITIVE_FIELDS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "api_key",
  "creditcard",
  "ssn",
  "idtoken",
  "refreshtoken",
  "accesstoken",
];

/**
 * Sanitize object by redacting sensitive fields
 */
const sanitize = (data) => {
  if (!data) return data;

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object") {
    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
        sanitized[key] = "[REDACTED]";
      } else if (
        typeof sanitized[key] === "object" &&
        sanitized[key] !== null
      ) {
        sanitized[key] = sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }

  return data;
};

/**
 * Format log entry with timestamp and context
 */
const formatLog = (level, message, context = "") => {
  const timestamp = new Date().toISOString();
  const prefix = context ? `[${context}]` : "";
  return `[${timestamp}] [${level}] ${prefix} ${message}`;
};

/**
 * Logger object
 */
const logger = {
  /**
   * Debug level - development only
   */
  debug: (message, data = null, context = "") => {
    if (isDevelopment) {
      const formatted = formatLog("DEBUG", message, context);
      if (data) {
        // eslint-disable-next-line no-console
        console.log(formatted, sanitize(data));
      } else {
        // eslint-disable-next-line no-console
        console.log(formatted);
      }
    }
  },

  /**
   * Info level - development only
   */
  info: (message, data = null, context = "") => {
    if (isDevelopment) {
      const formatted = formatLog("INFO", message, context);
      if (data) {
        // eslint-disable-next-line no-console
        console.info(formatted, sanitize(data));
      } else {
        // eslint-disable-next-line no-console
        console.info(formatted);
      }
    }
  },

  /**
   * Warning level
   */
  warn: (message, data = null, context = "") => {
    const formatted = formatLog("WARN", message, context);
    if (data) {
      // eslint-disable-next-line no-console
      console.warn(formatted, sanitize(data));
    } else {
      // eslint-disable-next-line no-console
      console.warn(formatted);
    }
  },

  /**
   * Error level - always logged but sanitized
   */
  error: (message, error = null, context = "") => {
    const formatted = formatLog("ERROR", message, context);

    if (isDevelopment) {
      // Full error in development
      if (error) {
        // eslint-disable-next-line no-console
        console.error(formatted, error);
      } else {
        // eslint-disable-next-line no-console
        console.error(formatted);
      }
    } else {
      // Sanitized error in production
      const safeError = error
        ? {
            message: error.message || "Unknown error",
            code: error.code,
            name: error.name,
          }
        : null;

      if (safeError) {
        // eslint-disable-next-line no-console
        console.error(formatted, safeError);
      } else {
        // eslint-disable-next-line no-console
        console.error(formatted);
      }
    }
  },

  /**
   * Request logging helper
   */
  request: (req, context = "HTTP") => {
    if (isDevelopment) {
      logger.debug(
        `${req.method} ${req.originalUrl}`,
        {
          query: req.query,
          params: req.params,
          userId: req.user?.id,
        },
        context,
      );
    }
  },

  /**
   * Response logging helper
   */
  response: (statusCode, message, context = "HTTP") => {
    if (isDevelopment) {
      logger.debug(`Response: ${statusCode} - ${message}`, null, context);
    }
  },
};

module.exports = logger;
module.exports.sanitize = sanitize;
