// Express-based backend scaffold to match frontend API expectations
// Load environment variables from .env when present
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");

// Utilities
const logger = require("./utils/logger");
const { errorHandler, notFoundHandler } = require("./utils/errorHandler");

const authRoutes = require("./routes/auth");
const projectsRoutes = require("./routes/projects");
const teamRoutes = require("./routes/team");
const quotationsRoutes = require("./routes/quotations");
const eventsRoutes = require("./routes/events");
const billingRoutes = require("./routes/billing");
const servicesRoutes = require("./routes/services");
const policyRoutes = require("./routes/policy");
const dashboardRoutes = require("./routes/dashboard");
const settingsRoutes = require("./routes/settings");
const chatRoutes = require("./routes/chat");
const uploadsRoutes = require("./routes/uploads");
const paymentRoutes = require("./routes/payments");
const adminRoutes = require("./routes/admin");
const securityRoutes = require("./routes/security");
const notesRoutes = require("./routes/notes");
const plansRoutes = require("./routes/plans");
const announcementsRoutes = require("./routes/announcements");
const notificationsRoutes = require("./routes/notifications");
const maintenanceRoutes = require("./routes/maintenance");

const port = process.env.PORT || 5000;

// MongoDB connection URI. You can override with the environment variable MONGODB_URI.
// Default: connect to a local MongoDB instance and use the `photoflow` database.
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mivent:1234567890@cluster0.y3o7p0b.mongodb.net/photoflow";

const app = express();

// Middleware
// CORS configuration - allow localhost in development
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? [
          process.env.FRONTEND_URL || "https://your-frontend-domain.com",
          "https://your-frontend-domain.netlify.app",
          "https://your-frontend-domain.vercel.app",
        ]
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
        ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-rtb-fingerprint-id"],
  exposedHeaders: ["x-rtb-fingerprint-id"],
};

// Add COOP header to allow Firebase popups (fixes window.closed warning)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

app.use(cors(corsOptions));

// Security: Disable x-powered-by header
app.disable("x-powered-by");

// Increase body size limit to handle base64 images (default is 100kb)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Photoflow demo backend (express)" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/quotations", quotationsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/policy", policyRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// Static uploads folder for demo (optional)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 404 handler for API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return notFoundHandler(req, res);
  }
  return res.status(404).send("Not Found");
});

// Global error handler
app.use(errorHandler);

// Connect to MongoDB first, then start the Express server.
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    logger.info(`Connected to MongoDB`, null, "MongoDB");
    // Load/compile models so they are available to controllers
    try {
      // eslint-disable-next-line global-require
      require("./models/User");
      // eslint-disable-next-line global-require
      require("./models/Policy");
      // eslint-disable-next-line global-require
      require("./models/TeamMember");
    } catch (e) {
      logger.warn("Could not load models", { error: e && e.message }, "Server");
    }
    app.listen(port, () => {
      logger.info(
        `Server listening on http://localhost:${port}`,
        null,
        "Server",
      );
    });
  })
  .catch((err) => {
    logger.error("Failed to connect to MongoDB", err, "MongoDB");
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down: disconnecting from MongoDB...", null, "Server");
  try {
    await mongoose.disconnect();
  } catch (e) {
    logger.error("Error disconnecting mongoose", e, "Server");
  }
  process.exit(0);
});
