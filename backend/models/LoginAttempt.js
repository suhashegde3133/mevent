const mongoose = require("mongoose");

const loginAttemptSchema = new mongoose.Schema({
  email: { type: String, required: true },
  ipAddress: { type: String, required: true },
  status: { type: String, enum: ["success", "failed"], required: true },
  reason: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Auto-expire after 30 days
loginAttemptSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });
loginAttemptSchema.index({ email: 1, timestamp: -1 });

module.exports = mongoose.model("LoginAttempt", loginAttemptSchema);
