/**
 * Migration Script: Add Owner Field to Existing Data
 *
 * This script adds the 'owner' field to all existing documents that don't have it.
 * You can assign all existing data to a specific user.
 *
 * Usage:
 * 1. Set the DEFAULT_OWNER constant to the user ID (from JWT sub field)
 * 2. Run: node migrate-add-owner.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mivent:1234567890@cluster0.y3o7p0b.mongodb.net/photoflow";

// IMPORTANT: Set this to the user ID you want to assign existing data to
// This should be the 'sub' field from the JWT token of an existing user
const DEFAULT_OWNER = "YOUR_USER_ID_HERE"; // Replace with actual user ID

const collections = [
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

async function migrate() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    if (DEFAULT_OWNER === "YOUR_USER_ID_HERE") {
      console.error(
        "\n❌ ERROR: Please set DEFAULT_OWNER in the script first!"
      );
      console.error("   Find your user ID from the 'users' collection");
      console.error("   Or create a new user and use their ID\n");
      process.exit(1);
    }

    console.log(`\nMigrating data to owner: ${DEFAULT_OWNER}\n`);

    for (const collectionName of collections) {
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

        // Find documents without owner field
        const docsWithoutOwner = await collection.countDocuments({
          owner: { $exists: false },
        });

        if (docsWithoutOwner === 0) {
          console.log(
            `✅ Collection '${collectionName}': All documents already have owner`
          );
          continue;
        }

        // Update documents without owner
        const result = await collection.updateMany(
          { owner: { $exists: false } },
          { $set: { owner: DEFAULT_OWNER } }
        );

        console.log(
          `✅ Collection '${collectionName}': Updated ${result.modifiedCount} documents`
        );
      } catch (err) {
        console.error(
          `❌ Error processing collection '${collectionName}':`,
          err.message
        );
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Test the application with the migrated data");
    console.log("2. Create additional users and test data isolation");
    console.log("3. Delete this migration script once you're satisfied\n");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run migration
migrate();
