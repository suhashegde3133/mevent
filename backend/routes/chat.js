const express = require("express");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Apply authentication to all chat routes
router.use(authenticateToken);

function col() {
  return mongoose.connection.db.collection("chat");
}

function buildQuery(id, owner) {
  let query;
  try {
    query = { _id: mongoose.Types.ObjectId(id), owner };
  } catch (e) {
    const numId = parseInt(id);
    if (!isNaN(numId)) {
      query = {
        $or: [
          { id: numId, owner },
          { id: id, owner },
        ],
      };
    } else {
      query = { id: id, owner };
    }
  }
  return query;
}

// Conversations and messages are stored in the `chat` collection as documents.
router.get("/conversations", async (req, res) => {
  try {
    const docs = await col()
      .find({ owner: req.user.sub })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const body = req.body || {};
    body.owner = req.user.sub;
    body.createdAt = new Date();
    const result = await col().insertOne(body);
    res.status(201).json({ _id: result.insertedId, ...body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = buildQuery(id, req.user.sub);
    const doc = await col().findOne(query);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Message Routes ============

/**
 * Get all messages for a conversation
 */
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const query = buildQuery(id, req.user.sub);
    const doc = await col().findOne(query);
    if (!doc)
      return res.status(404).json({ message: "Conversation not found" });
    res.json(doc.messages || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a new message in a conversation
 */
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const messageData = req.body || {};
    messageData.createdAt = new Date();
    const query = buildQuery(id, req.user.sub);
    const update = {
      $push: { messages: messageData },
      $set: { updatedAt: new Date() },
    };
    const result = await col().updateOne(query, update);
    if (result.matchedCount === 0)
      return res.status(404).json({ message: "Conversation not found" });
    res.status(201).json(messageData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update a message in a conversation
 */
router.put(
  "/conversations/:conversationId/messages/:messageId",
  async (req, res) => {
    try {
      const { conversationId, messageId } = req.params;
      const updates = req.body || {};
      const query = buildQuery(conversationId, req.user.sub);
      const doc = await col().findOne(query);
      if (!doc)
        return res.status(404).json({ message: "Conversation not found" });

      const msgs = Array.isArray(doc.messages) ? doc.messages : [];
      let found = false;
      const normalizedIdNum = Number(messageId);

      const updatedMsgs = msgs.map((m) => {
        // match by _id (string), id (string/number), or numeric id
        if (
          (m && m._id && m._id.toString() === messageId) ||
          (m && (m.id === messageId || m.id === normalizedIdNum))
        ) {
          found = true;
          return { ...m, ...updates, updatedAt: new Date() };
        }
        return m;
      });

      if (!found) return res.status(404).json({ message: "Message not found" });

      await col().updateOne(query, {
        $set: { messages: updatedMsgs, updatedAt: new Date() },
      });
      res.json({ message: "Message updated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * Delete a message from a conversation
 */
router.delete(
  "/conversations/:conversationId/messages/:messageId",
  async (req, res) => {
    try {
      const { conversationId, messageId } = req.params;
      const query = buildQuery(conversationId, req.user.sub);
      const doc = await col().findOne(query);
      if (!doc)
        return res.status(404).json({ message: "Conversation not found" });

      const msgs = Array.isArray(doc.messages) ? doc.messages : [];
      const normalizedIdNum = Number(messageId);
      const filtered = msgs.filter((m) => {
        if (!m) return true;
        const match =
          (m._id && m._id.toString() === messageId) ||
          m.id === messageId ||
          m.id === normalizedIdNum;
        return !match;
      });

      // If length unchanged, no message was removed
      if (filtered.length === msgs.length) {
        return res.status(404).json({ message: "Message not found" });
      }

      await col().updateOne(query, {
        $set: { messages: filtered, updatedAt: new Date() },
      });
      res.json({ message: "Message deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * Delete all messages in a conversation
 */
router.delete("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const query = buildQuery(id, req.user.sub);
    const update = {
      $set: { messages: [], updatedAt: new Date() },
    };
    const result = await col().updateOne(query, update);
    if (result.matchedCount === 0)
      return res.status(404).json({ message: "Conversation not found" });
    res.json({ message: "All messages deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update a conversation
 */
router.put("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    updates.owner = req.user.sub;
    updates.updatedAt = new Date();
    const query = buildQuery(id, req.user.sub);
    const result = await col().updateOne(query, { $set: updates });
    if (result.matchedCount === 0)
      return res.status(404).json({ message: "Conversation not found" });
    res.json({ message: "Conversation updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete a conversation
 */
router.delete("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = buildQuery(id, req.user.sub);
    const result = await col().deleteOne(query);
    if (result.deletedCount === 0)
      return res.status(404).json({ message: "Conversation not found" });
    res.json({ message: "Conversation deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Reset all chats (for 24-hour auto-reset feature)
 */
router.post("/reset", async (req, res) => {
  try {
    await col().deleteMany({ owner: req.user.sub });
    res.json({ message: "All chats reset" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
