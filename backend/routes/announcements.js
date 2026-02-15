/**
 * Announcement Routes
 *
 * Handles all announcement-related API endpoints.
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/announcementController");
const { authenticateToken, isAdmin } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// ============ User Routes ============

// Get announcements for current user
router.get("/me", controller.getMyAnnouncements);

// Dismiss an announcement
router.post("/:id/dismiss", controller.dismissAnnouncement);

// Mark announcement as read
router.post("/:id/read", controller.markAnnouncementAsRead);

// ============ Admin Routes ============

// Get all announcements (admin only)
router.get("/", isAdmin, controller.getAllAnnouncements);

// Get announcement statistics (admin only)
router.get("/stats", isAdmin, controller.getAnnouncementStats);

// Get users by segment for preview (admin only)
router.get("/segment-preview", isAdmin, controller.getUsersBySegment);

// Get single announcement (admin only)
router.get("/:id", isAdmin, controller.getAnnouncementById);

// Create new announcement (admin only)
router.post("/", isAdmin, controller.createAnnouncement);

// Update announcement (admin only)
router.put("/:id", isAdmin, controller.updateAnnouncement);

// Publish announcement (admin only)
router.post("/:id/publish", isAdmin, controller.publishAnnouncement);

// Archive announcement (admin only)
router.post("/:id/archive", isAdmin, controller.archiveAnnouncement);

// Delete announcement (admin only)
router.delete("/:id", isAdmin, controller.deleteAnnouncement);

module.exports = router;
