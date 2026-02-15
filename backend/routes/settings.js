const express = require("express");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Apply authentication to all settings routes
router.use(authenticateToken);

function col() {
  return mongoose.connection.db.collection("settings");
}

// Handle specific settings routes BEFORE generic :id routes to avoid route conflicts
// PUT /api/settings/profile - Update profile settings
router.put("/profile", async (req, res) => {
  try {
    const body = req.body || {};
    const result = await col().findOneAndUpdate(
      { owner: req.user.sub },
      { $set: { profile: body }, $setOnInsert: { owner: req.user.sub } },
      { upsert: true, returnDocument: "after" },
    );
    res.json(result.value ? result.value.profile : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/company - Update company settings
router.put("/company", async (req, res) => {
  try {
    const body = req.body || {};
    const result = await col().findOneAndUpdate(
      { owner: req.user.sub },
      { $set: { company: body }, $setOnInsert: { owner: req.user.sub } },
      { upsert: true, returnDocument: "after" },
    );
    res.json(result.value ? result.value.company : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/bank - Update bank settings
router.put("/bank", async (req, res) => {
  try {
    const body = req.body || {};
    const result = await col().findOneAndUpdate(
      { owner: req.user.sub },
      { $set: { bank: body }, $setOnInsert: { owner: req.user.sub } },
      { upsert: true, returnDocument: "after" },
    );
    res.json(result.value ? result.value.bank : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/notifications - Update notifications settings
router.put("/notifications", async (req, res) => {
  try {
    const body = req.body || {};
    const result = await col().findOneAndUpdate(
      { owner: req.user.sub },
      { $set: { notifications: body }, $setOnInsert: { owner: req.user.sub } },
      { upsert: true, returnDocument: "after" },
    );
    res.json(result.value ? result.value.notifications : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings - Get settings document
// Return a single settings document to match frontend expectations
router.get("/", async (req, res) => {
  try {
    const doc = await col().findOne({ owner: req.user.sub });
    if (!doc) {
      return res.json({
        profile: {},
        company: {},
        bank: {},
        notifications: {},
      });
    }
    res.json({
      profile: doc.profile || {},
      company: doc.company || {},
      bank: doc.bank || {},
      notifications: doc.notifications || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
