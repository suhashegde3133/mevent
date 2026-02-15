/**
 * Backend Error Handler Middleware
 *
 * Provides centralized error handling for the Express API:
 * - Consistent error response format
 * - User-friendly error messages
 * - Proper HTTP status codes
 * - Error logging
 */

const logger = require("./logger");

// User-friendly error messages
const ERROR_MESSAGES = {
  // Authentication
  UNAUTHORIZED: "Please log in to continue.",
  FORBIDDEN: "You don't have permission to access this resource.",
  INVALID_TOKEN: "Your session has expired. Please log in again.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  ACCOUNT_LOCKED:
    "Your account has been temporarily locked. Please try again later.",

  // Validation
  VALIDATION_ERROR: "Please check your input and try again.",
  MISSING_FIELDS: "Please fill in all required fields.",
  INVALID_EMAIL: "Please enter a valid email address.",

  // Resources
  NOT_FOUND: "The requested resource was not found.",
  ALREADY_EXISTS: "This item already exists.",
  CONFLICT: "This action conflicts with existing data.",

  // Rate limiting
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",

  // Server
  INTERNAL_ERROR: "Something went wrong. Please try again later.",
  DATABASE_ERROR: "Unable to process your request. Please try again.",

  // Plan/Subscription
  PLAN_LIMIT: "You've reached the limit for your current plan.",
  UPGRADE_REQUIRED: "Please upgrade your plan to access this feature.",
};

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(
    message,
    statusCode = 500,
    errorCode = "INTERNAL_ERROR",
    userMessage = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.userMessage =
      userMessage || ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.INTERNAL_ERROR;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create common error instances
 */
const createError = {
  badRequest: (message, errorCode = "VALIDATION_ERROR") =>
    new ApiError(message, 400, errorCode),

  unauthorized: (message = "Unauthorized", errorCode = "UNAUTHORIZED") =>
    new ApiError(message, 401, errorCode),

  forbidden: (message = "Forbidden", errorCode = "FORBIDDEN") =>
    new ApiError(message, 403, errorCode),

  notFound: (message = "Not found", errorCode = "NOT_FOUND") =>
    new ApiError(message, 404, errorCode),

  conflict: (message = "Conflict", errorCode = "CONFLICT") =>
    new ApiError(message, 409, errorCode),

  tooMany: (message = "Too many requests", errorCode = "RATE_LIMITED") =>
    new ApiError(message, 429, errorCode),

  internal: (message = "Internal server error", errorCode = "INTERNAL_ERROR") =>
    new ApiError(message, 500, errorCode),
};

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
  // Log the error
  logger.error(
    `${req.method} ${req.path} - ${err.message}`,
    err,
    "ErrorHandler",
  );

  // Determine if this is an operational error
  const isOperational = err.isOperational || false;

  // Get status code
  let statusCode = err.statusCode || 500;

  // Handle specific error types
  if (err.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
      userMessage: ERROR_MESSAGES.VALIDATION_ERROR,
      errorCode: "VALIDATION_ERROR",
    });
  }

  if (err.name === "CastError") {
    // Invalid MongoDB ObjectId
    statusCode = 400;
    return res.status(statusCode).json({
      success: false,
      error: "Invalid ID format",
      userMessage: ERROR_MESSAGES.VALIDATION_ERROR,
      errorCode: "VALIDATION_ERROR",
    });
  }

  if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    return res.status(statusCode).json({
      success: false,
      error: "Duplicate entry",
      userMessage: ERROR_MESSAGES.ALREADY_EXISTS,
      errorCode: "ALREADY_EXISTS",
    });
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    return res.status(statusCode).json({
      success: false,
      error: "Invalid token",
      userMessage: ERROR_MESSAGES.INVALID_TOKEN,
      errorCode: "INVALID_TOKEN",
    });
  }

  // For operational errors, send the user message
  if (isOperational) {
    return res.status(statusCode).json({
      success: false,
      error:
        process.env.NODE_ENV === "production" ? err.userMessage : err.message,
      userMessage: err.userMessage,
      errorCode: err.errorCode,
    });
  }

  // For programming/unknown errors, send a generic message in production
  const isDevelopment = process.env.NODE_ENV !== "production";

  return res.status(statusCode).json({
    success: false,
    error: isDevelopment ? err.message : ERROR_MESSAGES.INTERNAL_ERROR,
    userMessage: ERROR_MESSAGES.INTERNAL_ERROR,
    errorCode: "INTERNAL_ERROR",
    ...(isDevelopment && { stack: err.stack }),
  });
};

/**
 * Async handler wrapper to catch async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    userMessage: ERROR_MESSAGES.NOT_FOUND,
    errorCode: "NOT_FOUND",
  });
};

module.exports = {
  ApiError,
  createError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  ERROR_MESSAGES,
};
