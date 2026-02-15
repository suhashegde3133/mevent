const mongoose = require("mongoose");

const ChecklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true },
);

const NoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: { type: String, default: "" },
  content: { type: String, default: "" },
  type: {
    type: String,
    enum: ["text", "checklist"],
    default: "text",
  },
  checklist: [ChecklistItemSchema],
  color: {
    type: String,
    default: "#ffffff",
    enum: [
      "#ffffff",
      "#fff9c4",
      "#f3e5f5",
      "#e3f2fd",
      "#e8f5e9",
      "#fce4ec",
      "#fff3e0",
      "#e0f7fa",
    ],
  },
  pinned: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field before saving
NoteSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

NoteSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Index for efficient queries
NoteSchema.index({ userId: 1, archived: 1, pinned: -1, updatedAt: -1 });

module.exports = mongoose.model("Note", NoteSchema);
