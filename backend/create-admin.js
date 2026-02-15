/**
 * Utility Script: Create or Update Admin User
 *
 * This script allows you to create a new admin user or promote an existing user.
 *
 * 
 * admin@mivent.com  // Admin
 * admin123
 * 
 * vivekbhat0120@gmail.com  // Super Admin
 * SuperAdmin@123
 * 
 * 
 * Usage:
 * node create-admin.js <email> <password> <name>
 */



require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mivent:1234567890@cluster0.y3o7p0b.mongodb.net/photoflow";

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || "Super Admin";

if (!email || !password) {
  console.error("❌ Please provide email and password");
  console.log("   Usage: node create-admin.js <email> <password> [name]");
  process.exit(1);
}

async function createAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(
        `User ${email} already exists. Promoting to admin and updating password...`,
      );
      const hashed = await bcrypt.hash(password, 10);
      existingUser.role = "admin";
      existingUser.password = hashed;
      existingUser.status = "active";
      await existingUser.save();
      console.log(`✅ User ${email} is now an Admin.`);
    } else {
      console.log(`Creating new admin user: ${email}...`);
      const hashed = await bcrypt.hash(password, 10);
      const newUser = new User({
        email,
        password: hashed,
        name,
        role: "admin",
        status: "active",
        plan: "gold",
      });
      await newUser.save();
      console.log(`✅ Admin user ${email} created successfully.`);
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

createAdmin();
