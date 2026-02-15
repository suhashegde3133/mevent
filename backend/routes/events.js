const express = require("express");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const UserNotification = require("../models/UserNotification");
const router = express.Router();

// Apply authentication to all event routes
router.use(authenticateToken);

function col() {
  return mongoose.connection.db.collection("events");
}

router.get("/", async (req, res) => {
  try {
    const docs = await col()
      .find({ owner: req.user.sub })
      .sort({ startDate: -1, createdAt: -1 })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    // Prevent client from setting immutable Mongo `_id` field
    if (body && body._id) delete body._id;
    body.owner = req.user.sub;
    body.createdAt = new Date();
    const result = await col().insertOne(body);

    // Create notification for new event
    try {
      await UserNotification.create({
        user: req.user.sub,
        type: "event",
        referenceId: result.insertedId,
        referenceModel: "Event",
        title: "New Event Created",
        message: `Event "${body.id || body.quotationId || "New Event"}" has been created successfully.`,
        icon: "event",
        actionUrl: `/events?id=${body.id || body.quotationId}`,
        actionLabel: "View Event",
      });
    } catch (notificationError) {
      console.error("Failed to create event notification:", notificationError);
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
    // Strip out any client-supplied Mongo `_id` to avoid immutable field errors
    if (body && body._id) delete body._id;
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
