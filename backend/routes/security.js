const express = require("express");
const router = express.Router();
const { authenticateToken, isAdmin } = require("../middleware/auth");
const SecuritySettings = require("../models/SecuritySettings");
const LoginAttempt = require("../models/LoginAttempt");
const Session = require("../models/Session");
const User = require("../models/User");

// GET /api/security/stats - Real security statistics
router.get("/stats", authenticateToken, isAdmin, async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [failedLogins, activeSessions, lockedAccounts] = await Promise.all([
      LoginAttempt.countDocuments({
        status: "failed",
        timestamp: { $gte: twentyFourHoursAgo },
      }),
      Session.countDocuments({ expiresAt: { $gt: new Date() } }),
      User.countDocuments({ lockoutUntil: { $gt: new Date() } }),
    ]);

    res.json({
      failedLogins24h: failedLogins,
      activeSessions,
      lockedAccounts,
      systemHealth: lockedAccounts > 5 ? "Warning" : "Secure",
    });
  } catch (err) {
    console.error("Security stats error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET /api/security/settings
router.get("/settings", authenticateToken, isAdmin, async (req, res) => {
  try {
    let settings = await SecuritySettings.findOne();
    if (!settings) {
      settings = new SecuritySettings();
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// POST /api/security/settings
router.post("/settings", authenticateToken, isAdmin, async (req, res) => {
  try {
    let settings = await SecuritySettings.findOne();
    if (!settings) {
      settings = new SecuritySettings(req.body);
    } else {
      Object.assign(settings, req.body);
      settings.updatedAt = Date.now();
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// GET /api/security/sessions
router.get("/sessions", authenticateToken, isAdmin, async (req, res) => {
  try {
    const sessions = await Session.find({ expiresAt: { $gt: new Date() } })
      .populate("userId", "name email")
      .sort({ lastActive: -1 })
      .limit(100);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE /api/security/sessions/:id
router.delete("/sessions/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: "Session revoked" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE /api/security/sessions - Revoke all
router.delete("/sessions", authenticateToken, isAdmin, async (req, res) => {
  try {
    await Session.deleteMany({});
    res.json({ message: "All sessions revoked" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// GET /api/security/attempts
router.get("/attempts", authenticateToken, isAdmin, async (req, res) => {
  try {
    const attempts = await LoginAttempt.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// POST /api/security/unlock-user
router.post("/unlock-user", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { lockoutUntil: null, loginAttempts: 0 },
      { new: true },
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User account unlocked" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
