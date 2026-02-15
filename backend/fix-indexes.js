/**
 * Fix Indexes Script
 *
 * This script drops the problematic unique index on 'id' field in the 'teammembers' collection
 * that's causing E11000 duplicate key errors.
 *
 * Usage: node fix-indexes.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mivent:1234567890@cluster0.y3o7p0b.mongodb.net/photoflow";

async function fixIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const collection = db.collection("teammembers");

    // List all indexes
    console.log("Existing indexes on 'teammembers' collection:");
    const indexes = await collection.listIndexes().toArray();
    console.log(indexes);
    console.log("\n");

    // Drop the problematic 'id' index if it exists
    try {
      console.log("Attempting to drop 'id_1' index...");
      await collection.dropIndex("id_1");
      console.log("✅ Successfully dropped 'id_1' index\n");
    } catch (err) {
      if (err.message.includes("index not found")) {
        console.log("ℹ️  'id_1' index does not exist, skipping...\n");
      } else {
        throw err;
      }
    }

    // List indexes again to confirm
    console.log("Indexes after cleanup:");
    const newIndexes = await collection.listIndexes().toArray();
    console.log(newIndexes);

    console.log("\n✅ Index cleanup complete!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error fixing indexes:", err);
    process.exit(1);
  }
}

fixIndexes();
