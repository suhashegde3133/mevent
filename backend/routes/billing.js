const express = require("express");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const UserNotification = require("../models/UserNotification");
const router = express.Router();

// Apply authentication to all billing routes
router.use(authenticateToken);

function col() {
  return mongoose.connection.db.collection("billing");
}

router.get("/", async (req, res) => {
  try {
    const docs = await col()
      .find({ owner: req.user.sub })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    body.owner = req.user.sub;
    body.createdAt = new Date();
    const result = await col().insertOne(body);

    // Create notification for new invoice
    try {
      await UserNotification.create({
        user: req.user.sub,
        type: "payment",
        referenceId: result.insertedId,
        referenceModel: "Payment",
        title: "New Invoice Created",
        message: `Invoice "${body.id || "New Invoice"}" has been created for ${body.clientName || "client"}.`,
        icon: "payment",
        actionUrl: `/billing?id=${body.id}`,
        actionLabel: "View Invoice",
      });
    } catch (notificationError) {
      console.error(
        "Failed to create invoice notification:",
        notificationError,
      );
    }

    res.status(201).json({ _id: result.insertedId, ...body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: Types.ObjectId(id), owner: req.user.sub };
    } catch (e) {
      query = { id, owner: req.user.sub };
    }
    const doc = await col().findOne(query);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    body.owner = req.user.sub;
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: Types.ObjectId(id), owner: req.user.sub };
    } catch (e) {
      query = { id, owner: req.user.sub };
    }
    const result = await col().findOneAndUpdate(
      query,
      { $set: body },
      { upsert: true, returnDocument: "after" },
    );
    res.json(result.value || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: Types.ObjectId(id), owner: req.user.sub };
    } catch (e) {
      query = { id, owner: req.user.sub };
    }
    await col().deleteOne(query);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
