const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, default: "New User" },
  password: { type: String, required: true }, // demo: plaintext (consider hashing)
  role: {
    type: String,
    enum: ["photographer", "admin", "superadmin"],
    default: "photographer",
  },
  photoURL: { type: String, default: null },
  isGoogleUser: { type: Boolean, default: false },
  plan: { type: String, default: "free" },
  planActivatedAt: { type: Date, default: null },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  passwordResetToken: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  loginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
