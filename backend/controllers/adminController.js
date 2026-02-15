const User = require("../models/User");
const Payment = require("../models/Payment");
const PlanSettings = require("../models/PlanSettings");

// Protected super admin email - cannot be demoted
const PROTECTED_SUPERADMIN_EMAIL = "vivekbhat0120@gmail.com";

exports.getMetrics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const inactiveUsers = await User.countDocuments({ status: "inactive" });

    // Plan counts
    const silverUsers = await User.countDocuments({ plan: "silver" });
    const goldUsers = await User.countDocuments({ plan: "gold" });
    const freeUsers = await User.countDocuments({
      plan: { $in: ["free", "none", null] },
    });

    const revenueData = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // This month's revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenueData = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyRevenue =
      monthlyRevenueData.length > 0 ? monthlyRevenueData[0].total : 0;

    // Last 30 days growth
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // New users this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    // Recent signups (last 5)
    const recentSignups = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Recent payments (last 5)
    const recentPayments = await Payment.find({ status: "success" })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      silverUsers,
      goldUsers,
      freeUsers,
      totalRevenue,
      monthlyRevenue,
      newUsersThisWeek,
      growthTrend: growth,
      recentSignups,
      recentPayments,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    res
      .status(500)
      .json({ message: "Error fetching metrics", error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      plan = "",
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter query
    const filter = { role: { $nin: ["admin", "superadmin"] } }; // Exclude admins from user list

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (plan) {
      if (plan === "free") {
        filter.plan = { $in: ["free", "none", null] };
      } else {
        filter.plan = plan;
      }
    }

    const users = await User.find(filter)
      .select("-password -passwordResetToken -passwordResetExpires")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!userId || !status) {
      return res
        .status(400)
        .json({ message: "userId and status are required" });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true },
    ).select("-password -passwordResetToken -passwordResetExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: `User ${status === "active" ? "activated" : "deactivated"} successfully`,
      user,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res
      .status(500)
      .json({ message: "Error updating user status", error: error.message });
  }
};

exports.updateUserPlan = async (req, res) => {
  try {
    const { userId, plan } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({ message: "userId and plan are required" });
    }

    if (!["free", "silver", "gold"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan value" });
    }

    const updateData = { plan };

    // Set plan activation date when upgrading to a paid plan
    if (plan === "silver" || plan === "gold") {
      updateData.planActivatedAt = new Date();
    } else if (plan === "free") {
      // Clear activation date when downgrading to free
      updateData.planActivatedAt = null;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password -passwordResetToken -passwordResetExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: `User plan updated to ${plan}`, user });
  } catch (error) {
    console.error("Error updating user plan:", error);
    res
      .status(500)
      .json({ message: "Error updating user plan", error: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { period = "30" } = req.query; // days
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Plan distribution
    const planDistribution = await User.aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]);

    // Status distribution
    const statusDistribution = await User.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // User growth over time
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const revenueByMonth = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue by plan
    const revenueByPlan = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: "$plan",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Daily revenue for the period
    const dailyRevenue = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Conversion rate (free to paid)
    const totalFreeUsers = await User.countDocuments({
      plan: { $in: ["free", "none", null] },
    });
    const totalPaidUsers = await User.countDocuments({
      plan: { $in: ["silver", "gold"] },
    });
    const conversionRate =
      totalFreeUsers + totalPaidUsers > 0
        ? ((totalPaidUsers / (totalFreeUsers + totalPaidUsers)) * 100).toFixed(
            2,
          )
        : 0;

    // Average revenue per user (ARPU)
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const arpu =
      totalPaidUsers > 0 && totalRevenue.length > 0
        ? (totalRevenue[0].total / totalPaidUsers).toFixed(2)
        : 0;

    res.json({
      planDistribution,
      statusDistribution,
      userGrowth,
      revenueByMonth,
      revenueByPlan,
      dailyRevenue,
      conversionRate: parseFloat(conversionRate),
      arpu: parseFloat(arpu),
      totalPaidUsers,
      totalFreeUsers,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res
      .status(500)
      .json({ message: "Error fetching analytics", error: error.message });
  }
};

// Get user details by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select("-password -passwordResetToken -passwordResetExpires")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's payment history
    const payments = await Payment.find({ userId: id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ user, payments });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
};

// Delete user (soft delete by deactivating)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deactivated successfully", user });
  } catch (error) {
    console.error("Error deleting user:", error);
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
};

// Export data (for reports)
exports.exportData = async (req, res) => {
  try {
    const { type = "users" } = req.query;

    if (type === "users") {
      const users = await User.find({ role: { $nin: ["admin", "superadmin"] } })
        .select("-password -passwordResetToken -passwordResetExpires")
        .sort({ createdAt: -1 })
        .lean();
      res.json({ data: users, type: "users" });
    } else if (type === "payments") {
      const payments = await Payment.find({ status: "success" })
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .lean();
      res.json({ data: payments, type: "payments" });
    } else if (type === "analytics") {
      const planDistribution = await User.aggregate([
        { $group: { _id: "$plan", count: { $sum: 1 } } },
      ]);
      const revenueByMonth = await Payment.aggregate([
        { $match: { status: "success" } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      res.json({
        data: { planDistribution, revenueByMonth },
        type: "analytics",
      });
    } else {
      res.status(400).json({ message: "Invalid export type" });
    }
  } catch (error) {
    console.error("Error exporting data:", error);
    res
      .status(500)
      .json({ message: "Error exporting data", error: error.message });
  }
};

// Get all admins (for super admin)
exports.getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } })
      .select("-password -passwordResetToken -passwordResetExpires")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res
      .status(500)
      .json({ message: "Error fetching admins", error: error.message });
  }
};

// Promote user to admin (super admin only)
exports.promoteToAdmin = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ message: "userId and role are required" });
    }

    if (!["admin", "photographer"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Invalid role value. Use 'admin' or 'photographer'" });
    }

    // Prevent demoting self
    if (userId === req.user.sub && role === "photographer") {
      return res.status(400).json({ message: "Cannot demote yourself" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Cannot modify super admin role
    if (user.role === "superadmin") {
      return res.status(403).json({
        message: "Cannot modify super admin role. Use super admin management.",
      });
    }

    // Protect the default super admin from any role changes
    if (user.email === PROTECTED_SUPERADMIN_EMAIL) {
      return res
        .status(403)
        .json({ message: "Cannot modify protected super admin" });
    }

    user.role = role;
    await user.save();

    res.json({
      message: `User ${role === "admin" ? "promoted to admin" : "demoted to photographer"} successfully`,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res
      .status(500)
      .json({ message: "Error updating user role", error: error.message });
  }
};

// Promote user to super admin (super admin only)
exports.promoteToSuperAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = "superadmin";
    await user.save();

    res.json({
      message: "User promoted to super admin successfully",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("Error promoting to super admin:", error);
    res.status(500).json({
      message: "Error promoting to super admin",
      error: error.message,
    });
  }
};

// Demote super admin (super admin only - cannot demote self)
exports.demoteSuperAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Prevent demoting self
    if (userId === req.user.sub) {
      return res.status(400).json({ message: "Cannot demote yourself" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "superadmin") {
      return res.status(400).json({ message: "User is not a super admin" });
    }

    // Protect the default super admin from being demoted
    if (user.email === PROTECTED_SUPERADMIN_EMAIL) {
      return res
        .status(403)
        .json({ message: "Cannot demote the protected super admin" });
    }

    user.role = "admin";
    await user.save();

    res.json({
      message: "Super admin demoted to admin successfully",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("Error demoting super admin:", error);
    res
      .status(500)
      .json({ message: "Error demoting super admin", error: error.message });
  }
};

// Get plan settings
exports.getPlanSettings = async (req, res) => {
  try {
    let plans = await PlanSettings.find().lean();

    // If no plans exist, create defaults
    if (plans.length === 0) {
      const defaultPlans = [
        {
          planId: "silver",
          name: "Silver",
          price: 999,
          originalPrice: 999,
          discountPercentage: 0,
          offerEnabled: false,
          offerLabel: "",
          features: [
            "All Free features",
            "10GB storage",
            "Priority support",
            "Advanced analytics",
          ],
          billingCycle: "yearly",
          isActive: true,
        },
        {
          planId: "gold",
          name: "Gold",
          price: 1999,
          originalPrice: 1999,
          discountPercentage: 0,
          offerEnabled: false,
          offerLabel: "",
          features: [
            "All Silver features",
            "Unlimited storage",
            "24/7 support",
            "Custom branding",
            "API access",
          ],
          billingCycle: "yearly",
          isActive: true,
        },
      ];

      await PlanSettings.insertMany(defaultPlans);
      plans = await PlanSettings.find().lean();
    }

    res.json({ plans });
  } catch (error) {
    console.error("Error fetching plan settings:", error);
    res
      .status(500)
      .json({ message: "Error fetching plan settings", error: error.message });
  }
};

// Update plan settings
exports.updatePlanSettings = async (req, res) => {
  try {
    const {
      planId,
      name,
      price,
      originalPrice,
      discountPercentage,
      offerStartDate,
      offerEndDate,
      offerEnabled,
      offerLabel,
      features,
      billingCycle,
      isActive,
    } = req.body;

    if (!planId || !["silver", "gold"].includes(planId)) {
      return res
        .status(400)
        .json({ message: "Valid planId is required (silver or gold)" });
    }

    const updateData = {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(originalPrice !== undefined && { originalPrice }),
      ...(discountPercentage !== undefined && { discountPercentage }),
      ...(offerStartDate !== undefined && { offerStartDate }),
      ...(offerEndDate !== undefined && { offerEndDate }),
      ...(offerEnabled !== undefined && { offerEnabled }),
      ...(offerLabel !== undefined && { offerLabel }),
      ...(features !== undefined && { features }),
      ...(billingCycle !== undefined && { billingCycle }),
      ...(isActive !== undefined && { isActive }),
      updatedBy: req.user.sub,
      updatedAt: new Date(),
    };

    const plan = await PlanSettings.findOneAndUpdate({ planId }, updateData, {
      new: true,
      upsert: true,
    }).lean();

    res.json({
      message: "Plan settings updated successfully",
      plan,
    });
  } catch (error) {
    console.error("Error updating plan settings:", error);
    res
      .status(500)
      .json({ message: "Error updating plan settings", error: error.message });
  }
};
