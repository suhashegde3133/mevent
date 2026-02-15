/**
 * Utility Script: Create or Update Super Admin User
 *
 * This script creates the default super admin user with the specified credentials.
 * Default super admin: vivekbhat0120@gmail.com
 *
 * Usage:
 * node create-superadmin.js [email] [password]
 *
 * If no arguments provided, creates the default super admin.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mivent:1234567890@cluster0.y3o7p0b.mongodb.net/photoflow";

// Default super admin credentials
const DEFAULT_EMAIL = "vivekbhat0120@gmail.com";
const DEFAULT_PASSWORD = "SuperAdmin@123";
const DEFAULT_NAME = "Super Admin";

const email = process.argv[2] || DEFAULT_EMAIL;
const password = process.argv[3] || DEFAULT_PASSWORD;
const name = process.argv[4] || DEFAULT_NAME;

async function createSuperAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(
        `User ${email} already exists. Promoting to super admin and updating password...`,
      );
      const hashed = await bcrypt.hash(password, 10);
      existingUser.role = "superadmin";
      existingUser.password = hashed;
      existingUser.status = "active";
      existingUser.plan = "gold";
      existingUser.planActivatedAt = new Date();
      await existingUser.save();
      console.log(`✅ User ${email} is now a Super Admin.`);
    } else {
      console.log(`Creating new super admin user: ${email}...`);
      const hashed = await bcrypt.hash(password, 10);
      const newUser = new User({
        email,
        password: hashed,
        name,
        role: "superadmin",
        status: "active",
        plan: "gold",
        planActivatedAt: new Date(),
      });
      await newUser.save();
      console.log(`✅ Super Admin user ${email} created successfully.`);
    }

    console.log("\n========================================");
    console.log("Super Admin Credentials:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

createSuperAdmin();
