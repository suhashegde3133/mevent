/**
 * Announcement Controller
 *
 * Handles all announcement CRUD operations and user targeting.
 */

const Announcement = require("../models/Announcement");
const UserNotification = require("../models/UserNotification");
const User = require("../models/User");
const logger = require("../utils/logger");
const { createError, asyncHandler } = require("../utils/errorHandler");

// Helper to get user ID from request
const getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

/**
 * Get all announcements (admin only)
 */
exports.getAllAnnouncements = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status && status !== "all") {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [announcements, total] = await Promise.all([
    Announcement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("createdBy", "name email"),
    Announcement.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: announcements,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * Get single announcement by ID (admin only)
 */
exports.getAnnouncementById = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!announcement) {
    throw createError.notFound("Announcement not found");
  }

  res.json({
    success: true,
    data: announcement,
  });
});

/**
 * Create new announcement (admin only)
 */
exports.createAnnouncement = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    targetPlans,
    targetRoles,
    publishAt,
    expiresAt,
    status,
    theme,
    customStyle,
    displayOptions,
    sendNotification,
  } = req.body;

  // Validate required fields
  if (!title || !content) {
    throw createError.badRequest("Title and content are required");
  }

  try {
    // Determine initial status
    let initialStatus = status || "draft";
    const now = new Date();

    if (publishAt && new Date(publishAt) > now) {
      initialStatus = "scheduled";
    } else if (initialStatus === "published" || !publishAt) {
      initialStatus = status === "published" ? "published" : "draft";
    }

    // Sanitize and validate arrays
    const plans = Array.isArray(targetPlans)
      ? targetPlans.filter((p) => ["all", "free", "silver", "gold"].includes(p))
      : ["all"];

    const roles = Array.isArray(targetRoles)
      ? targetRoles.filter((r) =>
          ["all", "photographer", "admin", "superadmin"].includes(r),
        )
      : ["all"];

    // Sanitize nested objects
    const sanitizedCustomStyle = {
      backgroundColor: customStyle?.backgroundColor || null,
      textColor: customStyle?.textColor || null,
      borderColor: customStyle?.borderColor || null,
      iconType: customStyle?.iconType || "announcement",
    };

    const sanitizedDisplayOptions = {
      dismissible: displayOptions?.dismissible !== false,
      showAsModal: displayOptions?.showAsModal === true,
      showAsBanner: displayOptions?.showAsBanner !== false,
      priority: Math.min(
        10,
        Math.max(0, parseInt(displayOptions?.priority) || 0),
      ),
    };

    const sanitizedNotification = {
      email: sendNotification?.email === true,
      push: sendNotification?.push === true,
      inApp: sendNotification?.inApp !== false,
    };

    const announcement = await Announcement.create({
      title,
      content,
      targetPlans: plans.length === 0 ? ["all"] : plans,
      targetRoles: roles.length === 0 ? ["all"] : roles,
      publishAt: publishAt ? new Date(publishAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: initialStatus,
      theme: theme || "default",
      customStyle: sanitizedCustomStyle,
      displayOptions: sanitizedDisplayOptions,
      sendNotification: sanitizedNotification,
      createdBy: getUserId(req),
    });

    logger.info(
      "Announcement created",
      { id: announcement._id, title },
      "Announcements",
    );

    // If published immediately, create notifications for targeted users
    if (initialStatus === "published") {
      await createNotificationsForAnnouncement(announcement);
    }

    res.status(201).json({
      success: true,
      data: announcement,
      userMessage: "Announcement created successfully",
    });
  } catch (error) {
    logger.error("Error creating announcement", error, "Announcements");
    throw createError.badRequest(
      error.message || "Failed to create announcement",
    );
  }
});

/**
 * Update announcement (admin only)
 */
exports.updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw createError.notFound("Announcement not found");
  }

  try {
    // Track if we're publishing for the first time
    const wasNotPublished = announcement.status !== "published";
    const isNowPublished = updates.status === "published";

    // Sanitize and validate specific fields
    if (updates.targetPlans) {
      announcement.targetPlans = Array.isArray(updates.targetPlans)
        ? updates.targetPlans.filter((p) =>
            ["all", "free", "silver", "gold"].includes(p),
          )
        : ["all"];
    }

    if (updates.targetRoles) {
      announcement.targetRoles = Array.isArray(updates.targetRoles)
        ? updates.targetRoles.filter((r) =>
            ["all", "photographer", "admin", "superadmin"].includes(r),
          )
        : ["all"];
    }

    if (updates.customStyle) {
      announcement.customStyle = {
        backgroundColor: updates.customStyle?.backgroundColor || null,
        textColor: updates.customStyle?.textColor || null,
        borderColor: updates.customStyle?.borderColor || null,
        iconType: updates.customStyle?.iconType || "announcement",
      };
    }

    if (updates.displayOptions) {
      announcement.displayOptions = {
        dismissible: updates.displayOptions?.dismissible !== false,
        showAsModal: updates.displayOptions?.showAsModal === true,
        showAsBanner: updates.displayOptions?.showAsBanner !== false,
        priority: Math.min(
          10,
          Math.max(0, parseInt(updates.displayOptions?.priority) || 0),
        ),
      };
    }

    if (updates.sendNotification) {
      announcement.sendNotification = {
        email: updates.sendNotification?.email === true,
        push: updates.sendNotification?.push === true,
        inApp: updates.sendNotification?.inApp !== false,
      };
    }

    // Update simple fields
    if (updates.title) announcement.title = updates.title;
    if (updates.content) announcement.content = updates.content;
    if (updates.status) announcement.status = updates.status;
    if (updates.theme) announcement.theme = updates.theme;
    if (updates.publishAt !== undefined) {
      announcement.publishAt = updates.publishAt
        ? new Date(updates.publishAt)
        : null;
    }
    if (updates.expiresAt !== undefined) {
      announcement.expiresAt = updates.expiresAt
        ? new Date(updates.expiresAt)
        : null;
    }

    announcement.updatedBy = getUserId(req);

    await announcement.save();

    logger.info(
      "Announcement updated",
      { id: announcement._id },
      "Announcements",
    );

    // If just published, create notifications
    if (wasNotPublished && isNowPublished) {
      await createNotificationsForAnnouncement(announcement);
    }

    res.json({
      success: true,
      data: announcement,
      userMessage: "Announcement updated successfully",
    });
  } catch (error) {
    logger.error("Error updating announcement", error, "Announcements");
    throw createError.badRequest(
      error.message || "Failed to update announcement",
    );
  }
});

/**
 * Delete announcement (admin only)
 */
exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await Announcement.findByIdAndDelete(id);

  if (!announcement) {
    throw createError.notFound("Announcement not found");
  }

  // Also delete related notifications
  await UserNotification.deleteMany({
    referenceId: id,
    referenceModel: "Announcement",
  });

  logger.info("Announcement deleted", { id }, "Announcements");

  res.json({
    success: true,
    message: "Announcement deleted successfully",
    userMessage: "Announcement deleted successfully",
  });
});

/**
 * Publish announcement (admin only)
 */
exports.publishAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw createError.notFound("Announcement not found");
  }

  if (announcement.status === "published") {
    throw createError.badRequest("Announcement is already published");
  }

  announcement.status = "published";
  announcement.publishAt = new Date();
  announcement.updatedBy = getUserId(req);

  await announcement.save();

  // Create notifications for targeted users
  await createNotificationsForAnnouncement(announcement);

  logger.info("Announcement published", { id }, "Announcements");

  res.json({
    success: true,
    data: announcement,
    userMessage: "Announcement published successfully",
  });
});

/**
 * Archive announcement (admin only)
 */
exports.archiveAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await Announcement.findByIdAndUpdate(
    id,
    { status: "archived", updatedBy: getUserId(req) },
    { new: true },
  );

  if (!announcement) {
    throw createError.notFound("Announcement not found");
  }

  logger.info("Announcement archived", { id }, "Announcements");

  res.json({
    success: true,
    data: announcement,
    userMessage: "Announcement archived successfully",
  });
});

/**
 * Get announcements for current user (any authenticated user)
 */
exports.getMyAnnouncements = asyncHandler(async (req, res) => {
  const user = await User.findById(getUserId(req));

  if (!user) {
    throw createError.notFound("User not found");
  }

  const now = new Date();

  // Get published, non-expired announcements targeted at this user
  const announcements = await Announcement.find({
    status: "published",
    $or: [{ publishAt: null }, { publishAt: { $lte: now } }],
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    dismissedBy: { $ne: user._id },
  }).sort({ "displayOptions.priority": -1, createdAt: -1 });

  // Filter by user's plan and role
  const filteredAnnouncements = announcements.filter((ann) => {
    // Check plan targeting
    if (
      !ann.targetPlans.includes("all") &&
      !ann.targetPlans.includes(user.plan)
    ) {
      return false;
    }
    // Check role targeting
    if (
      !ann.targetRoles.includes("all") &&
      !ann.targetRoles.includes(user.role)
    ) {
      return false;
    }
    return true;
  });

  // Increment view count for each announcement
  const ids = filteredAnnouncements.map((a) => a._id);
  if (ids.length > 0) {
    await Announcement.updateMany(
      { _id: { $in: ids } },
      { $inc: { viewCount: 1 } },
    );
  }

  res.json({
    success: true,
    data: filteredAnnouncements,
  });
});

/**
 * Dismiss an announcement for current user
 */
exports.dismissAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw createError.notFound("Announcement not found");
  }

  // Add user to dismissedBy array if not already there
  if (!announcement.dismissedBy.includes(getUserId(req))) {
    announcement.dismissedBy.push(getUserId(req));
    await announcement.save();
  }

  res.json({
    success: true,
    message: "Announcement dismissed",
    userMessage: "Announcement dismissed",
  });
});

/**
 * Mark announcement as read for current user
 */
exports.markAnnouncementAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw createError.notFound("Announcement not found");
  }

  // Add user to readBy array if not already there
  if (!announcement.readBy.includes(getUserId(req))) {
    announcement.readBy.push(getUserId(req));
    await announcement.save();
  }

  res.json({
    success: true,
    message: "Announcement marked as read",
  });
});

/**
 * Get announcement statistics (admin only)
 */
exports.getAnnouncementStats = asyncHandler(async (req, res) => {
  const stats = await Announcement.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalViews = await Announcement.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$viewCount" },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      byStatus: stats,
      totalViews: totalViews[0]?.total || 0,
    },
  });
});

/**
 * Get users by segment for targeting preview (admin only)
 */
exports.getUsersBySegment = asyncHandler(async (req, res) => {
  const { plans, roles } = req.query;

  const query = { status: "active" };

  if (plans && !plans.includes("all")) {
    query.plan = { $in: plans.split(",") };
  }

  if (roles && !roles.includes("all")) {
    query.role = { $in: roles.split(",") };
  }

  const count = await User.countDocuments(query);

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * Helper function to create notifications for targeted users
 */
async function createNotificationsForAnnouncement(announcement) {
  try {
    // Build user query based on targeting
    const userQuery = { status: "active" };

    if (!announcement.targetPlans.includes("all")) {
      userQuery.plan = { $in: announcement.targetPlans };
    }

    if (!announcement.targetRoles.includes("all")) {
      userQuery.role = { $in: announcement.targetRoles };
    }

    // Get targeted users
    const users = await User.find(userQuery).select("_id");

    // Create notifications in batches
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const notifications = batch.map((user) => ({
        user: user._id,
        type: "announcement",
        referenceId: announcement._id,
        referenceModel: "Announcement",
        title: announcement.title,
        message:
          announcement.content.substring(0, 200) +
          (announcement.content.length > 200 ? "..." : ""),
        icon: "announcement",
        deliveredVia: {
          inApp: announcement.sendNotification?.inApp ?? true,
          email: announcement.sendNotification?.email ?? false,
          push: announcement.sendNotification?.push ?? false,
        },
        expiresAt: announcement.expiresAt,
      }));

      await UserNotification.insertMany(notifications, { ordered: false });
    }

    logger.info(
      "Notifications created for announcement",
      {
        announcementId: announcement._id,
        userCount: users.length,
      },
      "Announcements",
    );
  } catch (error) {
    logger.error(
      "Error creating notifications for announcement",
      error,
      "Announcements",
    );
  }
}
