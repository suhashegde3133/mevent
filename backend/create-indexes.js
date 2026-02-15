/**
 * Database Index Creation Script
 *
 * This script creates indexes on the 'owner' field for all collections
 * to optimize query performance for per-user data filtering.
 *
 * Usage: node create-indexes.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mivent:1234567890@cluster0.y3o7p0b.mongodb.net/photoflow";

const collectionsToIndex = [
  "policies",
  "projects",
  "events",
  "services",
  "quotations",
  "billing",
  "teammembers",
  "settings",
  "chat",
];

async function createIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB\n");

    console.log("Creating indexes on 'owner' field...\n");

    for (const collectionName of collectionsToIndex) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);

        // Check if collection exists
        const exists = await mongoose.connection.db
          .listCollections({ name: collectionName })
          .hasNext();

        if (!exists) {
          console.log(
            `⏭️  Collection '${collectionName}' does not exist, skipping...`
          );
          continue;
        }

        // Create index on owner field
        await collection.createIndex({ owner: 1 }, { background: true });
        console.log(`✅ Created index on '${collectionName}.owner'`);

        // For certain collections, create compound indexes for better performance
        if (collectionName === "events") {
          await collection.createIndex(
            { owner: 1, startDate: -1 },
            { background: true }
          );
          console.log(
            `✅ Created compound index on '${collectionName}.owner + startDate'`
          );
        }

        if (collectionName === "quotations" || collectionName === "billing") {
          await collection.createIndex(
            { owner: 1, createdAt: -1 },
            { background: true }
          );
          console.log(
            `✅ Created compound index on '${collectionName}.owner + createdAt'`
          );
        }

        if (collectionName === "chat") {
          await collection.createIndex(
            { owner: 1, updatedAt: -1 },
            { background: true }
          );
          console.log(
            `✅ Created compound index on '${collectionName}.owner + updatedAt'`
          );
        }

        if (collectionName === "teammembers") {
          await collection.createIndex(
            { owner: 1, email: 1 },
            { background: true }
          );
          console.log(
            `✅ Created compound index on '${collectionName}.owner + email'`
          );
        }
      } catch (err) {
        if (err.code === 85) {
          console.log(`ℹ️  Index already exists on '${collectionName}.owner'`);
        } else {
          console.error(
            `❌ Error creating index on '${collectionName}':`,
            err.message
          );
        }
      }
    }

    console.log("\n✅ Index creation completed!");
    console.log("\nIndexes created:");
    console.log("- Single field index: owner (on all collections)");
    console.log("- Compound index: owner + startDate (events)");
    console.log("- Compound index: owner + createdAt (quotations, billing)");
    console.log("- Compound index: owner + updatedAt (chat)");
    console.log("- Compound index: owner + email (teammembers)");

    console.log("\nBenefits:");
    console.log("✅ Faster queries when filtering by owner");
    console.log("✅ Better sorting performance");
    console.log("✅ Reduced database load");
    console.log("✅ Improved scalability\n");
  } catch (err) {
    console.error("❌ Failed to create indexes:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the script
createIndexes();
