const express = require("express");
const Policy = require("../models/Policy");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Apply authentication to all policy routes
router.use(authenticateToken);

router.get("/", async (req, res) => {
  try {
    const docs = await Policy.find({ owner: req.user.sub }).sort({
      createdAt: -1,
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    body.owner = req.user.sub;
    const policy = new Policy(body);
    const saved = await policy.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let doc = await Policy.findOne({ _id: id, owner: req.user.sub });
    if (!doc) {
      doc = await Policy.findOne({ id: parseInt(id), owner: req.user.sub });
    }
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
    let updated = await Policy.findOneAndUpdate(
      { _id: id, owner: req.user.sub },
      body,
      { new: true }
    );
    if (!updated) {
      // Try updating by local id
      updated = await Policy.findOneAndUpdate(
        { id: parseInt(id), owner: req.user.sub },
        body,
        {
          new: true,
          upsert: true,
        }
      );
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = await Policy.findOneAndDelete({
      _id: id,
      owner: req.user.sub,
    });
    if (!deleted) {
      // Try deleting by local id
      deleted = await Policy.findOneAndDelete({
        id: parseInt(id),
        owner: req.user.sub,
      });
    }
    if (!deleted) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
