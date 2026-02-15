const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");
const {
  authenticateToken,
  isAdmin,
  isSuperAdmin,
} = require("../middleware/auth");

router.use(authenticateToken);
router.use(isAdmin);

// Dashboard metrics
router.get("/metrics", controller.getMetrics);

// User management
router.get("/users", controller.getUsers);
router.get("/users/:id", controller.getUserById);
router.patch("/users/status", controller.updateUserStatus);
router.patch("/users/plan", controller.updateUserPlan);
router.delete("/users/:id", controller.deleteUser);

// Analytics
router.get("/analytics", controller.getAnalytics);

// Export
router.get("/export", controller.exportData);

// Plan Settings
router.get("/plan-settings", controller.getPlanSettings);
router.put("/plan-settings", controller.updatePlanSettings);

// Super Admin only routes
router.get("/admins", isSuperAdmin, controller.getAdmins);
router.patch("/users/role", isSuperAdmin, controller.promoteToAdmin);
router.patch(
  "/users/superadmin/promote",
  isSuperAdmin,
  controller.promoteToSuperAdmin,
);
router.patch(
  "/users/superadmin/demote",
  isSuperAdmin,
  controller.demoteSuperAdmin,
);

module.exports = router;
