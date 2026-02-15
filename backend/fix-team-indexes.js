/**
 * Fix Team Member Indexes
 *
 * This script removes any old unique indexes on just the email field
 * and ensures the correct compound index (owner + email) is in place.
 *
 * This allows different accounts to add team members with the same email.
 *
 * Run with: node fix-team-indexes.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function fixTeamIndexes() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("❌ MONGODB_URI not found in environment variables");
      process.exit(1);
    }

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("teammembers");

    // Check if collection exists
    const collections = await db
      .listCollections({ name: "teammembers" })
      .toArray();
    if (collections.length === 0) {
      console.log(
        '⏭️  Collection "teammembers" does not exist, nothing to fix.',
      );
      await mongoose.disconnect();
      process.exit(0);
    }

    // Get existing indexes
    console.log("\n📋 Current indexes on teammembers collection:");
    const indexes = await collection.indexes();
    indexes.forEach((idx, i) => {
      console.log(
        `  ${i + 1}. ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (UNIQUE)" : ""}`,
      );
    });

    // Drop any unique index on just email field
    for (const idx of indexes) {
      // Check if it's a unique index on just email (not compound with owner)
      if (idx.unique && idx.key.email && !idx.key.owner) {
        console.log(`\n🗑️  Dropping old unique index on email: ${idx.name}`);
        try {
          await collection.dropIndex(idx.name);
          console.log(`✅ Dropped index: ${idx.name}`);
        } catch (err) {
          console.error(`❌ Failed to drop index ${idx.name}:`, err.message);
        }
      }
    }

    // Ensure compound index exists (owner + email)
    console.log("\n🔨 Creating compound index on (owner, email)...");
    try {
      await collection.createIndex(
        { owner: 1, email: 1 },
        { background: true, name: "owner_email_compound" },
      );
      console.log("✅ Compound index (owner + email) created/verified");
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log(
          "ℹ️  Index already exists with different options, this is OK",
        );
      } else {
        console.error("❌ Error creating compound index:", err.message);
      }
    }

    // Ensure index on just owner field
    console.log("\n🔨 Creating index on owner...");
    try {
      await collection.createIndex(
        { owner: 1 },
        { background: true, name: "owner_index" },
      );
      console.log("✅ Owner index created/verified");
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log("ℹ️  Index already exists");
      } else {
        console.error("❌ Error creating owner index:", err.message);
      }
    }

    // Show final indexes
    console.log("\n📋 Final indexes on teammembers collection:");
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((idx, i) => {
      console.log(
        `  ${i + 1}. ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (UNIQUE)" : ""}`,
      );
    });

    console.log("\n✅ Team indexes fixed successfully!");
    console.log(
      "\nℹ️  Now different accounts can add team members with the same email.",
    );

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing indexes:", error);
    process.exit(1);
  }
}

fixTeamIndexes();
