const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "photoflow-demo-secret";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // Verify user still exists and is active
    const currentUser = await User.findById(user.sub).lean();
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (currentUser.status === "inactive") {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    req.user = { ...user, role: currentUser.role };
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "superadmin")
  ) {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admin only." });
  }
};

const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "superadmin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Super Admin only." });
  }
};

module.exports = {
  authenticateToken,
  isAdmin,
  isSuperAdmin,
};

module.exports = { authenticateToken, isAdmin, isSuperAdmin };
