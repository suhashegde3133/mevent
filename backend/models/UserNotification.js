const mongoose = require("mongoose");

/**
 * UserNotification Schema
 *
 * Tracks notifications for individual users, including read status and preferences.
 */
const UserNotificationSchema = new mongoose.Schema(
  {
    // User reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Notification type
    type: {
      type: String,
      enum: [
        "announcement",
        "system",
        "payment",
        "team",
        "event",
        "plan",
        "security",
        "quotation",
      ],
      required: true,
      index: true,
    },

    // Reference to source (e.g., announcement ID)
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "referenceModel",
    },
    referenceModel: {
      type: String,
      enum: ["Announcement", "Payment", "Event", "TeamMember", "Quotation"],
    },

    // Notification content
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // Display options
    icon: {
      type: String,
      enum: [
        "info",
        "success",
        "warning",
        "error",
        "announcement",
        "payment",
        "team",
        "event",
        "update",
        "quotation",
      ],
      default: "info",
    },

    // Action link (optional)
    actionUrl: {
      type: String,
      default: null,
    },
    actionLabel: {
      type: String,
      default: null,
    },

    // Status tracking
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },

    // Delivery tracking
    deliveredVia: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },

    // Expiration
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for common queries
UserNotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
UserNotificationSchema.index({ user: 1, type: 1, createdAt: -1 });
UserNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to get unread count for a user
UserNotificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    user: userId,
    read: false,
    dismissed: false,
  });
};

// Static method to get notifications for a user
UserNotificationSchema.statics.getForUser = async function (
  userId,
  options = {},
) {
  const { limit = 20, offset = 0, type = null, unreadOnly = false } = options;

  const query = {
    user: userId,
    dismissed: false,
  };

  if (type) query.type = type;
  if (unreadOnly) query.read = false;

  return this.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit);
};

// Static method to mark as read
UserNotificationSchema.statics.markAsRead = async function (
  notificationId,
  userId,
) {
  return this.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true, readAt: new Date() },
    { new: true },
  );
};

// Static method to mark all as read
UserNotificationSchema.statics.markAllAsRead = async function (
  userId,
  type = null,
) {
  const query = { user: userId, read: false };
  if (type) query.type = type;

  return this.updateMany(query, {
    read: true,
    readAt: new Date(),
  });
};

// Static method to dismiss notification
UserNotificationSchema.statics.dismiss = async function (
  notificationId,
  userId,
) {
  return this.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { dismissed: true, dismissedAt: new Date() },
    { new: true },
  );
};

// Static method to create notification for announcement
UserNotificationSchema.statics.createFromAnnouncement = async function (
  announcement,
  userId,
) {
  return this.create({
    user: userId,
    type: "announcement",
    referenceId: announcement._id,
    referenceModel: "Announcement",
    title: announcement.title,
    message:
      announcement.content.substring(0, 200) +
      (announcement.content.length > 200 ? "..." : ""),
    icon: "announcement",
    deliveredVia: {
      inApp: announcement.sendNotification?.inApp || true,
      email: announcement.sendNotification?.email || false,
      push: announcement.sendNotification?.push || false,
    },
    expiresAt: announcement.expiresAt,
  });
};

module.exports = mongoose.model("UserNotification", UserNotificationSchema);
