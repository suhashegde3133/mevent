const mongoose = require("mongoose");

const MaintenanceSettingsSchema = new mongoose.Schema({
  // Maintenance mode status
  isEnabled: { type: Boolean, default: false },

  // Who is affected: 'all', 'free', 'silver', 'gold', or array combination
  affectedTiers: [
    {
      type: String,
      enum: ["all", "free", "silver", "gold"],
      default: "all",
    },
  ],

  // Custom maintenance message to display
  message: {
    type: String,
    default: "We're currently performing maintenance. Please check back soon.",
  },

  // Optional title for the maintenance page
  title: {
    type: String,
    default: "System Maintenance",
  },

  // Expected end time (optional)
  estimatedEndTime: { type: Date, default: null },

  // Allow admins to bypass maintenance mode
  allowAdminAccess: { type: Boolean, default: true },

  // Track who enabled/modified maintenance mode
  enabledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  enabledAt: { type: Date },

  // Single document pattern - only one maintenance settings document
  singleton: { type: Boolean, default: true, unique: true },

  updatedAt: { type: Date, default: Date.now },
});

// Ensure only one settings document exists
MaintenanceSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ singleton: true });
  if (!settings) {
    settings = await this.create({ singleton: true });
  }
  return settings;
};

// Update the updatedAt timestamp before saving
MaintenanceSettingsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model(
  "MaintenanceSettings",
  MaintenanceSettingsSchema,
);
