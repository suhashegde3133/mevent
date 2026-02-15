const express = require("express");
const router = express.Router();
const MaintenanceSettings = require("../models/MaintenanceSettings");
const User = require("../models/User");
const { authenticateToken, isAdmin } = require("../middleware/auth");

// Public route - Check maintenance status (for non-authenticated users too)
router.get("/status", async (req, res) => {
  try {
    const settings = await MaintenanceSettings.getSettings();

    // Only return public-safe information
    res.json({
      isEnabled: settings.isEnabled,
      affectedTiers: settings.affectedTiers,
      title: settings.title,
      message: settings.message,
      estimatedEndTime: settings.estimatedEndTime,
      allowAdminAccess: settings.allowAdminAccess,
    });
  } catch (error) {
    console.error("Error fetching maintenance status:", error);
    res.status(500).json({ message: "Error fetching maintenance status" });
  }
});

// Check if specific user is affected by maintenance
router.get("/check", authenticateToken, async (req, res) => {
  try {
    const settings = await MaintenanceSettings.getSettings();
    const user = await User.findById(req.user.sub).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Admins bypass maintenance if allowAdminAccess is true
    if (
      settings.allowAdminAccess &&
      (user.role === "admin" || user.role === "superadmin")
    ) {
      return res.json({
        isAffected: false,
        isEnabled: settings.isEnabled,
        reason: "Admin bypass",
      });
    }

    // Check if user's plan/tier is affected
    const userPlan = (user.plan || "free").toLowerCase();
    const isAffected =
      settings.isEnabled &&
      (settings.affectedTiers.includes("all") ||
        settings.affectedTiers.includes(userPlan));

    res.json({
      isAffected,
      isEnabled: settings.isEnabled,
      title: settings.title,
      message: settings.message,
      estimatedEndTime: settings.estimatedEndTime,
      affectedTiers: settings.affectedTiers,
    });
  } catch (error) {
    console.error("Error checking maintenance status:", error);
    res.status(500).json({ message: "Error checking maintenance status" });
  }
});

// Admin routes - Get full maintenance settings
router.get("/settings", authenticateToken, isAdmin, async (req, res) => {
  try {
    const settings = await MaintenanceSettings.getSettings();
    const populatedSettings = await MaintenanceSettings.findById(
      settings._id,
    ).populate("enabledBy", "name email");

    res.json(populatedSettings);
  } catch (error) {
    console.error("Error fetching maintenance settings:", error);
    res.status(500).json({ message: "Error fetching maintenance settings" });
  }
});

// Admin routes - Update maintenance settings
router.put("/settings", authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      isEnabled,
      affectedTiers,
      message,
      title,
      estimatedEndTime,
      allowAdminAccess,
    } = req.body;

    const settings = await MaintenanceSettings.getSettings();

    // Update fields
    if (typeof isEnabled === "boolean") {
      settings.isEnabled = isEnabled;
      if (isEnabled) {
        settings.enabledBy = req.user.sub;
        settings.enabledAt = new Date();
      }
    }

    if (affectedTiers && Array.isArray(affectedTiers)) {
      // Validate tiers
      const validTiers = ["all", "free", "silver", "gold"];
      const filteredTiers = affectedTiers.filter((t) =>
        validTiers.includes(t.toLowerCase()),
      );
      settings.affectedTiers =
        filteredTiers.length > 0 ? filteredTiers : ["all"];
    }

    if (message !== undefined) settings.message = message;
    if (title !== undefined) settings.title = title;
    if (estimatedEndTime !== undefined) {
      settings.estimatedEndTime = estimatedEndTime
        ? new Date(estimatedEndTime)
        : null;
    }
    if (typeof allowAdminAccess === "boolean")
      settings.allowAdminAccess = allowAdminAccess;

    await settings.save();

    // Return populated settings
    const populatedSettings = await MaintenanceSettings.findById(
      settings._id,
    ).populate("enabledBy", "name email");

    res.json({
      message: isEnabled
        ? "Maintenance mode enabled"
        : "Maintenance mode disabled",
      settings: populatedSettings,
    });
  } catch (error) {
    console.error("Error updating maintenance settings:", error);
    res.status(500).json({ message: "Error updating maintenance settings" });
  }
});

// Quick toggle endpoint for convenience
router.post("/toggle", authenticateToken, isAdmin, async (req, res) => {
  try {
    const settings = await MaintenanceSettings.getSettings();

    settings.isEnabled = !settings.isEnabled;
    if (settings.isEnabled) {
      settings.enabledBy = req.user.sub;
      settings.enabledAt = new Date();
    }

    await settings.save();

    res.json({
      message: settings.isEnabled
        ? "Maintenance mode enabled"
        : "Maintenance mode disabled",
      isEnabled: settings.isEnabled,
    });
  } catch (error) {
    console.error("Error toggling maintenance mode:", error);
    res.status(500).json({ message: "Error toggling maintenance mode" });
  }
});

// Get count of users affected by current maintenance settings
router.get("/affected-count", authenticateToken, isAdmin, async (req, res) => {
  try {
    const settings = await MaintenanceSettings.getSettings();

    let filter = { role: { $nin: ["admin", "superadmin"] } };

    if (!settings.affectedTiers.includes("all")) {
      // Map tier names to plan values
      const planFilter = settings.affectedTiers.map((tier) => {
        if (tier === "free") return { $in: ["free", "none", null] };
        return tier;
      });

      if (settings.affectedTiers.includes("free")) {
        filter.$or = [
          { plan: { $in: ["free", "none", null] } },
          ...settings.affectedTiers
            .filter((t) => t !== "free")
            .map((t) => ({ plan: t })),
        ];
      } else {
        filter.plan = { $in: settings.affectedTiers };
      }
    }

    const count = await User.countDocuments(filter);

    res.json({ affectedCount: count });
  } catch (error) {
    console.error("Error counting affected users:", error);
    res.status(500).json({ message: "Error counting affected users" });
  }
});

module.exports = router;
