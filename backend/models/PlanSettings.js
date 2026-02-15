const mongoose = require("mongoose");

const PlanSettingsSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true,
    enum: ["silver", "gold"],
  },
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  originalPrice: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
  offerStartDate: { type: Date, default: null },
  offerEndDate: { type: Date, default: null },
  offerEnabled: { type: Boolean, default: false },
  offerLabel: { type: String, default: "" },
  features: [{ type: String }],
  billingCycle: {
    type: String,
    enum: ["monthly", "yearly"],
    default: "yearly",
  },
  isActive: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

PlanSettingsSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model("PlanSettings", PlanSettingsSchema);
