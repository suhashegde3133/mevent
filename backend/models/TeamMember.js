const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const PaymentSchema = new mongoose.Schema({
  id: { type: String, default: () => randomUUID() },
  eventId: { type: String, required: true },
  eventName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pending", "partial", "paid"],
    default: "pending",
  },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const TeamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  phone: { type: String, default: "" },
  email: { type: String, required: true },
  avatar: { type: String, default: null },
  payments: [PaymentSchema],
  owner: { type: String, required: true }, // User ID from JWT (inviter's ID)
  ownerEmail: { type: String, default: "" }, // Inviter's email
  ownerName: { type: String, default: "" }, // Inviter's name
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field before saving
TeamMemberSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("TeamMember", TeamMemberSchema);
