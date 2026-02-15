/**
 * Server Initialization and Startup Script
 * Handles Express server startup, MongoDB connection, and graceful shutdown
 */

require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const logger = require("./utils/logger");

// Get port from environment or use default
const port = process.env.PORT || 5000;

// MongoDB connection URI
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mivent:1234567890@cluster0.y3o7p0b.mongodb.net/photoflow";

/**
 * Connect to MongoDB and start the Express server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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

    // Start Express server
    const server = app.listen(port, () => {
      logger.info(
        `Server listening on http://localhost:${port}`,
        null,
        "Server",
      );
    });

    // Graceful shutdown handler
    process.on("SIGINT", async () => {
      logger.info(
        "Shutting down: closing server and disconnecting from MongoDB...",
        null,
        "Server",
      );
      try {
        // Close the server
        server.close(async () => {
          // Disconnect from MongoDB
          await mongoose.disconnect();
          logger.info("Graceful shutdown complete", null, "Server");
          process.exit(0);
        });
      } catch (e) {
        logger.error("Error during graceful shutdown", e, "Server");
        process.exit(1);
      }
    });

    process.on("SIGTERM", async () => {
      logger.info(
        "SIGTERM received: closing server and disconnecting from MongoDB...",
        null,
        "Server",
      );
      try {
        server.close(async () => {
          await mongoose.disconnect();
          logger.info("Graceful shutdown complete", null, "Server");
          process.exit(0);
        });
      } catch (e) {
        logger.error("Error during graceful shutdown", e, "Server");
        process.exit(1);
      }
    });

    return server;
  } catch (err) {
    logger.error("Failed to start server", err, "Server");
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = startServer;
