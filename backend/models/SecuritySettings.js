const mongoose = require("mongoose");

const securitySettingsSchema = new mongoose.Schema({
  maxLoginAttempts: { type: Number, default: 5 },
  lockoutDuration: { type: Number, default: 15 }, // minutes
  passwordMinLength: { type: Number, default: 8 },
  requireSpecialChar: { type: Boolean, default: true },
  requireNumber: { type: Boolean, default: true },
  requireUppercase: { type: Boolean, default: true },
  sessionTimeout: { type: Number, default: 24 }, // hours
  twoFactorEnabled: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SecuritySettings", securitySettingsSchema);
