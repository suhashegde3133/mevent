/**
 * Notification Routes
 *
 * Handles all user notification API endpoints.
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/notificationController");
const { authenticateToken } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// Get notifications for current user
router.get("/", controller.getNotifications);

// Get unread count
router.get("/unread-count", controller.getUnreadCount);

// Mark all as read
router.post("/mark-all-read", controller.markAllAsRead);

// Clear dismissed notifications
router.delete("/clear-dismissed", controller.clearDismissed);

// Mark single notification as read
router.post("/:id/read", controller.markAsRead);

// Dismiss notification
router.post("/:id/dismiss", controller.dismissNotification);

// Delete notification
router.delete("/:id", controller.deleteNotification);

module.exports = router;
