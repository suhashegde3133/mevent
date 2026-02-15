const mongoose = require("mongoose");

/**
 * Announcement Schema
 *
 * Stores announcements with targeting, scheduling, and theming support.
 */
const AnnouncementSchema = new mongoose.Schema(
  {
    // Basic content
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    // Targeting - which users should see this announcement
    targetPlans: {
      type: [String],
      enum: ["all", "free", "silver", "gold"],
      default: ["all"],
    },
    targetRoles: {
      type: [String],
      enum: ["all", "photographer", "admin", "superadmin"],
      default: ["all"],
    },

    // Scheduling
    publishAt: {
      type: Date,
      default: null, // null means publish immediately
    },
    expiresAt: {
      type: Date,
      default: null, // null means never expires
    },

    // Status
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "expired", "archived"],
      default: "draft",
    },

    // Theming
    theme: {
      type: String,
      enum: ["default", "info", "success", "warning", "urgent"],
      default: "default",
    },

    // Custom styling (optional)
    customStyle: {
      backgroundColor: { type: String, default: null },
      textColor: { type: String, default: null },
      borderColor: { type: String, default: null },
      iconType: {
        type: String,
        enum: [
          "none",
          "info",
          "announcement",
          "warning",
          "celebration",
          "update",
          "maintenance",
        ],
        default: "announcement",
      },
    },

    // Display options
    displayOptions: {
      dismissible: { type: Boolean, default: true },
      showAsModal: { type: Boolean, default: false },
      showAsBanner: { type: Boolean, default: true },
      priority: { type: Number, default: 0, min: 0, max: 10 }, // Higher = more important
    },

    // Notification preferences
    sendNotification: {
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
    },

    // Tracking
    viewCount: { type: Number, default: 0 },
    dismissedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
AnnouncementSchema.index({ status: 1, publishAt: 1 });
AnnouncementSchema.index({ targetPlans: 1 });
AnnouncementSchema.index({ createdAt: -1 });

// Virtual for checking if announcement is active
AnnouncementSchema.virtual("isActive").get(function () {
  const now = new Date();

  if (this.status !== "published") return false;
  if (this.publishAt && this.publishAt > now) return false;
  if (this.expiresAt && this.expiresAt < now) return false;

  return true;
});

// Method to check if user should see this announcement
AnnouncementSchema.methods.isVisibleToUser = function (user) {
  // Check plan targeting
  if (!this.targetPlans.includes("all")) {
    if (!this.targetPlans.includes(user.plan)) {
      return false;
    }
  }

  // Check role targeting
  if (!this.targetRoles.includes("all")) {
    if (!this.targetRoles.includes(user.role)) {
      return false;
    }
  }

  // Check if user has dismissed this announcement
  if (this.dismissedBy.some((id) => id.toString() === user._id.toString())) {
    return false;
  }

  return this.isActive;
};

// Static method to get active announcements for a user
AnnouncementSchema.statics.getForUser = async function (user) {
  const now = new Date();

  const announcements = await this.find({
    status: "published",
    $or: [{ publishAt: null }, { publishAt: { $lte: now } }],
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).sort({ "displayOptions.priority": -1, createdAt: -1 });

  // Filter for user visibility
  return announcements.filter((ann) => ann.isVisibleToUser(user));
};

// Pre-save hook to update status based on scheduling
AnnouncementSchema.pre("save", function (next) {
  const now = new Date();

  if (this.publishAt && this.publishAt > now && this.status === "published") {
    this.status = "scheduled";
  }

  if (this.expiresAt && this.expiresAt < now && this.status === "published") {
    this.status = "expired";
  }

  next();
});

module.exports = mongoose.model("Announcement", AnnouncementSchema);
