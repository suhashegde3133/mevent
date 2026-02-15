/**
 * Notification Controller
 *
 * Handles user notification operations.
 */

const UserNotification = require("../models/UserNotification");
const logger = require("../utils/logger");
const { createError, asyncHandler } = require("../utils/errorHandler");

// Helper to get user ID from request
const getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

/**
 * Get notifications for current user
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const { type, unreadOnly, page = 1, limit = 20 } = req.query;

  const options = {
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    type: type || null,
    unreadOnly: unreadOnly === "true",
  };

  const [notifications, total, unreadCount] = await Promise.all([
    UserNotification.getForUser(getUserId(req), options),
    UserNotification.countDocuments({
      user: getUserId(req),
      dismissed: false,
      ...(options.type && { type: options.type }),
      ...(options.unreadOnly && { read: false }),
    }),
    UserNotification.getUnreadCount(getUserId(req)),
  ]);

  res.json({
    success: true,
    data: notifications,
    unreadCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * Get unread notification count
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await UserNotification.getUnreadCount(getUserId(req));

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * Mark notification as read
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await UserNotification.markAsRead(id, getUserId(req));

  if (!notification) {
    throw createError.notFound("Notification not found");
  }

  res.json({
    success: true,
    data: notification,
  });
});

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const { type } = req.query;

  await UserNotification.markAllAsRead(getUserId(req), type || null);

  res.json({
    success: true,
    message: "All notifications marked as read",
    userMessage: "All notifications marked as read",
  });
});

/**
 * Dismiss notification
 */
exports.dismissNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await UserNotification.dismiss(id, getUserId(req));

  if (!notification) {
    throw createError.notFound("Notification not found");
  }

  res.json({
    success: true,
    data: notification,
  });
});

/**
 * Delete notification (permanently)
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await UserNotification.findOneAndDelete({
    _id: id,
    user: getUserId(req),
  });

  if (!notification) {
    throw createError.notFound("Notification not found");
  }

  res.json({
    success: true,
    message: "Notification deleted",
  });
});

/**
 * Clear all dismissed notifications (cleanup)
 */
exports.clearDismissed = asyncHandler(async (req, res) => {
  const result = await UserNotification.deleteMany({
    user: getUserId(req),
    dismissed: true,
  });

  res.json({
    success: true,
    message: `Cleared ${result.deletedCount} notifications`,
  });
});
