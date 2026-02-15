const mongoose = require("mongoose");

const PolicySchema = new mongoose.Schema({
  id: { type: Number }, // for local ids
  content: { type: String, required: true },
  group: { type: String, default: "Uncategorized" },
  owner: { type: String, required: true }, // User ID from JWT
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Policy", PolicySchema);
