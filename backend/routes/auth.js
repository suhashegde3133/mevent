const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const User = require("../models/User");

router.post("/login", controller.login);
router.post("/register", controller.register);
router.post("/logout", controller.logout);
router.post("/google", controller.googleAuth);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.get("/verify-reset-token/:token", controller.verifyResetToken);

// Get current user data
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub)
      .select("-password -passwordResetToken -passwordResetExpires")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user data", error: error.message });
  }
});

module.exports = router;
